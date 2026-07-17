#!/bin/bash
# 最小コスト本番構成 (docker-compose.prod.yml) 用の localstack 初期化スクリプト。
# dev (bin/localstack-init) と異なり S3 も localstack で兼用するため、
# BYOD インポート用のキューとバケットを両方作成する。
# リージョンはコンテナの AWS_DEFAULT_REGION (compose が .env の AWS_REGION から注入) に従う。
# server/import-worker の署名リージョンと一致していないと QueueDoesNotExist になる。
echo "Initializing in region: ${AWS_DEFAULT_REGION:-us-east-1}"
awslocal sqs create-queue \
    --queue-name import-jobs-queue \
    --attributes '{"VisibilityTimeout":"900"}'
awslocal s3 mb s3://polis-delphi || true
echo "SQS queue and S3 bucket initialized!"
