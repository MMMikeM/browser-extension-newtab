export const TOKEN_KEY = "newtab-todo-token";

// Warm-toned palette — chosen to harmonise with the app's oklch(0.155 0.012 55) background.
// Lower chroma than standard palettes; all work as text on dark bg and as bg with white text.
export const CATEGORY_COLORS = [
  { name: "Rust", value: "oklch(0.58 0.17 25)" },
  { name: "Amber", value: "oklch(0.68 0.16 58)" },
  { name: "Gold", value: "oklch(0.74 0.13 85)" },
  { name: "Sage", value: "oklch(0.60 0.12 138)" },
  { name: "Spruce", value: "oklch(0.53 0.10 162)" },
  { name: "Slate", value: "oklch(0.55 0.07 228)" },
  { name: "Mauve", value: "oklch(0.55 0.13 315)" },
  { name: "Blush", value: "oklch(0.61 0.13 4)" },
] as const;
export const EVENTS_PATH = "/api/events";
export const SSE_DATA_CHANGED = "data-changed";
export const MSG_TOKEN_CHANGED = "TOKEN_CHANGED";

export const MODEL_NAMES = ["tasks", "categories", "notes"] as const;
export type ModelName = (typeof MODEL_NAMES)[number];

export type MutationEvent = {
  model: ModelName;
  action: "insert" | "update" | "delete";
  data: object;
  sourceClientId?: string;
};
