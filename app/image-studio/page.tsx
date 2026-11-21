import { ImageStudioWorkspace } from "@/components/image-studio/ImageStudioWorkspace";

export default function ImageStudioPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          视觉图片工坊
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          支持隐私区域智能涂抹打码，以及一键转换为二维动漫插画风格
        </p>
      </div>
      <ImageStudioWorkspace />
    </div>
  );
}
