#!/bin/bash
# 最小コスト本番構成 (docker-compose.prod.yml) 用の localstack 初期化スクリプト。
# dev (bin/localstack-init) と異なり S3 も localstack で兼用するため、
# BYOD インポート用のキューとバケットを両方作成する。
awslocal sqs create-queue \
    --queue-name import-jobs-queue \
    --attributes '{"VisibilityTimeout":"900"}'
awslocal s3 mb s3://polis-delphi || true
echo "SQS queue and S3 bucket initialized!"
