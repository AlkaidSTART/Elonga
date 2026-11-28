---
name: elonga-ui-style
description: >-
  Elonga 项目的专属 UI 视觉风格与组件设计规范（Warm Editorial Studio 暖纸编辑工坊风格）。
  当在 Elonga 工作区内新建页面、重构组件、调整样式、设计弹窗/表单/图表，或审查界面视觉一致性时，必须加载并遵循本技能。
---

# Elonga UI 风格规范（Warm Editorial Studio）

Elonga 采用 **暖纸编辑工坊（Warm Editorial Studio）** 设计语言：以米白纸感底色、松柏墨绿主色、陶土红点缀色、宋体编辑风标题和极细发丝分割线为核心，营造沉静、克制、富有公益人文温度与专业出版物秩序感的创作台体验。

> 详细的可复用 JSX / Tailwind 代码配方见 [component-recipes.md](./references/component-recipes.md)。

---

## 1. 设计哲学（Design Principles）

1. **纸感平面，去卡片化（Flush Warm Paper, Zero Floating Cards）**
   - 优先使用 **1px 发丝分割线**（`border-[#E2DDD3]`、`divide-y divide-[#E2DDD3]`、`divide-x`）和留白建立层级，**不要**给每个区块套一层带阴影的圆角白卡片。
   - 仅在需要独立工作台画布（如图片工坊编辑区 `bg-[#FCFBF8] border-[#E2DDD3]`）或弹窗/抽屉时使用容器包裹。
2. **编辑部排版秩序（Editorial Hierarchy）**
   - 页面大标题、区块标题与核心大号指标使用宋体 `.font-editorial`，正文与交互控件使用无衬线字体，数据、序号（`01`、`02`）、时间戳与统计值使用 `font-mono tabular-nums`。
3. **克制的色彩与圆角（Restrained Palette & Geometry）**
   - 工作台内主色调只有 **墨绿 `#1B4D3E`** 与 **陶土红 `#B85D3B`**（作为爆款、警示或人文点缀），其余全部为暖纸与暖墨中性色阶。
   - 工作台控件偏利落微圆角：`rounded`（4px）或 `rounded-md` / `rounded-lg`（侧栏项、画布容器）；登录页等独立落地表单可用 `rounded-xl`（12px）。
4. **低噪微动效（Tactile Spring Motion）**
   - 使用 `framer-motion`，全局包裹 `<MotionConfig reducedMotion="user">`，强调共享元素滑动（`layoutId`）与轻微位移淡入，避免浮夸弹跳。

---

## 2. 色彩系统（Color Tokens）

定义于 [app/globals.css](../../../app/globals.css)，业务代码中直接引用 CSS 变量或以下精确色值：

### 表面与背景（Surfaces）
| 用途 | CSS 变量 | 色值 | 常见场景 |
| :--- | :--- | :--- | :--- |
| 页面暖纸底色 | `--background` | `#F6F4EF` | `body`、主视口背景 |
| 抬升纸面 / 输入框底 | `--surface` | `#FCFBF8` | 按钮/输入框底、侧栏激活项、Tooltip、编辑台容器 |
| 柔和底槽 / 侧栏底 | `--surface-muted` | `#EFECE4` | 侧边栏 (`bg-[#EFECE4]/75`)、Segmented 控件底槽、次要标签 |
| 悬停暖灰 | — | `#E5E0D5` | 侧栏悬停底、图标按钮悬停底 |
| 深色暗房 / 插画衬底 | — | `#162A24` / `#181816` | 登录页左侧画幅衬底、遮罩 (`bg-[#181816]/30`) |

### 文字与墨色（Ink）
| 用途 | CSS 变量 | 色值 | 常见场景 |
| :--- | :--- | :--- | :--- |
| 主墨色 | `--ink` / `--foreground` | `#181816` | 标题、正文、主数据 |
| 次要文字 | `--ink-secondary` | `#57534E` | 正文说明、表单 label、未激活导航 |
| 辅助描述 | — | `#78716C` | 页头副标题、表格表头、次要说明 |
| 弱化/占位 | `--ink-muted` | `#8C857B` | 分组标题、序号、时间戳、图标默认态 |
| Placeholder | — | `#A8A29E` | 输入框占位提示文本 |

