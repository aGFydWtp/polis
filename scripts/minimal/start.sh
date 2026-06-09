#!/bin/bash
# Polis 最小構成: アプリの再起動 / 更新を手動で行う運用スクリプト。
#
# 使い方:
#   SSM Session Manager で EC2 に接続し、root で実行する。
#     sudo AWS_REGION=us-east-1 bash /opt/polis/polis/scripts/minimal/start.sh
#
# UserData(初回起動)と同じ手順を冪等に再実行する。コード更新・.env更新・再ビルドに使う。
set -xeuo pipefail

REGION="${AWS_REGION:-us-east-1}"
ENV_SECRET="${ENV_SECRET_NAME:-polis-web-app-env-vars}"
APP_DIR="${APP_DIR:-/opt/polis/polis}"
COMPOSE_FILE="docker-compose.prod.yml"

cd "$APP_DIR"

# データEBSがマウントされているか確認（postgres の永続先）
if ! mountpoint -q /mnt/polis-data; then
  echo "ERROR: /mnt/polis-data is not mounted. Check the data EBS attachment." >&2
  exit 1
fi
mkdir -p /mnt/polis-data/postgres

# 最新コードを取得（ff-only。コンフリクト時は手動対応）
git pull --ff-only || echo "WARN: git pull skipped/failed; continuing with current code"

# .env を Secrets Manager から再取得
aws secretsmanager get-secret-value \
  --secret-id "$ENV_SECRET" \
  --query SecretString --output text --region "$REGION" > .env

if ! grep -q '^DATABASE_URL=' .env; then
  echo "ERROR: DATABASE_URL is missing in the env secret ($ENV_SECRET)." >&2
  echo "       e.g. DATABASE_URL=postgres://postgres:<PASS>@postgres:5432/<DB>" >&2
  exit 1
fi

# 再ビルド & 起動
docker compose -f "$COMPOSE_FILE" up -d --build
docker compose -f "$COMPOSE_FILE" ps
