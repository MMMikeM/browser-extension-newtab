/** A due date as the list shows it, relative to the device's today. */
export const formatDueDate = (dateStr: string) => {
  const date = Temporal.PlainDate.from(dateStr.slice(0, 10));
  const today = Temporal.Now.plainDateISO();
  const diffDays = date.since(today, { largestUnit: "day" }).days;

  if (diffDays < 0) return { label: `${-diffDays}d ago`, overdue: true };
  if (diffDays === 0) return { label: "Today", overdue: false };
  if (diffDays === 1) return { label: "Tomorrow", overdue: false };
  return {
    // Device locale: "2 Oct" on en-GB, "Oct 2" on en-US
    label: date.toLocaleString(undefined, { month: "short", day: "numeric" }),
    overdue: false,
  };
};
