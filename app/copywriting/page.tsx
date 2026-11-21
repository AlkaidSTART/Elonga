import { CopywritingWorkspace } from "@/components/copywriting/CopywritingWorkspace";

export default function CopywritingPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          推流文案工作台
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          选择目标分发平台与内容调性，快速生成符合算法偏好的推流文案
        </p>
      </div>
      <CopywritingWorkspace />
    </div>
  );
}
