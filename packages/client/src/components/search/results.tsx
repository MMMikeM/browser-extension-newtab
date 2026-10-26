import { CornerDownRight, FileText } from "lucide-react";
import { Checkbox, checkboxDoneClass } from "~/components/ui/checkbox";
import { ColorDot } from "~/components/ui/color-dot";
import { INBOX_COLOR } from "~/lib/constants";
import { formatDueDate } from "~/lib/due-date";
import { cn } from "~/lib/utils";
import type { SearchHit, SearchResults as Results } from "~/lib/search";
import type { Category, Task } from "~/lib/types";
import { Highlight } from "./highlight";

type ListLabel = { name: string; color?: string };

const doneDate = (task: Task) =>
  new Date(task.completedAt ?? task.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

function ResultRow({
  hit,
  list,
  onOpen,
  onToggle,
}: {
  hit: SearchHit;
  list: ListLabel;
  onOpen: (taskId: string) => void;
  onToggle: (task: Task) => void;
}) {
  const { task } = hit;
  const done = task.status === "done";
  const isSubtask = !!task.parentId;
  const due = !done && task.dueDate ? formatDueDate(task.dueDate) : null;

  return (
    <li data-task-id={task.id} className="flex items-start gap-2 py-2.5 touch:gap-2.5">
      <Checkbox
        checked={done}
        onCheckedChange={() => onToggle(task)}
        aria-label={task.title}
        className={cn(
          "mt-1 touch:mt-[3px] touch:size-[18px] touch:after:-inset-3",
          isSubtask && "size-3.5 touch:size-4",
          done && checkboxDoneClass,
        )}
      />
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="-my-2.5 flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 py-2.5 text-left"
      >
        <span
          className={cn(
            "line-clamp-2 font-medium break-words",
            isSubtask && "text-sm",
            done && "text-muted-foreground line-through",
          )}
        >
          <Highlight {...hit.title} />
        </span>
        {hit.snippet && (
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-hint">
            {hit.snippet.from === "note" && (
              <>
                <FileText size={12} className="shrink-0" aria-hidden="true" />
                <span className="sr-only">Note: </span>
              </>
            )}
            <span className="min-w-0 truncate">
              <Highlight {...hit.snippet} />
            </span>
          </span>
        )}
        {hit.parent && (
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-hint">
            <CornerDownRight size={12} className="shrink-0" aria-hidden="true" />
            <span className="truncate">in {hit.parent.title}</span>
          </span>
        )}
      </button>
      {due && (
        <span
          className={cn("mt-0.5 shrink-0 text-xs", due.overdue ? "text-destructive" : "text-date")}
        >
          {due.label}
        </span>
      )}
      {done && (
        <span className="mt-0.5 shrink-0 text-xs whitespace-nowrap text-hint">
          {list.name} · {doneDate(task)}
        </span>
      )}
    </li>
  );
}

/** Open tasks under their lists in the sidebar's order, then everything done. */
export function SearchResults({
  results,
  categories,
  onOpen,
  onToggle,
}: {
  results: Results;
  categories: Category[];
  onOpen: (taskId: string) => void;
  onToggle: (task: Task) => void;
}) {
  const listOf = (listId: string | null): ListLabel => {
    if (listId === null) return { name: "Inbox", color: INBOX_COLOR };
    const category = categories.find((c) => c.id === listId);
    return { name: category?.name ?? "List", color: category?.color ?? undefined };
  };

  return (
    <div className="flex flex-col gap-4">
      {results.groups.map(({ listId, hits }) => {
        const list = listOf(listId);
        return (
          <section key={listId ?? "inbox"} aria-label={list.name}>
            <h2 className="flex items-center gap-2 text-xs font-medium tracking-wide text-hint uppercase">
              <ColorDot size="sm" color={list.color} />
              {list.name}
            </h2>
            <ul className="flex flex-col">
              {hits.map((hit) => (
                <ResultRow
                  key={hit.task.id}
                  hit={hit}
                  list={list}
                  onOpen={onOpen}
                  onToggle={onToggle}
                />
              ))}
            </ul>
          </section>
        );
      })}
      {results.done.length > 0 && (
        <section
          aria-label="Done"
          className={cn(results.groups.length > 0 && "border-t border-border pt-3")}
        >
          <h2 className="text-xs font-medium tracking-wide text-hint uppercase">Done</h2>
          <ul className="flex flex-col">
            {results.done.map((hit) => (
              <ResultRow
                key={hit.task.id}
                hit={hit}
                list={listOf(hit.listId)}
                onOpen={onOpen}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
