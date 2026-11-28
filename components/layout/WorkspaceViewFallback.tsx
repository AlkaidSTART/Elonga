export function WorkspaceViewFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="正在加载模块"
      className="space-y-8"
    >
      <header className="flex flex-col gap-3 border-b border-[#181816]/15 pb-5">
        <div className="h-7 w-40 animate-pulse rounded bg-[#EFECE4]" />
        <div className="h-3.5 w-64 animate-pulse rounded bg-[#EFECE4]/80" />
      </header>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:divide-x lg:divide-[#E2DDD3]">
        <div className="space-y-4 lg:col-span-4">
          <div className="h-4 w-28 animate-pulse rounded bg-[#EFECE4]" />
          <div className="h-24 animate-pulse rounded border border-[#E2DDD3] bg-[#FCFBF8]" />
        </div>
        <div className="space-y-4 lg:col-span-8 lg:pl-6">
          <div className="h-4 w-36 animate-pulse rounded bg-[#EFECE4]" />
          <div className="h-48 animate-pulse rounded border border-[#E2DDD3] bg-[#FCFBF8]" />
        </div>
      </div>
    </div>
  );
}
