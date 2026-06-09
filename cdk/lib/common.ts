/**
 * 環境横断で使う共通の定数・型・ヘルパ。
 *
 * 環境切替は OS 環境変数 ENVIRONMENT で行う:
 *   ENVIRONMENT=dev npx cdk deploy PolisMinimalStack-dev
 */
export const ENVIRONMENTS = ['dev', 'stg', 'prd'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export function isEnvironment(value: string | undefined): value is Environment {
  return value !== undefined && (ENVIRONMENTS as readonly string[]).includes(value);
}

/**
 * OS 環境変数 ENVIRONMENT を解決する。未指定時は 'dev'。
 * dev/stg/prd 以外はエラー。
 */
export function resolveEnvironment(): Environment {
  const raw = process.env.ENVIRONMENT ?? 'dev';
  if (!isEnvironment(raw)) {
    throw new Error(
      `ENVIRONMENT must be one of ${ENVIRONMENTS.join(', ')} (got "${raw}")`,
    );
  }
  return raw;
}
