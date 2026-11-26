#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { printf "${BLUE}[INFO]${NC} %s\n" "$*"; }
log_ok()    { printf "${GREEN}[OK]${NC} %s\n" "$*"; }
log_warn()  { printf "${YELLOW}[WARN]${NC} %s\n" "$*"; }
log_error() { printf "${RED}[ERROR]${NC} %s\n" "$*" >&2; }

# Detect Docker Compose command
detect_compose() {
  if ! command -v docker >/dev/null 2>&1; then
    log_error "未检测到 docker，请先安装 Docker Desktop 或 Docker Engine。"
    exit 1
  fi

  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  else
    log_error "未检测到 docker compose 插件，请安装 Docker Compose v2。"
    exit 1
  fi
}

check_docker_daemon() {
  if ! docker info >/dev/null 2>&1; then
    log_error "Docker 服务未启动，请先启动 Docker Desktop / Docker Daemon 后重试。"
    exit 1
  fi
}

ensure_env_file() {
  if [[ ! -f .env ]]; then
    if [[ -f .env.example ]]; then
      cp .env.example .env
      # Generate a random JWT_SECRET when creating .env for the first time
      if command -v openssl >/dev/null 2>&1; then
        local random_secret
        random_secret="$(openssl rand -hex 32)"
        if [[ "$(uname -s)" == "Darwin" ]]; then
          sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=${random_secret}|" .env
        else
          sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${random_secret}|" .env
        fi
      fi
      log_ok "已从 .env.example 自动生成 .env 配置文件（已自动生成随机 JWT_SECRET）。"
    else
      log_warn "未找到 .env.example，将使用 docker-compose.yml 中的默认环境变量。"
    fi
  fi
}

load_env_defaults() {
  APP_PORT="3000"
  MYSQL_PORT="3306"
  MYSQL_DATABASE="elonga"
  MYSQL_USER="elonga"
  if [[ -f .env ]]; then
    while IFS='=' read -r key value; do
      [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
      value="${value%$'\r'}"
      case "$key" in
        APP_PORT)       [[ -n "$value" ]] && APP_PORT="$value" ;;
        MYSQL_PORT)     [[ -n "$value" ]] && MYSQL_PORT="$value" ;;
        MYSQL_DATABASE) [[ -n "$value" ]] && MYSQL_DATABASE="$value" ;;
        MYSQL_USER)     [[ -n "$value" ]] && MYSQL_USER="$value" ;;
      esac
    done < .env
  fi
}

wait_for_health() {
  local url="http://127.0.0.1:${APP_PORT}/api/health"
  local max_attempts=60
  local attempt=1

  log_info "等待 MySQL 与应用服务就绪..."
  while [[ $attempt -le $max_attempts ]]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log_ok "应用健康检查通过：${url}"
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done

  log_warn "等待超时（120s），请运行 ./start.sh logs 查看容器日志。"
  return 1
}

print_summary() {
  echo ""
  echo "=========================================="
  echo "  Elonga 服务已启动"
  echo "=========================================="
  echo "  应用地址:   http://localhost:${APP_PORT}"
  echo "  健康检查:   http://localhost:${APP_PORT}/api/health"
  echo "  MySQL 连接: 127.0.0.1:${MYSQL_PORT} (DB: ${MYSQL_DATABASE}, User: ${MYSQL_USER})"
  echo "  默认账号:   admin / elonga2026  或  editor / editor2026"
  echo "------------------------------------------"
  echo "  查看日志:   ./start.sh logs"
  echo "  查看状态:   ./start.sh status"
  echo "  停止服务:   ./start.sh stop"
  echo "=========================================="
}

usage() {
  cat <<'EOF'
用法: ./start.sh [命令|选项]

命令:
  up (默认)      一键构建并后台启动 MySQL 与应用服务
  stop / down    停止并移除容器（保留 MySQL 数据卷）
  restart        重启全部服务
  logs           持续查看服务日志
  status         查看容器运行状态
  clean          停止服务并清空 MySQL 数据卷（会删除数据库数据）
  help           显示帮助信息

选项（用于默认启动）:
  -b, --build    强制重新构建应用镜像（不使用缓存）
  -l, --logs     启动完成后自动跟踪日志输出
EOF
}

main() {
  local action="up"
  local force_rebuild=false
  local follow_logs=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      up|stop|down|restart|logs|status|clean|help)
        action="$1"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      -b|--build)
        force_rebuild=true
        shift
        ;;
      -l|--logs)
        follow_logs=true
        shift
        ;;
      *)
        log_error "未知参数: $1"
        usage
        exit 1
        ;;
    esac
  done

  if [[ "$action" == "help" ]]; then
    usage
    exit 0
  fi

  detect_compose
  check_docker_daemon

  case "$action" in
    stop|down)
      log_info "正在停止 Elonga 服务..."
      "${COMPOSE_CMD[@]}" down
      log_ok "服务已停止（MySQL 数据卷已保留）。"
      ;;
    restart)
      log_info "正在重启 Elonga 服务..."
      "${COMPOSE_CMD[@]}" restart
      log_ok "服务已重启。"
      ;;
    logs)
      "${COMPOSE_CMD[@]}" logs -f --tail=100
      ;;
    status)
      "${COMPOSE_CMD[@]}" ps
      ;;
    clean)
      log_warn "即将停止服务并删除 MySQL 数据卷（数据库数据将清空）！"
      read -r -p "确认继续？[y/N] " confirm
      if [[ "$confirm" =~ ^[Yy]$ ]]; then
        "${COMPOSE_CMD[@]}" down -v
        log_ok "已清理容器与数据卷。"
      else
        log_info "已取消清理操作。"
      fi
      ;;
    up)
      ensure_env_file
      load_env_defaults

      if [[ "$force_rebuild" == true ]]; then
        log_info "正在无缓存重新构建应用镜像..."
        "${COMPOSE_CMD[@]}" build --no-cache app
      fi

      log_info "正在启动 MySQL 与 Elonga 应用..."
      "${COMPOSE_CMD[@]}" up -d --build

      wait_for_health || true
      print_summary

      if [[ "$follow_logs" == true ]]; then
        "${COMPOSE_CMD[@]}" logs -f --tail=100
      fi
      ;;
  esac
}

main "$@"
