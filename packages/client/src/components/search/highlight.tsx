import type { Highlighted } from "~/lib/search";

/** The text with what matched marked: a quiet wash, so weight and colour stay the row's own. */
export function Highlight({ text, ranges }: Highlighted) {
  const parts = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={start} className="rounded-[3px] bg-secondary px-px text-inherit">
        {text.slice(start, end + 1)}
      </mark>,
    );
    cursor = end + 1;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}
