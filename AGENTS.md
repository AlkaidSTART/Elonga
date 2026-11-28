## Project Constraints (Elonga)

When developing or making any changes in this repository, you must strictly follow the technology stack and development constraints below:

### 0. Tech Stack Constraints (No Arbitrary Replacements or Unrelated Frameworks)

- **Core Framework**: `Next.js 16` (App Router) + `React 19` + `TypeScript 5` (`strict: true`)
- **Styling & Interaction**: `Tailwind CSS v4` + `framer-motion` (animations) + `lucide-react` (icons)
- **State Management**: `zustand`
- **Charts & Domain Libraries**: `echarts` (charts), `docx` (Word export), `stackblur-canvas` (canvas blur processing)
- **Package Manager & Tooling**: Use `pnpm` exclusively (never mix `npm` or `yarn` or generate other lockfiles); use `ESLint 9` (`eslint-config-next`) for linting
- **Selection Principle**: Strictly adhere to the existing tech stack and dependencies in this repository. Do **not** swap out core frameworks, state management, or styling solutions, or introduce overlapping third-party libraries. If a new dependency is genuinely needed, explain the reason to the user and get confirmation first.

### 1. Refactoring Principle (Minimal Refactoring)

- **No Large-Scale Refactoring**: Do not propose or perform sweeping architectural rewrites, broad cross-module overhauls, or unrelated code cleanups.
- **Follow Minimal Diff**: Keep all changes focused on the current task goal, minimize the scope of changes (Minimal Diff), and preserve the existing directory structure, public interfaces, and unrelated logic.

### 2. Team Collaboration & Pull Requests

- Whenever a task involves modifying the workspace, committing code, pushing a branch, or opening a Pull Request, you **must load and follow the repository skill** `.agents/skills/team-pr-workflow/SKILL.md` (`team-pr-workflow`).
- Never commit or push directly to the `main` branch. Always follow the skill workflow: sync latest `main` -> create a dedicated branch -> pass all checks -> commit and push -> open a PR.

### 3. UI Visual Guidelines

- Whenever a task involves UI changes—such as creating new pages, refactoring components, adjusting styles, or designing modals/forms/charts—you **must first load and strictly follow the repository UI style guide** `.agents/skills/elonga-ui-style/SKILL.md` (`elonga-ui-style`) and component recipes `.agents/skills/elonga-ui-style/references/component-recipes.md`.
- Maintain consistency with Elonga's "Warm Editorial Studio" palette, typography, 1px dividers, and interaction details. Do not introduce off-spec card shadows or third-party color schemes.

### 4. Testing & Code Style (Pre-Commit Gate)

- **Add Corresponding Tests**: After completing any feature or bug fix, you must add corresponding test files for the changes and ensure they pass.
- **Check Syntax & Code Style**:
  - Follow the repository's code style and the constraints in `eslint.config.mjs` and `tsconfig.json` (`strict: true`): **2-space indentation**, double quotes, semicolons, and formatting consistent with surrounding files.
  - Run `pnpm lint`, `pnpm build`, and the corresponding test commands (`pnpm test`) to verify syntax, types, and build status.
- **Pass Everything Before Committing**: Only commit and open a PR after all tests, syntax checks, style checks, and builds **pass completely**.

### 5. New Feature Admission Principle (No Pure Vibe Coding; Ship Deliverable Capabilities)

- **Clarify Before Building**: Before proposing or starting any new feature, you must confirm the following three points with the user:
  1. **What problem it solves**: Which specific business pain point or user scenario it addresses, and whether it is backed by a real need.
  2. **Whether it is feasible**: Whether the current tech stack, data sources, dependent services, and permissions can support it, and whether any blockers remain.
  3. **Whether it can be delivered cleanly**: Whether the acceptance criteria, edge cases, and end-to-end loop are clear so the final output is runnable, verifiable, and deliverable.
- **No Blind Vibe Coding**: Do not pile up flashy code, fake mock implementations, or half-baked features without requirements clarification and feasibility assessment. **Practical feasibility and reliable delivery** are the highest priorities.
