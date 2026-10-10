"use client";

import type { ChangeEvent, FormEvent } from "react";
import type { ItemEditTarget, ListGroup, ListItem } from "../quick-list-model";

type ListDialogMode = "create" | "edit" | null;

type WorkspaceDialogsProps = {
  listDialogMode: ListDialogMode;
  listTitleDraft: string;
  listDescriptionDraft: string;
  listGroupDraft: number | null;
  listIconDraft: string;
  listIconError: string;
  groups: ListGroup[];
  listIconOptions: string[];
  itemEditTarget: ItemEditTarget | null;
  itemBeingEdited?: ListItem;
  itemTextDraft: string;
  itemSubjectsDraft: string;
  groupDialogOpen: boolean;
  groupNameDraft: string;
  groupToRemove: ListGroup | null;
  onCloseListDialog: () => void;
  onSubmitListDetails: (event: FormEvent<HTMLFormElement>) => void;
  onListTitleChange: (value: string) => void;
  onListDescriptionChange: (value: string) => void;
  onListGroupChange: (groupId: number | null) => void;
  onListIconChange: (icon: string) => void;
  onChooseListIconFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onCloseItemEditor: () => void;
  onSubmitItemEdit: (event: FormEvent<HTMLFormElement>) => void;
  onItemTextChange: (value: string) => void;
  onItemSubjectsChange: (value: string) => void;
  onCloseGroupDialog: () => void;
  onCreateGroup: (event: FormEvent<HTMLFormElement>) => void;
  onGroupNameChange: (value: string) => void;
  onCancelGroupRemoval: () => void;
  onConfirmGroupRemoval: () => void;
};

