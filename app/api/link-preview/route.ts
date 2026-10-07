const MAX_HTML_BYTES = 128 * 1024;
const MAX_FAVICON_BYTES = 64 * 1024;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function parsePublicUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const blockedSuffixes = [".localhost", ".local", ".internal", ".test", ".example", ".invalid", ".onion"];
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password || url.port) return null;
  if (!hostname.includes(".") || hostname === "localhost" || hostname.includes(":") || /^[\d.]+$/.test(hostname)) return null;
  if (blockedSuffixes.some((suffix) => hostname.endsWith(suffix)) || hostname.endsWith(".home.arpa")) return null;
  return url;
}

function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function decodeHtml(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value
    .replace(/&#(x[\da-f]+|\d+);?/gi, (_entity, code: string) => {
      const point = code[0].toLowerCase() === "x" ? Number.parseInt(code.slice(1), 16) : Number.parseInt(code, 10);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
    })
    .replace(/&([a-z]+);/gi, (entity, name: string) => namedEntities[name.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

function getMetaContent(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const target = key.toLowerCase();
  for (const tag of tags) {
    if ([attribute(tag, "property"), attribute(tag, "name")].some((value) => value.toLowerCase() === target)) {
      return decodeHtml(attribute(tag, "content"));
    }
  }
  return "";
}

function getFaviconUrl(html: string, pageUrl: URL) {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const link of links) {
    const relations = attribute(link, "rel").toLowerCase().split(/\s+/);
    const href = attribute(link, "href");
    if (!href || !relations.some((relation) => relation === "icon" || relation === "shortcut" || relation === "apple-touch-icon")) continue;
    try {
      const iconUrl = new URL(href, pageUrl);
      if (iconUrl.protocol === "http:" || iconUrl.protocol === "https:") return iconUrl.toString();
    } catch {
      continue;
    }
  }
  return new URL("/favicon.ico", pageUrl.origin).toString();
}

async function readHtmlPrefix(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let html = "";

  while (bytesRead < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    const remaining = MAX_HTML_BYTES - bytesRead;
    const chunk = value.subarray(0, remaining);
    bytesRead += chunk.byteLength;
    html += decoder.decode(chunk, { stream: true });
    if (bytesRead >= remaining || /<\/head\s*>/i.test(html)) {
      await reader.cancel();
      break;
    }
  }

  return html + decoder.decode();
}

async function readImageBytes(response: Response) {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_FAVICON_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function fetchFaviconDataUrl(value: string) {
  let currentUrl = parsePublicUrl(value);
  if (!currentUrl) return "";

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(currentUrl, {
      headers: { Accept: "image/*" },
      redirect: "manual",
      signal: AbortSignal.timeout(2500),
    });
    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || redirects === 3) return "";
      const nextUrl = parsePublicUrl(new URL(location, currentUrl).toString());
      if (!nextUrl) return "";
      currentUrl = nextUrl;
      continue;
    }

    if (!response.ok) return "";
    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
    if (!/^image\/(png|jpeg|gif|webp|x-icon|vnd\.microsoft\.icon|svg\+xml)$/.test(contentType)) return "";
    const bytes = await readImageBytes(response);
    return bytes?.length ? `data:${contentType};base64,${encodeBase64(bytes)}` : "";
  }

  return "";
}

export async function GET(request: Request) {
  const requestedUrl = new URL(request.url).searchParams.get("url");
  if (!requestedUrl || !parsePublicUrl(requestedUrl)) {
    return Response.json({ error: "Provide a public HTTP or HTTPS URL." }, { status: 400 });
  }

  let currentUrl = parsePublicUrl(requestedUrl)!;
  try {
    let response: Response | undefined;
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      response = await fetch(currentUrl, {
        headers: { Accept: "text/html", "User-Agent": "QuickListLinkPreview/1.0" },
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      });
      if (!REDIRECT_STATUSES.has(response.status)) break;
      const location = response.headers.get("location");
      if (!location || redirects === 3) break;
      const nextUrl = parsePublicUrl(new URL(location, currentUrl).toString());
      if (!nextUrl) return Response.json({ error: "The link redirects to an unsupported address." }, { status: 400 });
      currentUrl = nextUrl;
    }

    if (!response?.ok || !response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
      return Response.json({ title: currentUrl.hostname, site: currentUrl.hostname, favicon: new URL("/favicon.ico", currentUrl.origin).toString() });
    }

    const html = await readHtmlPrefix(response);
    const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ?? "";
    const title = getMetaContent(html, "og:title")
      || getMetaContent(html, "twitter:title")
      || decodeHtml(titleTag.replace(/<[^>]*>/g, ""))
      || currentUrl.hostname;
    const description = (getMetaContent(html, "og:description") || getMetaContent(html, "description")).slice(0, 220);
    const faviconUrl = getFaviconUrl(html, currentUrl);
    const favicon = await fetchFaviconDataUrl(faviconUrl) || faviconUrl;

    return Response.json({
      title: title.slice(0, 180),
      description,
      site: currentUrl.hostname,
      favicon,
    });
  } catch {
    return Response.json({ title: currentUrl.hostname, site: currentUrl.hostname, favicon: new URL("/favicon.ico", currentUrl.origin).toString() });
  }
}