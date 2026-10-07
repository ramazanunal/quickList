"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ChecklistSubject = {
  id: string;
  text: string;
  done: boolean;
};

type LinkPreview = {
  url: string;
  title: string;
  description: string;
  site: string;
  favicon?: string;
  loading?: boolean;
};

type ListItem = {
  id: number;
  text: string;
  time?: string;
  subjects?: ChecklistSubject[];
  linkPreview?: LinkPreview;
};

type QuickList = {
  id: number;
  name: string;
  description?: string;
  groupId?: number | null;
  icon: string;
  color: string;
  updated: string;
  items: ListItem[];
};

type ListGroup = {
  id: number;
  name: string;
};

type ItemMenuState = {
  listId: number;
  itemId: number;
  x: number;
  y: number;
};

type ItemEditTarget = {
  listId: number;
  itemId: number;
};

const starterLists: QuickList[] = [
  {
    id: 1,
    name: "Groceries",
    icon: "🥑",
    color: "mint",
    updated: "10:42 AM",
    items: [
      { id: 1, text: "Avocados" },
      { id: 2, text: "Sourdough bread" },
      { id: 3, text: "Oat milk" },
      { id: 4, text: "Cherry tomatoes" },
      { id: 5, text: "Fresh basil" },
      { id: 6, text: "Dark chocolate" },
    ],
  },
  {
    id: 2,
    name: "Weekend plans",
    icon: "☀️",
    color: "yellow",
    updated: "Yesterday",
    items: [
      { id: 7, text: "Book the 11 am table" },
      { id: 8, text: "Pick up film from the lab" },
      { id: 9, text: "Bring the picnic blanket" },
    ],
  },
  {
    id: 3,
    name: "Home refresh",
    icon: "🪴",
    color: "pink",
    updated: "Tue",
    items: [
      { id: 10, text: "Measure the living room wall" },
      { id: 11, text: "Choose a warm white paint" },
      { id: 12, text: "Look for a big leafy plant" },
    ],
  },
  {
    id: 4,
    name: "Reading queue",
    icon: "📚",
    color: "blue",
    updated: "Mon",
    items: [
      { id: 13, text: "Tomorrow, and Tomorrow, and Tomorrow" },
      { id: 14, text: "The Creative Act" },
    ],
  },
];

const listIconOptions = ["🥑", "☀️", "🪴", "📚", "🛒", "🏠", "✈️", "🎯", "💡", "🎬", "💪", "✳️"];

function extractFirstUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s<>"']+/i)?.[0]?.replace(/[.,!?;:)\]]+$/, "");
  if (!match) return null;
  try {
    const url = new URL(match);
    return { url: url.toString(), site: url.hostname.replace(/^www\./i, "") };
  } catch {
    return null;
  }
}

function renderListIcon(icon: string) {
  return icon.startsWith("data:image/")
    ? <img className="custom-list-icon" src={icon} alt="" />
    : icon;
}

function remainingCount(list: QuickList) {
  return list.items.reduce(
    (count, item) => count + (item.subjects?.filter((subject) => !subject.done).length ?? 0),
    0,
  );
}

