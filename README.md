# Elonga — 简悦内容推流与视觉创作台

Elonga 是一款面向公益机构与内容团队的一体化新媒体创作与协作工作台，聚焦**多平台推流文案生成、发布前隐私脱敏与合规审查、图片智能打码与二维风格化、机构活动台账管理以及运营月报自动化生成**。

所有 AI 能力均支持**无 API Key 本地降级模式**，无需额外配置即可开箱体验完整工作流；配置大模型 API 后可无缝切换为云端 AI 增强模式。

---

## 核心功能

### 1. 内容创作工作流（`/workflow`）

- **多平台适配**：支持 **抖音、今日头条、小红书、微信公众号** 四大平台，针对各平台算法特征提供推荐字数、黄金开头钩子、排版策略与互动引导建议。
- **三段式 Skill 协作链路**：
  1. `douyin-trend-research` — 平台爆款趋势调研，提炼热门关键词与爆款开头钩子；
  2. `charity-copywriting` — 结合公益场景（公益故事 / 活动倡议 / 公益科普）、语气风格、篇幅及机构活动上下文生成标题与正文；
  3. `traffic-optimizer` — 融合推流标签并执行合规性校验，完整记录各 Skill 执行耗时与摘要。
- **文本脱敏与发布前合规审查**：自动扫描正文中的姓名、住址、联系方式、证件/编号、学校/医院等敏感隐私实体并支持一键替换脱敏；同步提取金额、人数、物资数量、日期等关键事实与风险项进行发布前核验。
- **图文混排与多格式导出**：支持为稿件批量上传配图并一键执行打码/风格化，自动进行图文混排，支持导出为 **Word（`.docx`）**、**Markdown（`.md`）** 和 **PDF**。

### 2. 图片工坊（`/image-studio`）

- **智能隐私打码与手工精修**：支持人脸、敏感文本、二维码/条形码的自动检测（支持配置 Vision 大模型识别，未配置时自动降级为本地检测），基于 Canvas 与 StackBlur 提供马赛克/高斯模糊区域打码与手动涂抹编辑。
- **二维风格化转换**：内置 **日漫（`anime`）**、**绘本（`ghibli`）**、**扁平（`cel`）**、**水彩（`watercolor`）** 四种风格预设，支持自定义风格提示词；配置图像模型后调用云端图像编辑接口，未配置时自动使用本地 Canvas 算法处理。

### 3. 工作台概览与运营月报（`/`、`/reports`）

- **数据看板**：汇总机构内容创作量、审校通过率、发布与归档数据及各平台互动表现，集成 ECharts 可视化图表。
- **运营月报生成**：基于指定月份的活动档案与发布归档数据，一键生成「内部团队复盘月报」或「面向资助方/理事会的对外公益月报」，支持 AI 撰写与本地结构化模板降级。

### 4. 机构中心与创作记录（`/organization`、`/history`）

- **机构中心**：维护机构基本信息、使命愿景、合规词库及公益活动台账（时间、地点、参与人数、物资/资金、活动亮点），供内容创作与月报直接引用。
- **创作记录**：管理历史稿件，支持标记已发布/爆款、回填平台发布链接与阅读/点赞/评论/转发数据并归档，内置各大平台创作者后台快捷入口。

### 5. 模型配置、个人中心与鉴权（`/settings`、`/profile`、`/login`）

- **可视化模型配置**：支持在界面内配置文本大模型与图像大模型的 `Base URL`、`API Key` 与模型名称。
- **会话鉴权**：基于 HTTP-only Cookie + JWT 实现登录态校验，通过 `proxy.ts` 保护页面与受保护 API 路由；支持修改个人资料与密码。

---

## 技术栈

| 类别               | 技术选型                                                   |
| ------------------ | ---------------------------------------------------------- |
| 应用框架           | Next.js `16.4.6`（App Router、Standalone 输出、Turbopack） |
| 前端基础           | React `19.3.0`、TypeScript `5`、Tailwind CSS `4.3.3`       |
| 状态管理           | Zustand `5.1.0`（支持浏览器 `localStorage` 持久化）        |
| 动效与图标         | Framer Motion `14.14.0`、Lucide React `1.77.0`             |
| 图表 / 文档 / 图像 | ECharts `6.1.0`、`docx` `9.16.0`、StackBlur Canvas `3.0.1` |
| 运行环境与包管理   | Node.js `22+`、`pnpm@11.17.0`                              |
| 容器化与数据库     | Docker、Docker Compose、MySQL `8.0`                        |

