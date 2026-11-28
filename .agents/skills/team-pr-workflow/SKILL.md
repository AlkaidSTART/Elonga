---
name: team-pr-workflow
description: >-
  面向零基础成员的团队 GitHub 协作与提 PR 全流程技能。
  当用户开始开发新功能、修复 Bug、修改页面/文案，或要求提交代码、推送分支、发起 GitHub Pull Request（PR）时加载并遵循本技能。
  自动完成：同步最新 main 并开独立分支 -> 开发完成后运行 pnpm lint / pnpm build / 测试 -> 根据实际改动 commit 并 push -> 向远程仓库提交 PR。
---

# 团队协作与 GitHub 提 PR 流程（小白友好版）

本技能帮助不熟悉 Git / GitHub 命令的成员安全、规范地参与项目协作。Agent 应主动接管所有 Git 与 PR 操作，用通俗中文告知当前进度，**避免要求用户手动输入复杂命令**。

## 核心安全守则

1. **严禁直接向 `main` 分支提交或推送代码**：所有改动必须在独立的功能分支上完成，并通过 PR 合入 `main`。
2. **一任务一独立分支（跨轮次不复用旧分支）**：完成一个功能/任务后，即使仍在同一个对话窗口中，下一轮对话开始新的任务时，也**必须重新同步最新 `main` 并新建一个独立分支**来开发，避免把多个任务混在同一个分支或 PR 中。
3. **冲突处理以远程分支为主**：当当前本地分支与远程分支（`main` 或远程同名分支）发生合并/变基冲突时，**必须以远程分支的改动为主**，在保留远程最新代码的前提下修复和适配当前分支的变更，绝不覆盖团队成员已合入的远程代码。
4. **严禁未经说明执行破坏性命令**：不要随意执行 `git reset --hard`、`git push --force`、`git clean -fd` 等可能丢失用户未保存改动的操作。
5. **不提交敏感或临时文件**：提交前检查 `git status`，避免误提交 `.env`、`.env.local`、私钥、`.DS_Store` 等文件。
6. **小白友好沟通**：每个阶段用 1–2 句白话同步状态（例如“正在同步最新代码并创建分支 `feat/xxx`”），遇到需要登录 GitHub 等人工操作时，给出可直接复制执行的单行指引。

---

## 标准四步协作流程

### 第 1 步：开分支与同步最新 `main`（每次新任务开始前）

在动手修改任何业务代码之前，先检查当前仓库状态并确保基于最新 `main` 创建独立分支：

1. **检查当前分支与远程仓库**：
   ```bash
   git status --short
   git branch --show-current
   git remote -v
   ```
   - 确认基准远程仓库 `<base_remote>`：若存在 `upstream`（Fork 协作模式），以 `upstream` 为基准；否则以 `origin` 为基准。
   - **判断何时开新分支**：
     - 如果当前在 `main` 分支，必须新建分支。
     - **即使在同一个对话窗口中**：一旦上一轮功能/任务已经完成（尤其是已经提交并创建 PR 后），下一轮对话开始新的需求、Bug 修复或文档/配置改动时，**必须重新执行 `git fetch <base_remote> main` 并新建一个独立分支**，不得继续在上一轮任务的旧分支上干活。
     - 仅当用户仍在对**当前分支同一个未完结任务**进行补充或根据该分支 PR 的 Review 意见修改时，才保留在当前分支。

2. **安全处理未提交改动（如有）**：
   - 若当前在 `main` 且工作区有未提交改动，先暂存：`git stash push -u -m "wip-before-branch"`，建完新分支后再 `git stash pop` 恢复。

3. **同步最新 `main` 并新建分支**：
   ```bash
   git fetch <base_remote> main
   git checkout -b <type>/<short-slug> <base_remote>/main
   ```
   - **分支命名规范**（全小写、短横线连接）：
     - 新功能：`feat/<简短英文描述>`（如 `feat/export-report`）
     - 修 Bug：`fix/<简短英文描述>`（如 `fix/login-redirect`）
     - 样式/UI 调整：`style/<简短英文描述>`
     - 文档/杂项：`docs/<...>`、`chore/<...>`、`refactor/<...>`

4. **验证**：执行 `git branch --show-current && git log -1 --oneline`，确认已切换到新分支且基线是最新的 `main`。

---

### 第 2 步：运行检查与测试（每次对话完成代码修改后自动执行）

在完成本轮代码修改后、提交之前，**自动执行以下校验**，确保代码可直接合入：

1. **检查代码规范**：
   ```bash
   pnpm lint
   ```
2. **检查生产构建与类型**：
   ```bash
   pnpm build
   ```