### 边框与分割线（Borders）
| 用途 | CSS 变量 | 色值 | 常见场景 |
| :--- | :--- | :--- | :--- |
| 常规分割线 | `--border-subtle` | `#E2DDD3` | 区块/列表 `divide-[#E2DDD3]`、侧栏边界、容器边框 |
| 表单与次要按钮边框 | — | `#D5CFC3` | 输入框、次要按钮、虚线空状态框 |
| 强调边框 / 虚线框 | `--border-strong` | `#CFC8BA` | 拖拽上传区边框、Checkbox 边框、悬停态边框 |
| 页头底线 | — | `border-[#181816]/15` | 所有工作台页面 Masthead 底部通栏线 |

### 品牌强调色与语义状态色（Accents & Semantic）
| 语义 | 主色 | 悬停 / 深色 | 浅底 / 边框 | 用途 |
| :--- | :--- | :--- | :--- | :--- |
| **主品牌（松柏墨绿）** | `#1B4D3E` | `#143A2F` | 底 `#E9F0ED` / 边 `#1B4D3E]/25` | 主按钮、激活态、发布通过、链接、文字选区 (`selection:bg-[#1B4D3E]/15`) |
| **人文点缀（陶土红）** | `#B85D3B` | `#9A4A22` | 底 `#FBF3EC` | 爆款指标、待处理计数、品牌圆点、次级高亮 |
| **错误 / 高危** | `#B42318` | — | 底 `#FDF2F2` / 边 `#F3D0CE` | 错误横幅、隐私风险提示、表单校验失败 |
| **成功 / 通过** | `#1B4D3E` | — | 底 `#E9F0ED` | 与主品牌绿统一，不额外引入高饱和荧光绿 |
| **警告 / 过期** | `#9A4A22` | — | 底 `#FBF3EC` / 边 `#E2DDD3` | 审查过期提示、轻度提醒（优先暖陶土系） |

---

## 3. 排版规范（Typography）

- **字体族**：
  - 正文无衬线：`--font-sans`（Geist + PingFang SC / Hiragino Sans GB / Microsoft YaHei）
  - 编辑风衬线：`.font-editorial`（Songti SC / STSong / Noto Serif SC / Source Han Serif SC / Georgia）
  - 等宽数据：`font-mono`（Geist Mono + monospace），**所有数字指标、日期、计数必须附加 `tabular-nums`**。
- **字号层级**：
  - **页面主标题（Masthead H1）**：`font-editorial text-2xl font-semibold tracking-tight text-[#181816]`（登录页用 `text-[28px]`）
  - **区块标题（H2）**：`font-editorial text-base font-semibold text-[#181816]`
  - **列表项标题（H3）**：`font-editorial text-[15px] font-semibold text-[#181816]`
  - **巨幅主指标**：`font-editorial text-[52px] font-semibold leading-none tracking-tight text-[#181816] tabular-nums`
  - **次级指标**：`font-editorial text-xl font-semibold text-[#181816] tabular-nums`
  - **页头副标题 / 表单标签 / 按钮**：`text-xs`（12px），按钮与标签加 `font-medium`
  - **元信息 / 徽章 / 分组眉标**：`text-[11px]` 或 `text-[10px] tracking-[0.14em] text-[#8C857B]`

---

## 4. 布局与页面骨架（Layout Architecture）

- **应用外壳（AppShell）**：
  - 左侧固定编辑导轨（Desktop Editorial Rail）：展开 `228px` / 收起 `64px`，`bg-[#EFECE4]/75 border-r border-[#E2DDD3]`；激活项为 `#FCFBF8` 浮块 + 左侧 `3px` 墨绿竖条（spine）。
  - 主视口容器：`mx-auto w-full max-w-[1280px] flex-1 px-6 py-7 sm:px-9 lg:px-12 lg:py-9`（窄表单页如设置页可用 `max-w-4xl`）。
