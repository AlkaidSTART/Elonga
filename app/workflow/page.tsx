import { ContentWorkflowWorkspace } from "@/components/workflow/ContentWorkflowWorkspace";

export default function WorkflowPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          图文协同工作流
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          配图处理、爆款文案撰写与多格式文档导出
        </p>
      </div>
      <ContentWorkflowWorkspace />
    </div>
  );
}
