"use client";

import type { FormEvent, MouseEvent, PointerEvent, RefObject } from "react";
import { createPortal } from "react-dom";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { renderListIcon, type ItemMenuState, type LinkPreview, type ListGroup, type ListItem, type QuickList } from "../quick-list-model";

type ConversationPanelProps = {
  list: QuickList;
  group?: ListGroup;
  remaining: number;
  bodyRef: RefObject<HTMLDivElement | null>;
  itemMenu: ItemMenuState | null;
  menuItem?: ListItem;
  draft: string;
  composerPreview: LinkPreview | null;
  checklistMode: boolean;
  checklistTitle: string;
  checklistDraft: string;
  checklistSubjects: string[];
  attachmentMenuOpen: boolean;
  onBack: () => void;
  onEditList: () => void;
  onToggleSubject: (itemId: number, subjectId: string) => void;
  onItemContextMenu: (event: MouseEvent<HTMLLIElement>, itemId: number) => void;
  onItemPointerDown: (event: PointerEvent<HTMLLIElement>, itemId: number) => void;
  onItemPointerMove: (event: PointerEvent<HTMLLIElement>) => void;
  onItemPointerEnd: () => void;
  onCloseItemMenu: () => void;
  onOpenItemEdit: (listId: number, item: ListItem) => void;
  onCopyItem: (item: ListItem) => void;
  onRemoveItem: (listId: number, itemId: number) => void;
  onDraftChange: (value: string) => void;
  onSubmitItem: (event: FormEvent<HTMLFormElement>) => void;
  onToggleAttachments: () => void;
  onCloseAttachments: () => void;
  onCreateChecklist: () => void;
  onChecklistTitleChange: (value: string) => void;
  onChecklistDraftChange: (value: string) => void;
  onCloseChecklist: () => void;
  onSubmitChecklist: (event: FormEvent<HTMLFormElement>) => void;
};

export function ConversationPanel({
  list,
  group,
  remaining,
  bodyRef,
  itemMenu,
  menuItem,
  draft,
  composerPreview,
  checklistMode,
  checklistTitle,
  checklistDraft,
  checklistSubjects,
  attachmentMenuOpen,
  onBack,
  onEditList,
  onToggleSubject,
  onItemContextMenu,
  onItemPointerDown,
  onItemPointerMove,
  onItemPointerEnd,
  onCloseItemMenu,
  onOpenItemEdit,
  onCopyItem,
  onRemoveItem,
  onDraftChange,
  onSubmitItem,
  onToggleAttachments,
  onCloseAttachments,
  onCreateChecklist,
  onChecklistTitleChange,
  onChecklistDraftChange,
  onCloseChecklist,
  onSubmitChecklist,
}: ConversationPanelProps) {
  return (
    <section className="conversation" aria-label={`${list.name} list`}>
      <header className={`conversation-header ${list.description ? "has-description" : ""}`}>
        <button className="icon-button mobile-back-button" onClick={onBack} aria-label="Back to chats" title="Back to chats">‹</button>
        <div className={`conversation-avatar ${list.color}`}>{renderListIcon(list.icon)}</div>
        <div className="conversation-title">
          <h1>{list.name}</h1>
          <p>{list.items.length} items <span>·</span> {remaining} to do</p>
          {group && <p className="conversation-group">{group.name}</p>}
          {list.description && <p className="conversation-description">{list.description}</p>}
        </div>
        <div className="conversation-actions">
          <button className="header-action share-action"><span aria-hidden="true">↗</span> Share</button>
          <button className="icon-button more-button" onClick={onEditList} aria-label="Edit list details" title="Edit list details">···</button>
        </div>
      </header>

      <div className="conversation-body" ref={bodyRef}>
        <div className="date-divider"><span>TODAY</span></div>
        <ul className="item-list">
          {list.items.map((item) => (
            <li
              className={`item-row ${item.subjects ? "checklist-row" : ""} ${item.subjects?.every((subject) => subject.done) ? "completed" : ""}`}
              key={item.id}
              onContextMenu={(event) => onItemContextMenu(event, item.id)}
              onPointerDown={(event) => onItemPointerDown(event, item.id)}
              onPointerMove={onItemPointerMove}
              onPointerUp={onItemPointerEnd}
              onPointerCancel={onItemPointerEnd}
              onPointerLeave={onItemPointerEnd}
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
                          onClick={() => onToggleSubject(item.id, subject.id)}
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
          {list.items.length === 0 && <li className="empty-items">No messages yet</li>}
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
          <button aria-label="Close item actions" className="item-action-backdrop" onClick={onCloseItemMenu} type="button" />
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
            <button className="item-action-option" onClick={() => menuItem && onOpenItemEdit(itemMenu.listId, menuItem)} role="menuitem" type="button">
              <span className="item-action-icon edit-action" aria-hidden="true">✎</span>
              <span className="item-action-copy"><strong>Edit</strong><small>Change message or checklist</small></span>
            </button>
            <button className="item-action-option" onClick={() => { if (menuItem) onCopyItem(menuItem); }} role="menuitem" type="button">
              <span className="item-action-icon copy-action" aria-hidden="true">▢</span>
              <span className="item-action-copy"><strong>Copy</strong><small>Copy text to clipboard</small></span>
            </button>
            <button className="item-action-option destructive" onClick={() => onRemoveItem(itemMenu.listId, itemMenu.itemId)} role="menuitem" type="button">
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
        <form className="composer checklist-composer" onSubmit={onSubmitChecklist}>
          <div className="checklist-composer-heading">
            <strong>New checklist</strong>
            <button className="icon-button" type="button" onClick={onCloseChecklist} aria-label="Close checklist composer">×</button>
          </div>
          <input aria-label="Checklist title" onChange={(event) => onChecklistTitleChange(event.target.value)} placeholder="Checklist title" value={checklistTitle} />
          <textarea aria-label="Checklist subjects" onChange={(event) => onChecklistDraftChange(event.target.value)} placeholder="Add one subject per line" rows={3} value={checklistDraft} />
          <div className="checklist-composer-footer">
            <span>{checklistSubjects.length} {checklistSubjects.length === 1 ? "subject" : "subjects"}</span>
            <button className="send-button" type="submit" aria-label="Send checklist" disabled={!checklistTitle.trim() || checklistSubjects.length === 0}>
              <span aria-hidden="true">↑</span>
            </button>
          </div>
        </form>
      ) : (
        <form className="composer" onSubmit={onSubmitItem}>
          <div className="attachment-control">
            <button aria-controls="attachment-menu" aria-expanded={attachmentMenuOpen} aria-label="Attachments" className="composer-plus" onClick={onToggleAttachments} title="Attachments" type="button">
              <span aria-hidden="true">＋</span>
            </button>
            {attachmentMenuOpen && (
              <>
                <button aria-label="Close attachments" className="attachment-backdrop" onClick={onCloseAttachments} type="button" />
                <div className="attachment-menu" id="attachment-menu" role="menu" aria-label="Message attachments">
                  <button className="attachment-option" onClick={onCreateChecklist} role="menuitem" type="button">
                    <span className="attachment-option-icon" aria-hidden="true">☷</span>
                    <span className="attachment-option-copy"><strong>Checklist</strong><small>Send a list of subjects</small></span>
                  </button>
                </div>
              </>
            )}
          </div>
          <input id="new-item" aria-label="Add to list" onChange={(event) => onDraftChange(event.target.value)} placeholder="Message yourself" value={draft} />
          <button className="send-button" type="submit" aria-label="Add item" disabled={!draft.trim()}>
            <span aria-hidden="true">↑</span>
          </button>
        </form>
      )}
    </section>
  );
}