type LogLevel = "debug" | "info" | "warn" | "error";

export interface AppEnv {
  nodeEnv: string;
  port: number;
  redisUrl: string;
  sioCorsOrigin: string;
  sioPingTimeout: number;
  sioPingInterval: number;
  logLevel: LogLevel;
  authSecret: string;
}

function intFromEnv(key: string, def: number): number {
  const val = process.env[key];
  if (!val) return def;
  const parsed = parseInt(val, 10);
  return Number.isFinite(parsed) ? parsed : def;
}

function strFromEnv(key: string, def: string): string {
  const val = process.env[key];
  return val && val.length > 0 ? val : def;
}

function logLevelFromEnv(key: string, def: LogLevel): LogLevel {
  const val = process.env[key];
  const allowed: LogLevel[] = ["debug", "info", "warn", "error"];
  if (val && allowed.includes(val as LogLevel)) return val as LogLevel;
  return def;
}

export const env: AppEnv = {
  nodeEnv: strFromEnv("NODE_ENV", "development"),
  port: intFromEnv("PORT", 4000),
  // Set empty default; only enable Redis if REDIS_URL is provided
  redisUrl: strFromEnv("REDIS_URL", ""),
  sioCorsOrigin: strFromEnv("SIO_CORS_ORIGIN", "http://localhost:3000"),
  sioPingTimeout: intFromEnv("SIO_PING_TIMEOUT", 30000),
  sioPingInterval: intFromEnv("SIO_PING_INTERVAL", 25000),
  logLevel: logLevelFromEnv("LOG_LEVEL", "info"),
  // Stable secret for Better Auth token signing/verification across restarts.
  // Prefer AUTH_SECRET if set, otherwise BETTER_AUTH_SECRET.
  authSecret: strFromEnv("AUTH_SECRET", strFromEnv("BETTER_AUTH_SECRET", "")),
};

export const isProd = env.nodeEnv === "production";
export const isDev = env.nodeEnv === "development";
