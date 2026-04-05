import { AddTaskInput } from "~/components/AddTaskInput";

interface Props {
  onAdd: (title: string) => void;
}

export function TaskInputBar({ onAdd }: Props) {
  return (
    <div className="touch:order-2 touch:shrink-0 touch:-mx-6 touch:px-6 touch:border-t touch:border-border/20 touch:pt-3 touch:pb-[env(safe-area-inset-bottom,0px)]">
      <AddTaskInput onAdd={onAdd} />
    </div>
  );
}
