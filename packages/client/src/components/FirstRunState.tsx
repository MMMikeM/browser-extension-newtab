export function FirstRunState() {
  return (
    <div className="flex flex-col gap-4 py-8">
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
    </div>
  );
}
