import type { LinkPreview } from "../quick-list-model";

export function LinkPreviewCard({ preview }: { preview: LinkPreview }) {
  return (
    <a className="link-preview-card" href={preview.url} target="_blank" rel="noreferrer">
      <span className="link-preview-icon" aria-hidden="true">
        ↗
        {preview.favicon && <img alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} src={preview.favicon} />}
      </span>
      <span className="link-preview-copy">
        <strong>{preview.loading ? "Loading page title…" : preview.title}</strong>
        {preview.description && <span className="link-preview-description">{preview.description}</span>}
        <small>{preview.site}</small>
      </span>
      <span className="link-preview-open" aria-hidden="true">↗</span>
    </a>
  );
}