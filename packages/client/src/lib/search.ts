import { createFuzzySearch, SCORES, type HighlightRanges, type MatchResult } from "ekrina";
import { getEffectiveCategoryId } from "~/lib/effective-category";
import type { Category, Note, Task } from "~/lib/types";

export type Highlighted = { text: string; ranges: HighlightRanges };

export type SearchHit = {
  task: Task;
  score: number;
  title: Highlighted;
  /** Why it matched, when its title didn't */
  snippet?: Highlighted & { from: "description" | "note" };
  /** For a subtask, the task it sits under */
  parent?: Task;
  /** The list it's in: a subtask is in its parent's */
  listId: string | null;
};

export type SearchResults = {
  /** Open tasks by list, in the sidebar's order */
  groups: { listId: string | null; hits: SearchHit[] }[];
  done: SearchHit[];
  /** The query with a typo fixed, when only the fixed one matched */
  corrected?: string;
  /** A task already has exactly this title, so there's nothing to add */
  exact: boolean;
};

const NO_RESULTS: SearchResults = { groups: [], done: [], exact: false };

// Enough either side of the match to read it in one line
const SNIPPET_BEFORE = 24;
const SNIPPET_LENGTH = 90;

/** One line around the first match, with its ranges moved to match. */
const snippetOf = (text: string, ranges: HighlightRanges): Highlighted => {
  const flat = text.replace(/\s/g, " ");
  const first = ranges[0]?.[0] ?? 0;
  const start = Math.max(0, first - SNIPPET_BEFORE);
  const end = Math.min(flat.length, start + SNIPPET_LENGTH);
  const lead = start > 0 ? "…" : "";
  const shift = lead.length - start;
  return {
    text: `${lead}${flat.slice(start, end).trimEnd()}${end < flat.length ? "…" : ""}`,
    ranges: ranges
      .filter(([s]) => s >= start && s < end)
      .map(([s, e]) => [s + shift, Math.min(e, end - 1) + shift]),
  };
};

const correctedQuery = (fields: (MatchResult | null)[]) =>
  fields.find((field) => field?.tier === "corrected")?.corrected;

const matchedAsTyped = (fields: (MatchResult | null)[]) =>
  fields.some((field) => field && field.tier !== "corrected");

export const searchTasks = ({
  query,
  tasks,
  notes,
  categories,
  userId,
  collaboratedCategoryIds,
}: {
  query: string;
  tasks: Task[];
  notes: Note[];
  categories: Category[];
  userId: string;
  collaboratedCategoryIds: Set<string>;
}): SearchResults => {
  const q = query.trim();
  if (q.length < 2) return NO_RESULTS;

  const byId = new Map(tasks.map((t) => [t.id, t]));
  // Only what the lists show: a subtask files under its parent, and a task in none of this
  // user's lists is left out, as the lists leave it out
  const listOf = new Map<string, string | null>();
  for (const task of tasks) {
    const top = task.parentId ? byId.get(task.parentId) : task;
    if (!top) continue;
    const listId = getEffectiveCategoryId(top, userId, collaboratedCategoryIds);
    if (listId !== undefined) listOf.set(task.id, listId);
  }
  const visible = tasks.filter((t) => listOf.has(t.id));
  // A note whose task was just deleted, or lost it long ago, has nowhere to open
  const visibleNotes = notes.filter((n) => n.taskId && listOf.has(n.taskId));

  const taskResults = createFuzzySearch(visible, [
    { text: (t) => t.title },
    { text: (t) => t.description, atBest: SCORES.CONTAINS },
  ])(q);
  const noteResults = createFuzzySearch(visibleNotes, [
    { text: (n) => n.content ?? n.title, atBest: SCORES.CONTAINS + SCORES.BOUNDARY },
  ])(q);

  const hits = new Map<string, SearchHit>();
  const hitFor = (task: Task, score: number) => {
    const existing = hits.get(task.id);
    if (existing) {
      existing.score = Math.min(existing.score, score);
      return existing;
    }
    const hit: SearchHit = {
      task,
      score,
      title: { text: task.title, ranges: [] },
      parent: task.parentId ? byId.get(task.parentId) : undefined,
      listId: listOf.get(task.id) ?? null,
    };
    hits.set(task.id, hit);
    return hit;
  };

  let corrected: string | undefined;
  let anyAsTyped = false;
  for (const { item, score, fields } of taskResults) {
    const hit = hitFor(item, score);
    const [title, description] = fields;
    if (title) hit.title.ranges = title.ranges;
    else if (description && item.description)
      hit.snippet = { ...snippetOf(item.description, description.ranges), from: "description" };
    corrected ??= correctedQuery(fields);
    anyAsTyped ||= matchedAsTyped(fields);
  }
  for (const { item, score, fields } of noteResults) {
    const task = byId.get(item.taskId!)!;
    const hit = hitFor(task, score);
    const [content] = fields;
    if (content && !hit.title.ranges.length && !hit.snippet)
      hit.snippet = { ...snippetOf(item.content ?? item.title, content.ranges), from: "note" };
    corrected ??= correctedQuery(fields);
    anyAsTyped ||= matchedAsTyped(fields);
  }

  const ranked = [...hits.values()].sort((a, b) => a.score - b.score);

  const listOrder = [
    null,
    ...categories.filter((c) => c.userId === userId).map((c) => c.id),
    ...categories.filter((c) => c.userId !== userId).map((c) => c.id),
  ];
  const open = ranked.filter((h) => h.task.status !== "done");
  const groups = listOrder
    .map((listId) => ({ listId, hits: open.filter((h) => h.listId === listId) }))
    .filter((group) => group.hits.length > 0);

  const lowered = q.toLowerCase();
  return {
    groups,
    done: ranked.filter((h) => h.task.status === "done"),
    corrected: anyAsTyped ? undefined : corrected,
    exact: visible.some((t) => t.title.trim().toLowerCase() === lowered),
  };
};
