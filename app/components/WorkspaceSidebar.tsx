"use client";

import { remainingCount, renderListIcon, type ListGroup, type QuickList } from "../quick-list-model";

type WorkspaceSidebarProps = {
  lists: QuickList[];
  visibleLists: QuickList[];
  groups: ListGroup[];
  activeId: number;
  selectedGroupId: number | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectGroup: (groupId: number | null) => void;
  onRemoveGroup: (group: ListGroup) => void;
  onCreateGroup: () => void;
  onCreateList: () => void;
  onSelectList: (listId: number) => void;
};

export function WorkspaceSidebar({
  lists,
  visibleLists,
  groups,
  activeId,
  selectedGroupId,
  search,
  onSearchChange,
  onSelectGroup,
  onRemoveGroup,
  onCreateGroup,
  onCreateList,
  onSelectList,
}: WorkspaceSidebarProps) {
  return (
    <aside className="sidebar" aria-label="Your lists">
      <header className="sidebar-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">q</span>
          <span>quicklist</span>
        </div>
        <button className="icon-button new-list-button" onClick={onCreateList} aria-label="Create a new list" title="Create a new list">
          <span aria-hidden="true">＋</span>
        </button>
      </header>

      <div className="sidebar-tools">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Search lists"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search lists"
            value={search}
          />
          <kbd>⌘ K</kbd>
        </label>
        <div className="filter-row" aria-label="List filters">
          <button
            aria-pressed={selectedGroupId === null}
            className={`filter-chip ${selectedGroupId === null ? "selected" : ""}`}
            onClick={() => onSelectGroup(null)}
            type="button"
          >
            All Lists <span>{lists.length}</span>
          </button>
          {groups.map((group) => (
            <div className={`group-filter ${selectedGroupId === group.id ? "selected" : ""}`} key={group.id}>
              <button
                aria-pressed={selectedGroupId === group.id}
                className="filter-chip group-filter-button"
                onClick={() => onSelectGroup(group.id)}
                title={group.name}
                type="button"
              >
                <span className="filter-chip-name">{group.name}</span>
                <span>{lists.filter((list) => list.groupId === group.id).length}</span>
              </button>
              <button
                aria-label={`Remove ${group.name} group`}
                className="group-remove-button"
                onClick={() => onRemoveGroup(group)}
                title="Remove group; keep its lists in All Lists"
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}
          <button className="filter-chip create-group-chip" onClick={onCreateGroup} type="button">
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
              onClick={() => onSelectList(list.id)}
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
  );
}