---

## 快速开始

### 方式一：本地开发运行

确保本地已安装 **Node.js 22+** 与 **pnpm**（可通过 `corepack enable` 启用）。

```bash
# 1. 安装依赖
pnpm install

# 2. （可选）创建环境变量文件并按需填写 AI 模型或密码配置
cp .env.example .env

# 3. 启动开发服务器
pnpm dev
```

启动后访问：<http://localhost:3000>

### 方式二：Docker Compose 一键启动

项目提供了 `Dockerfile`、`docker-compose.yml` 与一键运维脚本 `start.sh`，自动编排 **MySQL 8.0** 与 **Next.js Standalone 应用容器**。

```bash
# 首次运行将自动从 .env.example 生成 .env（并随机生成 JWT_SECRET），构建并启动服务
./start.sh
```

`start.sh` 常用命令：

```bash
./start.sh up          # 构建并后台启动 MySQL 与应用服务（默认命令）
./start.sh -b          # 无缓存强制重新构建应用镜像并启动
./start.sh -l          # 启动完成后持续跟踪容器日志
./start.sh status      # 查看容器运行状态
./start.sh logs        # 持续查看服务日志
./start.sh restart     # 重启全部服务
./start.sh stop        # 停止并移除容器（保留 MySQL 数据卷）
./start.sh clean       # 停止服务并清空 MySQL 数据卷（高危操作，会二次确认）
```

---

## 默认登录账号

系统内置两个演示账号（支持用户名或邮箱登录，初始密码可通过环境变量覆盖）：

| 角色            | 用户名   | 邮箱               | 默认密码     | 对应环境变量           |
| --------------- | -------- | ------------------ | ------------ | ---------------------- |
| 主理人 / 管理员 | `admin`  | `admin@elonga.cn`  | `elonga2026` | `AUTH_ADMIN_PASSWORD`  |
| 内容运营        | `editor` | `editor@elonga.cn` | `editor2026` | `AUTH_EDITOR_PASSWORD` |

---

## 环境变量说明

完整模板见 [`.env.example`](./.env.example)。所有 AI 相关环境变量均为**可选项**，也可以在前端「模型配置（`/settings`）」页面中动态填写（前端配置优先级高于服务端环境变量）。

| 变量名                                                 | 默认值                                     | 说明                                                   |
| ------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------ |
| `APP_PORT`                                             | `3000`                                     | 应用对外暴露端口                                       |
| `MYSQL_PORT`                                           | `3306`                                     | MySQL 宿主机映射端口                                   |
| `MYSQL_DATABASE`                                       | `elonga`                                   | MySQL 数据库名                                         |
| `MYSQL_USER` / `MYSQL_PASSWORD`                        | `elonga` / `elonga_pass_2026`              | MySQL 应用连接账号与密码                               |
| `MYSQL_ROOT_PASSWORD`                                  | `elonga_root_2026`                         | MySQL root 密码                                        |
| `JWT_SECRET`                                           | —                                          | JWT 会话签名密钥（生产环境务必使用 32 位以上随机串）   |
| `AUTH_COOKIE_SECURE`                                   | `false`                                    | 本地 HTTP 保持 `false`；HTTPS 部署建议设为 `true`      |
| `AUTH_ADMIN_PASSWORD`                                  | `elonga2026`                               | `admin` 账号初始密码                                   |
| `AUTH_EDITOR_PASSWORD`                                 | `editor2026`                               | `editor` 账号初始密码                                  |
| `DEEPSEEK_API_KEY` / `TEXT_API_KEY` / `OPENAI_API_KEY` | —                                          | 文本大模型 API Key（用于文案生成、趋势分析与月报撰写） |
| `DEEPSEEK_BASE_URL` / `TEXT_BASE_URL`                  | `https://api.deepseek.com/v1`              | 文本大模型 OpenAI 兼容接口地址                         |
| `DEEPSEEK_MODEL`                                       | `deepseek-chat`                            | 文本大模型名称                                         |
| `IMAGE_API_KEY` / `ARK_API_KEY`                        | —                                          | 图像大模型 API Key（用于图片二维风格化）               |
| `IMAGE_BASE_URL` / `ARK_BASE_URL`                      | `https://ark.cn-beijing.volces.com/api/v3` | 图像编辑接口地址                                       |
| `IMAGE_MODEL`                                          | `doubao-seedream-3-0-t2i-250415`           | 图像模型名称                                           |
| `VISION_API_KEY`                                       | —                                          | 多模态视觉模型 API Key（用于敏感区域自动识别打码）     |
| `VISION_BASE_URL`                                      | `https://api.openai.com/v1`                | 视觉模型接口地址                                       |
| `VISION_MODEL`                                         | `gpt-4o-mini`                              | 视觉模型名称                                           |
| `DOUYIN_TRENDS_API_URL` / `DOUYIN_TRENDS_API_KEY`      | —                                          | 可选的外部热点趋势数据源接口与密钥                     |