- **页面标准结构**：
  1. **Editorial Masthead（页头）**：`border-b border-[#181816]/15 pb-5`，左侧 `h1` + 一行 `text-xs text-[#78716C]` 副标题，右侧放 Segmented 切换器、搜索框或主/次操作按钮。
  2. **非对称栅格或通栏条带**：使用 `grid-cols-12` + `lg:divide-x lg:divide-[#E2DDD3]`（如 4:8、6:6、4:8 设置条带），垂直间距 `space-y-8` 或 `space-y-10`。
  3. **发丝台账列表（Hairline Ledger）**：`divide-y divide-[#E2DDD3] border-y border-[#E2DDD3]`，每行左侧配两位等宽序号（`01`、`02`），悬停轻亮 `hover:bg-[#FCFBF8]/70`。
- **辅助纹理**：仅在图片画布/样本预览等工作台区域使用 `.studio-grid-light` 或 `.studio-grid-dark`（24px 极淡网格）。

---

## 5. 交互组件与图表约定

- **主按钮**：`rounded bg-[#1B4D3E] px-4 py-2 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]`
- **次按钮**：`rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3.5 py-2 text-xs font-medium text-[#181816] transition hover:border-[#181816]`
- **Segmented 切换器**：外槽 `rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5`，激活项 `rounded-[3px] bg-[#FCFBF8] text-[#181816]`（带动画时可配 `layoutId` 药丸）。
- **输入框**：`rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]`
- **图标库**：统一使用 `lucide-react`，按钮内图标 `h-3.5 w-3.5`，导航/表单图标 `h-4 w-4`。
- **ECharts 图表**：通过 `EChartBox` 渲染，Tooltip 底色 `#FCFBF8` + 边框 `#E2DDD3`，网格虚线 `#EAE5DC`，轴线 `#DDD7CA`，系列色依次为墨绿 `#1B4D3E`、陶土红 `#B85D3B`、暖灰 `#A8A29E`（虚线）。
- **动效参数**：
  - 路由/视图切换缓动：`[0.22, 1, 0.36, 1]`（`0.22s`）或 `[0.16, 1, 0.3, 1]`（`0.18s–0.28s`）
  - 共享滑块（`layoutId`）：Spring `stiffness: 480–520, damping: 36, mass: 0.8`

---

## 6. 严禁事项（Anti-Patterns）

代码库中存在少量早期遗留样式，**在新建或修改任何 UI 时严禁复用以下旧风格**：
- ❌ **禁止冷蓝色主色**：不要使用 `#1D4ED8`、`#1E40AF`、`#3451E5`、`blue-*`、`indigo-*` 作为按钮、聚焦框或链接主色（统一用 `#1B4D3E`）。
- ❌ **禁止冷灰中性色**：不要使用 `#F8F9FB`、`#0F172A`、`#E4E7EC`、`#F1F3F6` 或 Tailwind 默认 `slate-*` / `gray-*`（统一用暖纸色阶 `#F6F4EF` / `#FCFBF8` / `#EFECE4` / `#E2DDD3` / `#181816` / `#57534E` / `#78716C` / `#8C857B`）。
- ❌ **禁止滥用卡片与重阴影**：不要给常规统计项、列表项或图表外层套 `rounded-2xl bg-white shadow-md`。
- ❌ **禁止缺失 `tabular-nums`**：数字统计、时间、序号、百分比必须使用 `tabular-nums` 防止跳动。

---

## 7. 交付前视觉自检清单

- [ ] 页面底色与区域分割是否基于 `#F6F4EF` + `1px` `#E2DDD3` 发丝线，而非堆砌阴影卡片？
- [ ] 页头是否遵循 Masthead 规范（`.font-editorial text-2xl` + `border-b border-[#181816]/15`）？
- [ ] 所有主操作、聚焦态（`focus:border-[#1B4D3E]`）、激活态是否统一为松柏墨绿 `#1B4D3E`？
- [ ] 是否清除了所有 `slate-*`、`#0F172A`、`#1D4ED8` 等冷色调残留？
- [ ] 数字与表格/台账列是否添加 `font-mono tabular-nums`？
- [ ] 移动端与桌面端（`lg:` 断点）栅格分割线（`lg:divide-x`）是否正常降级为垂直间距？