function LinkPreviewCard({ preview }: { preview: LinkPreview }) {
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

export default function Home() {
  const [lists, setLists] = useState(starterLists);
  const [groups, setGroups] = useState<ListGroup[]>([]);
  const [activeId, setActiveId] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [composerPreview, setComposerPreview] = useState<LinkPreview | null>(null);
  const [checklistMode, setChecklistMode] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [checklistTitle, setChecklistTitle] = useState("");
  const [checklistDraft, setChecklistDraft] = useState("");
  const [listDialogMode, setListDialogMode] = useState<"create" | "edit" | null>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupToRemove, setGroupToRemove] = useState<ListGroup | null>(null);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [listTitleDraft, setListTitleDraft] = useState("");
  const [listDescriptionDraft, setListDescriptionDraft] = useState("");
  const [listGroupDraft, setListGroupDraft] = useState<number | null>(null);
  const [listIconDraft, setListIconDraft] = useState("✳️");
  const [listIconError, setListIconError] = useState("");
  const [itemMenu, setItemMenu] = useState<ItemMenuState | null>(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [itemEditTarget, setItemEditTarget] = useState<ItemEditTarget | null>(null);
  const [itemTextDraft, setItemTextDraft] = useState("");
  const [itemSubjectsDraft, setItemSubjectsDraft] = useState("");
  const conversationBodyRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<{ timer: number; x: number; y: number } | null>(null);
  const copyFeedbackTimerRef = useRef<number | null>(null);
  const activeList = lists.find((list) => list.id === activeId) ?? lists[0];
  const activeGroup = groups.find((group) => group.id === activeList.groupId);
  const menuItem = itemMenu
    ? lists.find((list) => list.id === itemMenu.listId)?.items.find((item) => item.id === itemMenu.itemId)
    : undefined;
  const itemBeingEdited = itemEditTarget
    ? lists.find((list) => list.id === itemEditTarget.listId)?.items.find((item) => item.id === itemEditTarget.itemId)
    : undefined;
  const visibleLists = useMemo(
    () => lists.filter((list) =>
      list.name.toLowerCase().includes(search.toLowerCase())
      && (selectedGroupId === null || list.groupId === selectedGroupId)),
    [lists, search, selectedGroupId],
  );
  const remaining = remainingCount(activeList);
  const checklistSubjects = checklistDraft.split("\n").map((subject) => subject.trim()).filter(Boolean);
  const draftUrl = extractFirstUrl(draft)?.url ?? "";

  useEffect(() => {
    const conversationBody = conversationBodyRef.current;
    if (conversationBody) {
      conversationBody.scrollTop = conversationBody.scrollHeight;
    }
  }, [activeId, activeList.items.length]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!draftUrl) {
      setComposerPreview(null);
      return;
    }

    const link = extractFirstUrl(draftUrl);
    if (!link) return;
    const controller = new AbortController();
    let current = true;
    const favicon = `${new URL(link.url).origin}/favicon.ico`;
    setComposerPreview({ url: link.url, title: link.site, description: "", site: link.site, favicon, loading: true });

    fetch(`/api/link-preview?url=${encodeURIComponent(link.url)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok
        ? await response.json() as { title?: string; description?: string; site?: string; favicon?: string }
        : {})
      .then((metadata) => {
        if (!current) return;
        setComposerPreview({
          url: link.url,
          title: metadata.title?.trim() || link.site,
          description: metadata.description?.trim() || "",
          site: metadata.site?.trim() || link.site,
          favicon: metadata.favicon || favicon,
        });
      })
      .catch(() => {
        if (current) setComposerPreview({ url: link.url, title: link.site, description: "", site: link.site, favicon });
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [draftUrl]);

  function toggleSubject(itemId: number, subjectId: string) {
    setLists((current) =>
      current.map((list) =>
        list.id === activeId
          ? {
              ...list,
              items: list.items.map((item) => item.id === itemId
                ? {
                    ...item,
                    subjects: item.subjects?.map((subject) => subject.id === subjectId
                      ? { ...subject, done: !subject.done }
                      : subject),
                  }
                : item),
            }
          : list,
      ),
    );
  }

  async function loadLinkPreview(listId: number, itemId: number, url: string, site: string) {
    const fallbackFavicon = `${new URL(url).origin}/favicon.ico`;
    let preview: LinkPreview = { url, title: site, description: "", site, favicon: fallbackFavicon };
    try {
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, { cache: "no-store" });
      if (response.ok) {
        const metadata = await response.json() as { title?: string; description?: string; site?: string; favicon?: string };
        preview = {
          url,
          title: metadata.title?.trim() || site,
          description: metadata.description?.trim() || "",
          site: metadata.site?.trim() || site,
          favicon: metadata.favicon || fallbackFavicon,
        };
      }
    } catch {
      preview = { url, title: site, description: "", site, favicon: fallbackFavicon };
    }

    setLists((current) => current.map((list) => list.id === listId
      ? {
          ...list,
          items: list.items.map((item) => item.id === itemId ? { ...item, linkPreview: preview } : item),
        }
      : list));
    requestAnimationFrame(() => {
      const conversationBody = conversationBodyRef.current;
      if (listId === activeId && conversationBody) conversationBody.scrollTop = conversationBody.scrollHeight;
    });
  }

  function cancelLongPress() {
    if (longPressRef.current) {
      window.clearTimeout(longPressRef.current.timer);
      longPressRef.current = null;
    }
  }

  function handleItemPointerDown(event: React.PointerEvent<HTMLLIElement>, itemId: number) {
    if (event.pointerType !== "touch") return;
    cancelLongPress();
    const { clientX: x, clientY: y } = event;
    const timer = window.setTimeout(() => {
      setItemMenu({ listId: activeId, itemId, x, y });
      longPressRef.current = null;
    }, 550);
    longPressRef.current = { timer, x, y };
  }

  function handleItemPointerMove(event: React.PointerEvent<HTMLLIElement>) {
    if (!longPressRef.current) return;
    if (Math.hypot(event.clientX - longPressRef.current.x, event.clientY - longPressRef.current.y) > 10) {
      cancelLongPress();
    }
  }

  function openItemEdit(listId: number, item: ListItem) {
    setItemMenu(null);
    setItemEditTarget({ listId, itemId: item.id });
    setItemTextDraft(item.text);
    setItemSubjectsDraft(item.subjects?.map((subject) => subject.text).join("\n") ?? "");
  }

  function saveItemEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!itemEditTarget) return;
    const text = itemTextDraft.trim();
    if (!text) return;
    const subjectTexts = itemSubjectsDraft.split("\n").map((subject) => subject.trim()).filter(Boolean);

    setLists((current) => current.map((list) => list.id === itemEditTarget.listId
      ? {
          ...list,
          updated: "Now",
          items: list.items.map((item) => item.id === itemEditTarget.itemId
            ? {
                ...item,
                text,
                subjects: item.subjects?.map((subject, index) => subjectTexts[index]
                  ? { ...subject, text: subjectTexts[index] }
                  : null).filter((subject): subject is ChecklistSubject => subject !== null)
                  .concat(subjectTexts.slice(item.subjects.length).map((subjectText, index) => ({
                    id: `${item.id}-${Date.now()}-${index}`,
                    text: subjectText,
                    done: false,
                  }))),
              }
            : item),
        }
      : list));
    setItemEditTarget(null);
  }

  function removeItem(listId: number, itemId: number) {
    setLists((current) => current.map((list) => list.id === listId
      ? { ...list, items: list.items.filter((item) => item.id !== itemId) }
      : list));
    setItemMenu(null);
  }

  async function copyItem(item: ListItem) {
    const contents = item.subjects
      ? [item.text, ...item.subjects.map((subject) => `${subject.done ? "[x]" : "[ ]"} ${subject.text}`)].join("\n")
      : item.text;
    let copied = false;

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(contents);
      copied = true;
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = contents;
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.appendChild(fallback);
      fallback.select();
      copied = document.execCommand("copy");
      fallback.remove();
    }

    setItemMenu(null);
    setCopyFeedback(copied ? "Copied to clipboard" : "Could not copy this message");
    if (copyFeedbackTimerRef.current !== null) window.clearTimeout(copyFeedbackTimerRef.current);
    copyFeedbackTimerRef.current = window.setTimeout(() => setCopyFeedback(""), 2200);
  }

  function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const id = Date.now();
    const link = extractFirstUrl(text);

    setLists((current) =>
      current.map((list) =>
        list.id === activeId
          ? {
              ...list,
              updated: "Now",
              items: [...list.items, {
                id,
                text,
                time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
                linkPreview: link ? { url: link.url, title: link.site, description: "", site: link.site, loading: true } : undefined,
              }],
            }
          : list,
      ),
    );
    setDraft("");
    if (link) void loadLinkPreview(activeId, id, link.url, link.site);
  }

  function addChecklist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = checklistTitle.trim();
    if (!title || checklistSubjects.length === 0) return;

    const id = Date.now();
    setLists((current) =>
      current.map((list) =>
        list.id === activeId
          ? {
              ...list,
              updated: "Now",
              items: [...list.items, {
                id,
                text: title,
                time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
                subjects: checklistSubjects.map((text, index) => ({
                  id: `${id}-${index}`,
                  text,
                  done: false,
                })),
              }],
            }
          : list,
      ),
    );
    setChecklistTitle("");
    setChecklistDraft("");
    setChecklistMode(false);
  }

  function openCreateList() {
    setListTitleDraft("");
    setListDescriptionDraft("");
    setListGroupDraft(selectedGroupId);
    setListIconDraft("✳️");
    setListIconError("");
    setListDialogMode("create");
  }

  function openEditList() {
    setListTitleDraft(activeList.name);
    setListDescriptionDraft(activeList.description ?? "");
    setListGroupDraft(activeList.groupId ?? null);
    setListIconDraft(activeList.icon);
    setListIconError("");
    setListDialogMode("edit");
  }

  function openCreateGroup() {
    setGroupNameDraft("");
    setGroupDialogOpen(true);
  }

  function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = groupNameDraft.trim();
    if (!name) return;
    const existing = groups.find((group) => group.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setSelectedGroupId(existing.id);
      setGroupDialogOpen(false);
      return;
    }

    const group = { id: Date.now(), name };
    setGroups((current) => [...current, group]);
    setSelectedGroupId(group.id);
    setGroupDialogOpen(false);
  }

  function removeGroup(groupId: number) {
    setGroups((current) => current.filter((group) => group.id !== groupId));
    setLists((current) => current.map((list) => list.groupId === groupId
      ? { ...list, groupId: null }
      : list));
    setSelectedGroupId((current) => current === groupId ? null : current);
  }

  function confirmRemoveGroup() {
    if (!groupToRemove) return;
    removeGroup(groupToRemove.id);
    setGroupToRemove(null);
  }

  function chooseListIconFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setListIconError("Choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setListIconError("Choose an image under 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setListIconDraft(reader.result);
        setListIconError("");
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function saveListDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = listTitleDraft.trim() || "Untitled list";
    const description = listDescriptionDraft.trim();
    const groupId = listGroupDraft;
    const icon = listIconDraft || "✳️";

    if (listDialogMode === "edit") {
      setLists((current) => current.map((list) => list.id === activeId
        ? { ...list, name, description, groupId, icon }
        : list));
    } else if (listDialogMode === "create") {
    const id = Date.now();
    const newList: QuickList = {
      id,
      name,
      description,
      groupId,
      icon,
      color: "mint",
      updated: "Now",
      items: [],
    };
    setLists((current) => [newList, ...current]);
    setActiveId(id);
    setMobileChatOpen(true);
    }

    setListDialogMode(null);
  }

  return (
    <main className="app-shell">
      <div className={`app-frame ${mobileChatOpen ? "mobile-chat-open" : ""}`}>
        <aside className="sidebar" aria-label="Your lists">
          <header className="sidebar-header">
            <div className="brand-lockup">
              <span className="brand-mark" aria-hidden="true">q</span>
              <span>quicklist</span>
            </div>
            <button className="icon-button new-list-button" onClick={openCreateList} aria-label="Create a new list" title="Create a new list">
              <span aria-hidden="true">＋</span>
            </button>
          </header>

          <div className="sidebar-tools">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Search lists"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search lists"
                value={search}
              />
              <kbd>⌘ K</kbd>
            </label>
            <div className="filter-row" aria-label="List filters">
              <button
                aria-pressed={selectedGroupId === null}
                className={`filter-chip ${selectedGroupId === null ? "selected" : ""}`}
                onClick={() => setSelectedGroupId(null)}
                type="button"
              >
                All Lists <span>{lists.length}</span>
              </button>
              {groups.map((group) => (
                <div className={`group-filter ${selectedGroupId === group.id ? "selected" : ""}`} key={group.id}>
                  <button
                    aria-pressed={selectedGroupId === group.id}
                    className="filter-chip group-filter-button"
                    onClick={() => setSelectedGroupId(group.id)}
                    title={group.name}
                    type="button"
                  >
                    <span className="filter-chip-name">{group.name}</span>
                    <span>{lists.filter((list) => list.groupId === group.id).length}</span>
                  </button>
                  <button
                    aria-label={`Remove ${group.name} group`}
                    className="group-remove-button"
                    onClick={() => setGroupToRemove(group)}
                    title="Remove group; keep its lists in All Lists"
                    type="button"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              ))}
              <button className="filter-chip create-group-chip" onClick={openCreateGroup} type="button">
                <span aria-hidden="true">＋</span> New group
              </button>
            </div>
          </div>

          <div className="list-heading"><span>CHATS</span><span>{lists.length}</span></div>
          <nav className="list-nav">
            {visibleLists.map((list) => {
              const pending = remainingCount(list);
              return (
                <button
                  aria-current={activeId === list.id ? "page" : undefined}
                  className={`list-link ${activeId === list.id ? "active" : ""}`}
                  key={list.id}
                  onClick={() => {
                    setActiveId(list.id);
                    setMobileChatOpen(true);
                  }}
                >
                  <span className={`list-avatar ${list.color}`}>{renderListIcon(list.icon)}</span>
                  <span className="list-link-copy">
                    <span className="list-link-top"><strong>{list.name}</strong><time>{list.updated}</time></span>
                    <span className="list-preview">{list.items.at(-1)?.text ?? list.description ?? "Start adding items"}</span>
                  </span>
                  {pending > 0 && <span className="item-count">{pending}</span>}
                </button>
              );
            })}
            {visibleLists.length === 0 && <p className="empty-search">No lists found</p>}
          </nav>

          <footer className="sidebar-footer">
            <div className="profile-avatar">A</div>
            <div className="profile-copy"><strong>Alex Morgan</strong><span>Personal space</span></div>
            <button className="icon-button profile-menu" aria-label="Profile options">···</button>
          </footer>
        </aside>

        <section className="conversation" key={activeList.id} aria-label={`${activeList.name} list`}>
          <header className={`conversation-header ${activeList.description ? "has-description" : ""}`}>
            <button className="icon-button mobile-back-button" onClick={() => setMobileChatOpen(false)} aria-label="Back to chats" title="Back to chats">‹</button>
            <div className={`conversation-avatar ${activeList.color}`}>{renderListIcon(activeList.icon)}</div>
            <div className="conversation-title">
              <h1>{activeList.name}</h1>
              <p>{activeList.items.length} items <span>·</span> {remaining} to do</p>
              {activeGroup && <p className="conversation-group">{activeGroup.name}</p>}
              {activeList.description && <p className="conversation-description">{activeList.description}</p>}
            </div>
            <div className="conversation-actions">
              <button className="header-action share-action"><span aria-hidden="true">↗</span> Share</button>
              <button className="icon-button more-button" onClick={openEditList} aria-label="Edit list details" title="Edit list details">···</button>
            </div>
          </header>

          <div className="conversation-body" ref={conversationBodyRef}>
            <div className="date-divider"><span>TODAY</span></div>
            <ul className="item-list">
              {activeList.items.map((item) => (
                <li
                  className={`item-row ${item.subjects ? "checklist-row" : ""} ${item.subjects?.every((subject) => subject.done) ? "completed" : ""}`}
                  key={item.id}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    cancelLongPress();
                    setItemMenu({ listId: activeId, itemId: item.id, x: event.clientX, y: event.clientY });
                  }}
                  onPointerDown={(event) => handleItemPointerDown(event, item.id)}
                  onPointerMove={handleItemPointerMove}
                  onPointerUp={cancelLongPress}
                  onPointerCancel={cancelLongPress}
                  onPointerLeave={cancelLongPress}
                >
                  {item.subjects ? (
                    <div className="item-message checklist-message">
                      <div className="checklist-heading">
                        <span className="item-text">{item.text}</span>
                        <span className="checklist-progress">
                          {item.subjects.filter((subject) => subject.done).length}/{item.subjects.length} done
                        </span>
                      </div>
                      {item.linkPreview && <LinkPreviewCard preview={item.linkPreview} />}
                      <div className="subject-list">
                        {item.subjects.map((subject) => (
                          <div className={`checklist-subject ${subject.done ? "subject-done" : ""}`} key={subject.id}>
                            <button
                              aria-label={`${subject.done ? "Uncheck" : "Check off"} ${subject.text}`}
                              aria-pressed={subject.done}
                              className="subject-check"
                              onClick={() => toggleSubject(item.id, subject.id)}
                            >
                              {subject.done && <span aria-hidden="true">✓</span>}
                            </button>
                            <span className="subject-text">{subject.text}</span>
                          </div>
                        ))}
                      </div>
                      <div className="item-meta"><time className="item-time">{item.time ?? "10:42 AM"}</time></div>
                    </div>
                  ) : (
                    <div className="item-message">
                      <span className="item-text">{item.text}</span>
                      {item.linkPreview && <LinkPreviewCard preview={item.linkPreview} />}
                      <span className="item-meta"><time className="item-time">{item.time ?? "10:42 AM"}</time></span>
                    </div>
                  )}
                </li>
              ))}
              {activeList.items.length === 0 && (
                <li className="empty-items">No messages yet</li>
              )}
            </ul>
            {remaining > 0 && (
              <div className="completion-note">
                <span aria-hidden="true">✓</span>
                {`${remaining} ${remaining === 1 ? "item" : "items"} left to go`}
              </div>
            )}
          </div>

          {itemMenu && typeof document !== "undefined" && createPortal(
            <>
              <button
                aria-label="Close item actions"
                className="item-action-backdrop"
                onClick={() => setItemMenu(null)}
                type="button"
              />
              <div
                className="item-action-menu"
                role="menu"
                aria-label="Message actions"
                ref={(menu) => {
                  if (!menu || window.matchMedia("(max-width: 720px)").matches) return;
                  const menuWidth = menu.offsetWidth || 200;
                  const menuHeight = menu.offsetHeight || 160;
                  const pointerX = Number.isFinite(itemMenu.x) ? itemMenu.x : window.innerWidth / 2;
                  const pointerY = Number.isFinite(itemMenu.y) ? itemMenu.y : window.innerHeight / 2;
                  const left = Math.max(8, Math.min(pointerX, window.innerWidth - menuWidth - 8));
                  const top = Math.max(8, Math.min(pointerY, window.innerHeight - menuHeight - 8));
                  document.documentElement.style.setProperty("--item-action-left", `${left}px`);
                  document.documentElement.style.setProperty("--item-action-top", `${top}px`);
                }}
              >
                <button className="item-action-option" onClick={() => menuItem && openItemEdit(itemMenu.listId, menuItem)} role="menuitem" type="button">
                  <span className="item-action-icon edit-action" aria-hidden="true">✎</span>
                  <span className="item-action-copy"><strong>Edit</strong><small>Change message or checklist</small></span>
                </button>
                <button className="item-action-option" onClick={() => { if (menuItem) void copyItem(menuItem); }} role="menuitem" type="button">
                  <span className="item-action-icon copy-action" aria-hidden="true">▢</span>
                  <span className="item-action-copy"><strong>Copy</strong><small>Copy text to clipboard</small></span>
                </button>
                <button className="item-action-option destructive" onClick={() => removeItem(itemMenu.listId, itemMenu.itemId)} role="menuitem" type="button">
                  <span className="item-action-icon remove-action" aria-hidden="true">×</span>
                  <span className="item-action-copy"><strong>Remove</strong><small>Delete from this chat</small></span>
                </button>
              </div>
            </>,
            document.body,
          )}

          {!checklistMode && composerPreview && (
            <div className="composer-link-preview" aria-live="polite">
              <LinkPreviewCard preview={composerPreview} />
            </div>
          )}

          {checklistMode ? (
            <form className="composer checklist-composer" onSubmit={addChecklist}>
              <div className="checklist-composer-heading">
                <strong>New checklist</strong>
                <button className="icon-button" type="button" onClick={() => setChecklistMode(false)} aria-label="Close checklist composer">×</button>
              </div>
              <input
                aria-label="Checklist title"
                onChange={(event) => setChecklistTitle(event.target.value)}
                placeholder="Checklist title"
                value={checklistTitle}
              />
              <textarea
                aria-label="Checklist subjects"
                onChange={(event) => setChecklistDraft(event.target.value)}
                placeholder="Add one subject per line"
                rows={3}
                value={checklistDraft}
              />
              <div className="checklist-composer-footer">
                <span>{checklistSubjects.length} {checklistSubjects.length === 1 ? "subject" : "subjects"}</span>
                <button className="send-button" type="submit" aria-label="Send checklist" disabled={!checklistTitle.trim() || checklistSubjects.length === 0}>
                  <span aria-hidden="true">↑</span>
                </button>
              </div>
            </form>
          ) : (
            <form className="composer" onSubmit={addItem}>
              <div className="attachment-control">
                <button
                  aria-controls="attachment-menu"
                  aria-expanded={attachmentMenuOpen}
                  aria-label="Attachments"
                  className="composer-plus"
                  onClick={() => setAttachmentMenuOpen((open) => !open)}
                  title="Attachments"
                  type="button"
                >
                  <span aria-hidden="true">＋</span>
                </button>
                {attachmentMenuOpen && (
                  <>
                    <button
                      aria-label="Close attachments"
                      className="attachment-backdrop"
                      onClick={() => setAttachmentMenuOpen(false)}
                      type="button"
                    />
                    <div className="attachment-menu" id="attachment-menu" role="menu" aria-label="Message attachments">
                      <button
                        className="attachment-option"
                        onClick={() => {
                          setAttachmentMenuOpen(false);
                          setChecklistMode(true);
                        }}
                        role="menuitem"
                        type="button"
                      >
                        <span className="attachment-option-icon" aria-hidden="true">☷</span>
                        <span className="attachment-option-copy">
                          <strong>Checklist</strong>
                          <small>Send a list of subjects</small>
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>
              <input
                id="new-item"
                aria-label="Add to list"
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Message yourself"
                value={draft}
              />
              <button className="send-button" type="submit" aria-label="Add item" disabled={!draft.trim()}>
                <span aria-hidden="true">↑</span>
              </button>
            </form>
          )}
        </section>
      </div>
      {copyFeedback && <div className="copy-feedback" aria-live="polite" role="status">{copyFeedback}</div>}
      <div className="bottom-note"><span className="lock-icon" aria-hidden="true">⌑</span> Your lists, just for you</div>
      {listDialogMode && (
        <div className="list-dialog-layer">
          <button
            aria-label="Close list details"
            className="list-dialog-scrim"
            onClick={() => setListDialogMode(null)}
            type="button"
          />
          <form
            aria-labelledby="list-dialog-title"
            aria-modal="true"
            className="list-dialog"
            onSubmit={saveListDetails}
            role="dialog"
          >
            <div className="list-dialog-heading">
              <button className="icon-button list-dialog-back" onClick={() => setListDialogMode(null)} type="button" aria-label="Back" title="Back">‹</button>
              <div>
                <span>{listDialogMode === "create" ? "NEW CHAT" : "CHAT DETAILS"}</span>
                <h2 id="list-dialog-title">{listDialogMode === "create" ? "Create a list" : "List details"}</h2>
              </div>
              <button className="icon-button list-dialog-close" onClick={() => setListDialogMode(null)} type="button" aria-label="Close list details">×</button>
            </div>
            <label className="list-dialog-field">
              <span>Title <small>Optional</small></span>
              <input
                autoFocus
                onChange={(event) => setListTitleDraft(event.target.value)}
                placeholder="Untitled list"
                value={listTitleDraft}
              />
            </label>
            <label className="list-dialog-field">
              <span>Description <small>Optional</small></span>
              <textarea
                onChange={(event) => setListDescriptionDraft(event.target.value)}
                placeholder="What is this list for?"
                rows={3}
                value={listDescriptionDraft}
              />
            </label>
            <label className="list-dialog-field">
              <span>Group <small>Optional</small></span>
              <select onChange={(event) => setListGroupDraft(event.target.value ? Number(event.target.value) : null)} value={listGroupDraft ?? ""}>
                <option value="">No group</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>
            <fieldset className="list-icon-picker">
              <legend>Icon</legend>
              <div className="list-icon-options">
                {listIconOptions.map((icon) => (
                  <button
                    aria-label={`Use ${icon} icon`}
                    aria-pressed={listIconDraft === icon}
                    className={`list-icon-option ${listIconDraft === icon ? "selected" : ""}`}
                    key={icon}
                    onClick={() => {
                      setListIconDraft(icon);
                      setListIconError("");
                    }}
                    type="button"
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <label className="list-icon-import">
                <span className="list-icon-import-preview">
                  {listIconDraft.startsWith("data:image/")
                    ? <img className="custom-list-icon" src={listIconDraft} alt="" />
                    : <span aria-hidden="true">↑</span>}
                </span>
                <span className="list-icon-import-copy">
                  <strong>{listIconDraft.startsWith("data:image/") ? "Change custom icon" : "Import your own icon"}</strong>
                  <small>Image file, 2 MB max</small>
                </span>
                <input aria-label="Upload your own icon" accept="image/*" onChange={chooseListIconFile} type="file" />
              </label>
              {listIconError && <span className="list-icon-error" role="alert">{listIconError}</span>}
            </fieldset>
            <div className="list-dialog-actions">
              <button className="dialog-cancel" onClick={() => setListDialogMode(null)} type="button">Cancel</button>
              <button className="dialog-save" type="submit">{listDialogMode === "create" ? "Create list" : "Save details"}</button>
            </div>
          </form>
        </div>
      )}
      {itemEditTarget && itemBeingEdited && (
        <div className="list-dialog-layer">
          <button aria-label="Close item editor" className="list-dialog-scrim" onClick={() => setItemEditTarget(null)} type="button" />
          <form aria-labelledby="item-edit-title" aria-modal="true" className="list-dialog" onSubmit={saveItemEdit} role="dialog">
            <div className="list-dialog-heading">
              <button className="icon-button list-dialog-back" onClick={() => setItemEditTarget(null)} type="button" aria-label="Back">‹</button>
              <div>
                <span>MESSAGE OPTIONS</span>
                <h2 id="item-edit-title">{itemBeingEdited.subjects ? "Edit checklist" : "Edit message"}</h2>
              </div>
              <button className="icon-button list-dialog-close" onClick={() => setItemEditTarget(null)} type="button" aria-label="Close item editor">×</button>
            </div>
            <label className="list-dialog-field">
              <span>{itemBeingEdited.subjects ? "Checklist title" : "Message"}</span>
              <input autoFocus onChange={(event) => setItemTextDraft(event.target.value)} required value={itemTextDraft} />
            </label>
            {itemBeingEdited.subjects && (
              <label className="list-dialog-field">
                <span>Subjects <small>One per line</small></span>
                <textarea onChange={(event) => setItemSubjectsDraft(event.target.value)} rows={5} value={itemSubjectsDraft} />
              </label>
            )}
            <div className="list-dialog-actions">
              <button className="dialog-cancel" onClick={() => setItemEditTarget(null)} type="button">Cancel</button>
              <button className="dialog-save" type="submit">Save message</button>
            </div>
          </form>
        </div>
      )}
      {groupDialogOpen && (
        <div className="list-dialog-layer">
          <button aria-label="Close new group dialog" className="list-dialog-scrim" onClick={() => setGroupDialogOpen(false)} type="button" />
          <form aria-labelledby="group-dialog-title" aria-modal="true" className="list-dialog" onSubmit={createGroup} role="dialog">
            <div className="list-dialog-heading">
              <button className="icon-button list-dialog-back" onClick={() => setGroupDialogOpen(false)} type="button" aria-label="Back">‹</button>
              <div>
                <span>ORGANIZE CHATS</span>
                <h2 id="group-dialog-title">Create a group</h2>
              </div>
              <button className="icon-button list-dialog-close" onClick={() => setGroupDialogOpen(false)} type="button" aria-label="Close new group dialog">×</button>
            </div>
            <label className="list-dialog-field">
              <span>Group name</span>
              <input autoFocus maxLength={40} onChange={(event) => setGroupNameDraft(event.target.value)} placeholder="e.g. Work" required value={groupNameDraft} />
            </label>
            <div className="list-dialog-actions">
              <button className="dialog-cancel" onClick={() => setGroupDialogOpen(false)} type="button">Cancel</button>
              <button className="dialog-save" type="submit">Create group</button>
            </div>
          </form>
        </div>
      )}
      {groupToRemove && (
        <div className="list-dialog-layer">
          <button aria-label="Cancel group removal" className="list-dialog-scrim" onClick={() => setGroupToRemove(null)} type="button" />
          <section aria-labelledby="remove-group-title" aria-modal="true" className="list-dialog group-remove-dialog" role="alertdialog">
            <div className="list-dialog-heading">
              <button className="icon-button list-dialog-back" onClick={() => setGroupToRemove(null)} type="button" aria-label="Cancel">‹</button>
              <div>
                <span>REMOVE GROUP</span>
                <h2 id="remove-group-title">Remove “{groupToRemove.name}”?</h2>
              </div>
              <button className="icon-button list-dialog-close" onClick={() => setGroupToRemove(null)} type="button" aria-label="Cancel group removal">×</button>
            </div>
            <p className="group-remove-message">Its lists will stay in All Lists.</p>
            <div className="list-dialog-actions">
              <button className="dialog-cancel" onClick={() => setGroupToRemove(null)} type="button">Cancel</button>
              <button className="dialog-remove" onClick={confirmRemoveGroup} type="button">Remove group</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
