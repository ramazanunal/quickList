"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConversationPanel } from "./components/ConversationPanel";
import { WorkspaceSidebar } from "./components/WorkspaceSidebar";
import { WorkspaceDialogs } from "./components/WorkspaceDialogs";
import {
  extractFirstUrl,
  listIconOptions,
  remainingCount,
  starterLists,
  type ChecklistSubject,
  type ItemEditTarget,
  type ItemMenuState,
  type LinkPreview,
  type ListGroup,
  type ListItem,
  type QuickList,
} from "./quick-list-model";

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
        <WorkspaceSidebar
          activeId={activeId}
          groups={groups}
          lists={lists}
          onCreateGroup={openCreateGroup}
          onCreateList={openCreateList}
          onRemoveGroup={setGroupToRemove}
          onSearchChange={setSearch}
          onSelectGroup={setSelectedGroupId}
          onSelectList={(listId) => {
            setActiveId(listId);
            setMobileChatOpen(true);
          }}
          search={search}
          selectedGroupId={selectedGroupId}
          visibleLists={visibleLists}
        />

        <ConversationPanel
          attachmentMenuOpen={attachmentMenuOpen}
          bodyRef={conversationBodyRef}
          checklistDraft={checklistDraft}
          checklistMode={checklistMode}
          checklistSubjects={checklistSubjects}
          checklistTitle={checklistTitle}
          composerPreview={composerPreview}
          draft={draft}
          group={activeGroup}
          itemMenu={itemMenu}
          list={activeList}
          menuItem={menuItem}
          onBack={() => setMobileChatOpen(false)}
          onChecklistDraftChange={setChecklistDraft}
          onChecklistTitleChange={setChecklistTitle}
          onCloseAttachments={() => setAttachmentMenuOpen(false)}
          onCloseChecklist={() => setChecklistMode(false)}
          onCloseItemMenu={() => setItemMenu(null)}
          onCopyItem={(item) => { void copyItem(item); }}
          onCreateChecklist={() => {
            setAttachmentMenuOpen(false);
            setChecklistMode(true);
          }}
          onDraftChange={setDraft}
          onEditList={openEditList}
          onItemContextMenu={(event, itemId) => {
            event.preventDefault();
            cancelLongPress();
            setItemMenu({ listId: activeId, itemId, x: event.clientX, y: event.clientY });
          }}
          onItemPointerDown={(event, itemId) => handleItemPointerDown(event, itemId)}
          onItemPointerEnd={cancelLongPress}
          onItemPointerMove={handleItemPointerMove}
          onOpenItemEdit={openItemEdit}
          onRemoveItem={removeItem}
          onSubmitChecklist={addChecklist}
          onSubmitItem={addItem}
          onToggleAttachments={() => setAttachmentMenuOpen((open) => !open)}
          onToggleSubject={toggleSubject}
          remaining={remaining}
        />
      </div>
      {copyFeedback && <div className="copy-feedback" aria-live="polite" role="status">{copyFeedback}</div>}
      <div className="bottom-note"><span className="lock-icon" aria-hidden="true">⌑</span> Your lists, just for you</div>
      <WorkspaceDialogs
        groups={groups}
        groupDialogOpen={groupDialogOpen}
        groupNameDraft={groupNameDraft}
        groupToRemove={groupToRemove}
        itemBeingEdited={itemBeingEdited}
        itemEditTarget={itemEditTarget}
        itemSubjectsDraft={itemSubjectsDraft}
        itemTextDraft={itemTextDraft}
        listDescriptionDraft={listDescriptionDraft}
        listDialogMode={listDialogMode}
        listGroupDraft={listGroupDraft}
        listIconDraft={listIconDraft}
        listIconError={listIconError}
        listIconOptions={listIconOptions}
        listTitleDraft={listTitleDraft}
        onCancelGroupRemoval={() => setGroupToRemove(null)}
        onChooseListIconFile={chooseListIconFile}
        onCloseGroupDialog={() => setGroupDialogOpen(false)}
        onCloseItemEditor={() => setItemEditTarget(null)}
        onCloseListDialog={() => setListDialogMode(null)}
        onConfirmGroupRemoval={confirmRemoveGroup}
        onCreateGroup={createGroup}
        onGroupNameChange={setGroupNameDraft}
        onItemSubjectsChange={setItemSubjectsDraft}
        onItemTextChange={setItemTextDraft}
        onListDescriptionChange={setListDescriptionDraft}
        onListGroupChange={setListGroupDraft}
        onListIconChange={(icon) => {
          setListIconDraft(icon);
          setListIconError("");
        }}
        onListTitleChange={setListTitleDraft}
        onSubmitItemEdit={saveItemEdit}
        onSubmitListDetails={saveListDetails}
      />
    </main>
  );
}
