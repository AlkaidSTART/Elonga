
## 项目约束（Elonga）

本项目基于 Next.js 16、React 19、TypeScript、Tailwind CSS v4 与 `pnpm` 构建。在仓库内进行任何开发与修改时，必须严格遵守以下约束：

### 1. 重构原则（最小重构）
- **禁止大规模重构**：不得提出或执行大范围架构重写、跨模块大改或无关代码清理。
- **遵循最小重构原则**：所有改动应聚焦当前任务目标，尽量缩小变更范围（Minimal Diff），保持现有目录结构、公共接口与无关逻辑稳定。

### 2. 团队协作与提 PR
- 凡涉及工作区改动、提交代码、推送分支或发起 Pull Request，**必须加载并遵循仓库内技能** `.agents/skills/team-pr-workflow/SKILL.md`（`team-pr-workflow`）。
- 严禁直接向 `main` 分支提交或推送；统一按技能流程同步最新 `main` -> 新建独立分支 -> 校验通过 -> 提交并推送 -> 发起 PR。

### 3. UI 视觉规范
- 凡涉及页面新建、组件重构、样式调整、弹窗/表单/图表设计等 UI 改动，**必须先加载并严格遵循仓库内 UI 风格文档** `.agents/skills/elonga-ui-style/SKILL.md`（`elonga-ui-style`）及组件配方 `.agents/skills/elonga-ui-style/references/component-recipes.md`。
- 保持 Elonga「Warm Editorial Studio（暖纸编辑工坊）」的色值、字体、1px 分割线与交互细节一致，不得随意引入脱离规范的卡片阴影或第三方配色。

### 4. 测试与代码规范（提交前门禁）
- **补充对应测试**：每次完成功能开发或 Bug 修复后，必须为本次改动补充对应的测试文件并运行通过。
- **检查语法与代码风格**：
  - 遵循仓库现有代码风格与 `eslint.config.mjs`、`tsconfig.json`（`strict: true`）约束：**2 空格缩进**、双引号、保留分号、保持与周边文件格式一致。
  - 执行 `pnpm lint`、`pnpm build` 及对应的测试命令，检查语法、类型与构建状态。
- **全部通过方可提交**：仅在测试、语法检查、代码风格检查与构建**全部通过**后，才允许执行提交并发起 PR。