3. **运行测试代码**：
   - 先查看 `package.json` 中的 `scripts`：
     - 如果存在 `test`、`test:unit`、`test:e2e`、`typecheck` 等脚本，按需运行（如 `pnpm test`）。
     - 如果本轮任务新增或修改了独立测试脚本/测试用例，也一并运行验证。
     - 如果项目暂未配置 `test` 脚本，确保 `pnpm lint` 与 `pnpm build`（含 Next.js TypeScript 校验）全部通过，并在最终汇报中说明即可。

4. **失败处理**：
   - 任何一项失败时，**禁止提交和推送**。
   - 自动阅读报错日志并修复问题，修复后重新运行失败的检查，直到全部通过。

---

### 第 3 步：根据实际更改提交并推送到远程分支

所有检查通过后，执行本地提交与远程推送：

1. **二次确认分支安全**：
   - 执行 `git branch --show-current`，确认**不是 `main`**。如果意外处于 `main`，立刻执行 `git checkout -b <type>/<short-slug>` 切出新分支。

2. **审查实际改动**：
   ```bash
   git status --short
   git diff --stat
   ```
   - 结合 `git diff` 核对变更内容，确认没有混入无关文件或敏感配置（如 `.env*`）。

3. **暂存并生成规范的 Commit 信息**：
   - 按实际更改暂存文件（如 `git add -A`，或按需指定文件）。
   - 采用 Conventional Commits 风格 + 简洁中文说明，格式为 `<type>: <简明改动说明>`（例如 `feat: 新增素材批量导出功能`、`fix: 修复侧边栏折叠后标题错位`）。
   - 执行提交：
     ```bash
     git commit -m "<type>: <简明改动说明>"
     ```

4. **推送到远程仓库新建分支**：
   ```bash
   git push -u origin <branch-name>
   ```
   - **若推送失败或出现合并冲突**：
     - 权限/登录问题：提示用户终端运行 `gh auth login`（选择 GitHub.com -> HTTPS -> 浏览器登录），完成后继续。
     - 远端同分支或 `main` 有新提交并产生冲突：
       1. 先拉取并同步远程分支最新变更（例如 `git fetch <base_remote> main && git merge <base_remote>/main`，或与远端同名分支同步 `git fetch origin <branch-name> && git merge origin/<branch-name>`）。
       2. **冲突解决原则（以远程分支为主，修当前分支）**：凡是冲突区块，优先完整保留远程分支的最新实现与结构，再将当前分支的新增/修复逻辑适配并融合上去，**严禁用本地旧代码覆盖远程分支的变更**。
       3. 冲突解决完成后，**必须重新执行第 2 步的检查与测试**（`pnpm lint`、`pnpm build`、`pnpm test`），全部通过后再提交并推送到当前分支。

---

### 第 4 步：向原远程仓库提交 PR

代码推送成功后，自动发起 Pull Request：

1. **检查 GitHub CLI (`gh`) 状态**：
   ```bash
   gh auth status
   ```

2. **检查当前分支是否已有 PR**：
   ```bash
   gh pr view --json url,state 2>/dev/null || true
   ```
   - 如果已存在 `OPEN` 状态的 PR：说明本次 `git push` 已自动更新该 PR，直接把 PR 链接发给用户即可，无需重复创建。

3. **基于实际改动自动生成 PR 标题与说明并创建**：
   - 查看本分支相对 `main` 的提交与文件变更统计：
     ```bash
     git log <base_remote>/main..HEAD --oneline
     git diff --stat <base_remote>/main..HEAD
     ```
   - 使用 `gh pr create` 创建 PR（如果是 Fork 仓库，加上 `--repo <上游owner/repo>`）：
     ```bash
     gh pr create --base main \
       --title "<type>: <清晰的 PR 标题>" \
       --body "$(cat <<'EOF'
     ## 改动概述
     - <用 1-2 句话说明本次做了什么、解决了什么问题>

     ## 主要变更
     - <按模块或文件列出核心修改点>

     ## 验证结果
     - [x] `pnpm lint` 通过
     - [x] `pnpm build` 通过
     - [x] 相关测试已运行通过（或注明当前项目无额外测试脚本）
     EOF
     )"
     ```

4. **降级方案（未安装 `gh` 或未登录时）**：
   - 引导用户完成一次登录（`gh auth login`）后再由 Agent 自动创建；
   - 或直接根据 `git remote get-url <base_remote>` 拼出 GitHub 网页快捷提 PR 链接：
     `https://github.com/<owner>/<repo>/compare/main...<branch-name>?expand=1`
     并把写好的 PR 标题和正文直接展示给用户复制粘贴。

---

## 完成后的汇报模板

流程全部结束后，用简洁友好的中文向用户总结：
- **分支名称**：`<branch-name>`（已同步最新 `main`）
- **检查结果**：`pnpm lint`、`pnpm build` 及测试状态
- **提交记录**：Commit 信息与改动文件摘要
- **PR 链接**：可直接点击查看的 GitHub PR URL，并提示“如果团队 Review 后需要修改，直接告诉我即可，我会继续在这个分支上修改并自动更新这个 PR”。