---

## 项目结构

```text
elonga/
├── app/
│   ├── (workspace)/              # 鉴权后的主工作台页面
│   │   ├── page.tsx              # 工作台概览 (/)
│   │   ├── reports/              # 运营月报 (/reports)
│   │   ├── workflow/             # 内容创作工作流 (/workflow)
│   │   ├── image-studio/         # 图片工坊 (/image-studio)
│   │   ├── organization/         # 机构中心 (/organization)
│   │   ├── history/              # 创作记录 (/history)
│   │   ├── settings/             # 模型配置 (/settings)
│   │   └── profile/              # 个人中心 (/profile)
│   ├── login/                    # 登录页 (/login)
│   └── api/                      # Next.js Route Handlers
│       ├── auth/                 # login / logout / me / profile / password
│       ├── copywriting/          # 文案多 Skill 协同生成接口
│       ├── douyin-trends/        # 平台爆款趋势调研接口
│       ├── skills/               # 已注册 Skill 列表查询
│       ├── auto-redact/          # 图像敏感区域 AI 识别接口
│       ├── stylize-2d/           # 图像二维风格化接口
│       ├── monthly-report/       # 运营月报生成接口
│       └── health/               # 服务健康检查 (/api/health)
├── components/                   # 按业务域划分的前端组件
├── lib/
│   ├── auth/                     # JWT 签名校验、会话管理与用户校验
│   ├── skills/                   # 趋势调研、公益文案、推流合规三大 Skill
│   ├── platforms.ts              # 四大平台规范与内容元信息
│   ├── text-redaction.ts         # 文本隐私实体扫描与脱敏
│   ├── publish-review.ts         # 发布前合规与事实核验引擎
│   ├── document-exporter.ts      # 图文混排与 DOCX / Markdown / PDF 导出
│   ├── auto-redact.ts            # 本地隐私区域检测
│   ├── mosaic-canvas.ts          # Canvas 马赛克/模糊打码引擎
│   └── stylize-2d-canvas.ts      # 本地二维风格化渲染引擎
├── store/                        # Zustand 状态管理与持久化 Store
├── docker/mysql/init.sql         # MySQL 8.0 初始化表结构与种子数据
├── proxy.ts                      # 全局鉴权与路由代理守卫
├── Dockerfile                    # 多阶段构建生产镜像
├── docker-compose.yml            # MySQL + 应用容器编排配置
└── start.sh                      # Docker Compose 一键启停与运维脚本
```

---

## 常用脚本

```bash
pnpm dev      # 启动本地开发服务器
pnpm build    # 构建生产包（standalone 输出）
pnpm start    # 启动生产服务
pnpm lint     # 运行 ESLint 代码检查
```

---

## 存储与架构说明

- **前端状态持久化**：当前版本中，创作记录、机构资料、活动台账、月报与模型配置通过 Zustand 持久化存储于浏览器 `localStorage`；登录用户信息与密码修改保存在服务端进程内存中（重启后恢复为环境变量默认值）。
- **数据库预置**：Docker Compose 已预置 MySQL 8.0 服务及基础表结构（见 [`docker/mysql/init.sql`](./docker/mysql/init.sql)，包含 `organizations`、`users`、`publish_records`、`monthly_reports` 表），便于后续平滑接入服务端持久化存储。
