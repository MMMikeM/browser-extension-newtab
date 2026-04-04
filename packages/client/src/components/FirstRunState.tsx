export function FirstRunState() {
  return (
    <div className="flex flex-col gap-1 py-4">
      <div className="flex flex-col gap-1 text-hint">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="size-4 rounded-[6px] border border-hint" />
          <span className="font-medium">Buy milk</span>
          <span className="ml-auto text-xs">Tomorrow</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="size-4 rounded-[6px] border border-hint" />
          <span className="font-medium">Weekend project</span>
          <span className="ml-auto text-xs">2 subtasks</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="size-4 rounded-[6px] border border-hint" />
          <span className="font-medium">Call the dentist</span>
        </div>
      </div>
      <p className="mt-1 text-center text-xs text-hint">Type above to add your first task</p>
    </div>
  );
}
