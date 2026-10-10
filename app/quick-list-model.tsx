
export type ChecklistSubject = {
  id: string;
  text: string;
  done: boolean;
};

export type LinkPreview = {
  url: string;
  title: string;
  description: string;
  site: string;
  favicon?: string;
  loading?: boolean;
};

export type ListItem = {
  id: number;
  text: string;
  time?: string;
  subjects?: ChecklistSubject[];
  linkPreview?: LinkPreview;
};

export type QuickList = {
  id: number;
  name: string;
  description?: string;
  groupId?: number | null;
  icon: string;
  color: string;
  updated: string;
  items: ListItem[];
};

export type ListGroup = {
  id: number;
  name: string;
};

export type ItemMenuState = {
  listId: number;
  itemId: number;
  x: number;
  y: number;
};

export type ItemEditTarget = {
  listId: number;
  itemId: number;
};

export const starterLists: QuickList[] = [
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

export const listIconOptions = ["🥑", "☀️", "🪴", "📚", "🛒", "🏠", "✈️", "🎯", "💡", "🎬", "💪", "✳️"];

export function extractFirstUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s<>"']+/i)?.[0]?.replace(/[.,!?;:)\]]+$/, "");
  if (!match) return null;
  try {
    const url = new URL(match);
    return { url: url.toString(), site: url.hostname.replace(/^www\./i, "") };
  } catch {
    return null;
  }
}

export function renderListIcon(icon: string) {
  return icon.startsWith("data:image/")
    ? <img className="custom-list-icon" src={icon} alt={icon} />
    : icon;
}

export function remainingCount(list: QuickList) {
  return list.items.reduce(
    (count, item) => count + (item.subjects?.filter((subject) => !subject.done).length ?? 0),
    0,
  );
}