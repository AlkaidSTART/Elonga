import { ContentWorkflowWorkspace } from "@/components/workflow/ContentWorkflowWorkspace";

export default function WorkflowPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            图文协同工作流
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            一站式完成图片智能打码与风格化、抖音爆款文案检索、高推流文章撰写与多格式文档导出
          </p>
        </div>
        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-medium text-neutral-500">
          一键发布功能 · 后续迭代规划中
        </span>
      </div>
      <ContentWorkflowWorkspace />
    </div>
  );
}