export function WorkspaceDialogs({
  listDialogMode,
  listTitleDraft,
  listDescriptionDraft,
  listGroupDraft,
  listIconDraft,
  listIconError,
  groups,
  listIconOptions,
  itemEditTarget,
  itemBeingEdited,
  itemTextDraft,
  itemSubjectsDraft,
  groupDialogOpen,
  groupNameDraft,
  groupToRemove,
  onCloseListDialog,
  onSubmitListDetails,
  onListTitleChange,
  onListDescriptionChange,
  onListGroupChange,
  onListIconChange,
  onChooseListIconFile,
  onCloseItemEditor,
  onSubmitItemEdit,
  onItemTextChange,
  onItemSubjectsChange,
  onCloseGroupDialog,
  onCreateGroup,
  onGroupNameChange,
  onCancelGroupRemoval,
  onConfirmGroupRemoval,
}: WorkspaceDialogsProps) {
  return (
    <>
      {listDialogMode && (
        <div className="list-dialog-layer">
          <button aria-label="Close list details" className="list-dialog-scrim" onClick={onCloseListDialog} type="button" />
          <form aria-labelledby="list-dialog-title" aria-modal="true" className="list-dialog" onSubmit={onSubmitListDetails} role="dialog">
            <div className="list-dialog-heading">
              <button className="icon-button list-dialog-back" onClick={onCloseListDialog} type="button" aria-label="Back" title="Back">‹</button>
              <div>
                <span>{listDialogMode === "create" ? "NEW CHAT" : "CHAT DETAILS"}</span>
                <h2 id="list-dialog-title">{listDialogMode === "create" ? "Create a list" : "List details"}</h2>
              </div>
              <button className="icon-button list-dialog-close" onClick={onCloseListDialog} type="button" aria-label="Close list details">×</button>
            </div>
            <label className="list-dialog-field">
              <span>Title <small>Optional</small></span>
              <input autoFocus onChange={(event) => onListTitleChange(event.target.value)} placeholder="Untitled list" value={listTitleDraft} />
            </label>
            <label className="list-dialog-field">
              <span>Description <small>Optional</small></span>
              <textarea onChange={(event) => onListDescriptionChange(event.target.value)} placeholder="What is this list for?" rows={3} value={listDescriptionDraft} />
            </label>
            <label className="list-dialog-field">
              <span>Group <small>Optional</small></span>
              <select onChange={(event) => onListGroupChange(event.target.value ? Number(event.target.value) : null)} value={listGroupDraft ?? ""}>
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
                    onClick={() => onListIconChange(icon)}
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
                <input aria-label="Upload your own icon" accept="image/*" onChange={onChooseListIconFile} type="file" />
              </label>
              {listIconError && <span className="list-icon-error" role="alert">{listIconError}</span>}
            </fieldset>
            <div className="list-dialog-actions">
              <button className="dialog-cancel" onClick={onCloseListDialog} type="button">Cancel</button>
              <button className="dialog-save" type="submit">{listDialogMode === "create" ? "Create list" : "Save details"}</button>
            </div>
          </form>
        </div>
      )}

      {itemEditTarget && itemBeingEdited && (
        <div className="list-dialog-layer">
          <button aria-label="Close item editor" className="list-dialog-scrim" onClick={onCloseItemEditor} type="button" />
          <form aria-labelledby="item-edit-title" aria-modal="true" className="list-dialog" onSubmit={onSubmitItemEdit} role="dialog">
            <div className="list-dialog-heading">
              <button className="icon-button list-dialog-back" onClick={onCloseItemEditor} type="button" aria-label="Back">‹</button>
              <div>
                <span>MESSAGE OPTIONS</span>
                <h2 id="item-edit-title">{itemBeingEdited.subjects ? "Edit checklist" : "Edit message"}</h2>
              </div>
              <button className="icon-button list-dialog-close" onClick={onCloseItemEditor} type="button" aria-label="Close item editor">×</button>
            </div>
            <label className="list-dialog-field">
              <span>{itemBeingEdited.subjects ? "Checklist title" : "Message"}</span>
              <input autoFocus onChange={(event) => onItemTextChange(event.target.value)} required value={itemTextDraft} />
            </label>
            {itemBeingEdited.subjects && (
              <label className="list-dialog-field">
                <span>Subjects <small>One per line</small></span>
                <textarea onChange={(event) => onItemSubjectsChange(event.target.value)} rows={5} value={itemSubjectsDraft} />
              </label>
            )}
            <div className="list-dialog-actions">
              <button className="dialog-cancel" onClick={onCloseItemEditor} type="button">Cancel</button>
              <button className="dialog-save" type="submit">Save message</button>
            </div>
          </form>
        </div>
      )}

      {groupDialogOpen && (
        <div className="list-dialog-layer">
          <button aria-label="Close new group dialog" className="list-dialog-scrim" onClick={onCloseGroupDialog} type="button" />
          <form aria-labelledby="group-dialog-title" aria-modal="true" className="list-dialog" onSubmit={onCreateGroup} role="dialog">
            <div className="list-dialog-heading">
              <button className="icon-button list-dialog-back" onClick={onCloseGroupDialog} type="button" aria-label="Back">‹</button>
              <div>
                <span>ORGANIZE CHATS</span>
                <h2 id="group-dialog-title">Create a group</h2>
              </div>
              <button className="icon-button list-dialog-close" onClick={onCloseGroupDialog} type="button" aria-label="Close new group dialog">×</button>
            </div>
            <label className="list-dialog-field">
              <span>Group name</span>
              <input autoFocus maxLength={40} onChange={(event) => onGroupNameChange(event.target.value)} placeholder="e.g. Work" required value={groupNameDraft} />
            </label>
            <div className="list-dialog-actions">
              <button className="dialog-cancel" onClick={onCloseGroupDialog} type="button">Cancel</button>
              <button className="dialog-save" type="submit">Create group</button>
            </div>
          </form>
        </div>
      )}

      {groupToRemove && (
        <div className="list-dialog-layer">
          <button aria-label="Cancel group removal" className="list-dialog-scrim" onClick={onCancelGroupRemoval} type="button" />
          <section aria-labelledby="remove-group-title" aria-modal="true" className="list-dialog group-remove-dialog" role="alertdialog">
            <div className="list-dialog-heading">
              <button className="icon-button list-dialog-back" onClick={onCancelGroupRemoval} type="button" aria-label="Cancel">‹</button>
              <div>
                <span>REMOVE GROUP</span>
                <h2 id="remove-group-title">Remove “{groupToRemove.name}”?</h2>
              </div>
              <button className="icon-button list-dialog-close" onClick={onCancelGroupRemoval} type="button" aria-label="Cancel group removal">×</button>
            </div>
            <p className="group-remove-message">Its lists will stay in All Lists.</p>
            <div className="list-dialog-actions">
              <button className="dialog-cancel" onClick={onCancelGroupRemoval} type="button">Cancel</button>
              <button className="dialog-remove" onClick={onConfirmGroupRemoval} type="button">Remove group</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}