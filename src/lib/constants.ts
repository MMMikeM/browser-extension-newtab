export const TOKEN_KEY = "newtab-todo-token";

export const CATEGORY_COLORS = [
  { name: "Red", value: "oklch(0.637 0.237 25.331)" },
  { name: "Orange", value: "oklch(0.705 0.191 47.604)" },
  { name: "Amber", value: "oklch(0.795 0.184 86.047)" },
  { name: "Green", value: "oklch(0.723 0.219 149.579)" },
  { name: "Teal", value: "oklch(0.704 0.14 182.503)" },
  { name: "Blue", value: "oklch(0.623 0.214 259.815)" },
  { name: "Purple", value: "oklch(0.627 0.265 303.9)" },
  { name: "Pink", value: "oklch(0.656 0.241 354.308)" },
] as const;
export const EVENTS_PATH = "/api/events";
export const SSE_DATA_CHANGED = "data-changed";
export const MSG_TOKEN_CHANGED = "TOKEN_CHANGED";
