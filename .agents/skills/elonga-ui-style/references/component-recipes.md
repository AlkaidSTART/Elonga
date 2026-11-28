# Elonga UI 组件与样式配方（Component Recipes）

本文件提供与 [SKILL.md](../SKILL.md) 配套的标准代码模板，新建页面或重构旧组件时可直接参照。

---

## 1. 页面 Masthead 页头

```tsx
<header className="flex flex-col gap-4 border-b border-[#181816]/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
  <div>
    <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#181816]">
      页面标题
    </h1>
    <p className="mt-1 text-xs text-[#78716C]">
      简短的功能定位或编辑部语境副标题
    </p>
  </div>

  <div className="flex flex-wrap items-center gap-2.5">
    {/* 次按钮 */}
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3.5 py-2 text-xs font-medium text-[#181816] transition hover:border-[#181816]"
    >
      次要操作
    </button>
    {/* 主按钮 */}
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-4 py-2 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F] disabled:opacity-60"
    >
      主要操作
    </button>
  </div>
</header>
```

---

## 2. Segmented 分段切换器

静态轻量版：
```tsx
<div className="inline-flex items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
  {tabs.map((tab) => {
    const active = current === tab.id;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => setCurrent(tab.id)}
        className={`rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
          active
            ? "bg-[#FCFBF8] text-[#181816]"
            : "text-[#78716C] hover:text-[#181816]"
        }`}
      >
        {tab.label}
      </button>
    );
  })}
</div>
```

---

## 3. 表单与设置条带（Rule-Divided Bands）

无外框卡片，采用 4:8 栅格 + 1px 横向发丝线分隔：
```tsx
<div className="divide-y divide-[#E2DDD3] border-b border-[#E2DDD3]">
  <section className="grid grid-cols-1 gap-6 py-8 first:pt-0 lg:grid-cols-12">
    <div className="lg:col-span-4">
      <h2 className="font-editorial text-base font-semibold text-[#181816]">
        分组标题
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-[#78716C]">
        分组说明文字，保持 1–2 行简洁清晰。
      </p>
    </div>

    <div className="space-y-4 lg:col-span-8">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#57534E]">
          字段名称
        </label>
        <input
          type="text"
          placeholder="请输入..."
          className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 text-sm text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
        />
      </div>
    </div>
  </section>
</div>
```

---

## 4. 台账列表与空状态（Hairline Ledger & Empty State）

列表项：
```tsx
<div className="divide-y divide-[#E2DDD3] border-y border-[#E2DDD3]">
  {items.map((item, idx) => (
    <div
      key={item.id}
      className="group flex flex-col justify-between gap-4 py-4 transition-colors hover:bg-[#FCFBF8]/70 lg:flex-row lg:items-center lg:px-2"
    >
      <div className="flex min-w-0 flex-1 items-baseline gap-4">
        <span className="hidden w-6 shrink-0 font-mono text-xs text-[#8C857B] tabular-nums sm:inline">
          {String(idx + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="truncate font-editorial text-[15px] font-semibold text-[#181816]">
            {item.title}
          </h3>
          <p className="truncate text-xs text-[#78716C]">{item.summary}</p>
        </div>
      </div>
    </div>
  ))}
</div>
```

空状态（虚线纸框 + 顶部短竖线）：
```tsx
<div className="flex min-h-[260px] flex-col items-center justify-center border border-dashed border-[#D5CFC3] bg-[#FCFBF8]/60 px-6 py-12 text-center">
  <div className="h-7 w-px bg-[#CFC8BA]" />
  <p className="mt-4 font-editorial text-base font-medium text-[#57534E]">
    暂无记录
  </p>
  <p className="mt-1.5 text-xs text-[#8C857B]">
    引导说明文案
  </p>
</div>
```

---

## 5. 徽章与提示条（Badges & Alerts）

```tsx
{/* 品牌主标签（平台/分类） */}
<span className="rounded bg-[#E9F0ED] px-1.5 py-0.5 text-[11px] font-medium text-[#1B4D3E]">
  微信公众号
</span>

{/* 合规/已通过徽章 */}
<span className="inline-flex items-center gap-1 rounded border border-[#1B4D3E]/25 bg-[#E9F0ED] px-1.5 py-0.5 text-[11px] font-medium text-[#1B4D3E]">
  已获发布资格
</span>

{/* 中性归档/档案标签 */}
<span className="rounded bg-[#EFECE4] px-1.5 py-0.5 text-[11px] text-[#57534E]">
  已归档
</span>

{/* 陶土红待处理/爆款计数 */}
<span className="rounded bg-[#FBF3EC] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#9A4A22] tabular-nums">
  3
</span>

{/* 左侧色条错误提示 */}
<p className="border-l-2 border-[#B42318] bg-[#FDF2F2] px-3.5 py-2 text-xs text-[#B42318]">
  错误详情说明
</p>
```

---

## 6. 暖纸风格弹窗（Modal）

> 注意：请勿参考旧版冷蓝弹窗，统一使用以下暖纸弹窗样式。

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-[#181816]/35 p-4">
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 8 }}
    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    className="w-full max-w-lg rounded-lg border border-[#E2DDD3] bg-[#FCFBF8] p-6 shadow-[0_16px_40px_-16px_rgba(24,24,22,0.22)]"
  >
    <div className="flex items-start justify-between gap-4 border-b border-[#E2DDD3] pb-4">
      <div>
        <h2 className="font-editorial text-lg font-semibold text-[#181816]">
          弹窗标题
        </h2>
        <p className="mt-0.5 text-xs text-[#78716C]">副标题说明</p>
      </div>
      <button
        type="button"
        className="rounded p-1 text-[#8C857B] transition hover:bg-[#EFECE4] hover:text-[#181816]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>

    <div className="py-5">{/* 表单或内容 */}</div>

    <div className="flex items-center justify-end gap-2.5 border-t border-[#E2DDD3] pt-4">
      <button
        type="button"
        className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3.5 py-1.5 text-xs font-medium text-[#57534E] transition hover:border-[#181816] hover:text-[#181816]"
      >
        取消
      </button>
      <button
        type="button"
        className="rounded bg-[#1B4D3E] px-4 py-1.5 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]"
      >
        确认保存
      </button>
    </div>
  </motion.div>
</div>
```

---

## 7. ECharts 暖纸主题基准配置

```ts
const baseChartOption: EChartsOption = {
  tooltip: {
    trigger: "axis",
    backgroundColor: "#FCFBF8",
    borderColor: "#E2DDD3",
    borderWidth: 1,
    textStyle: { color: "#181816", fontSize: 12 },
  },
  legend: {
    top: 0,
    right: 0,
    itemWidth: 10,
    itemHeight: 3,
    textStyle: { color: "#57534E", fontSize: 11 },
  },
  xAxis: {
    axisLine: { lineStyle: { color: "#DDD7CA" } },
    axisTick: { show: false },
    axisLabel: { color: "#57534E", fontSize: 11, margin: 10 },
  },
  yAxis: {
    splitLine: { lineStyle: { color: "#EAE5DC", type: "dashed" } },
    axisLabel: { color: "#8C857B", fontSize: 11 },
  },
  // 系列色：主指标 #1B4D3E（松柏墨绿）、次指标 #B85D3B（陶土红）、参考虚线 #A8A29E（暖灰）
};
```
