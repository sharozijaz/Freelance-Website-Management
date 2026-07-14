import { redactSensitive } from "./redaction";

type LogLevel = "error" | "info" | "warn";

interface LogPayload {
  event: string;
  level: LogLevel;
  metadata?: unknown;
  requestId?: string;
  timestamp: string;
}

function write(level: LogLevel, event: string, metadata?: unknown, requestId?: string) {
  const payload: LogPayload = {
    event,
    level,
    timestamp: new Date().toISOString(),
    ...(requestId ? { requestId } : {}),
    ...(metadata === undefined ? {} : { metadata: redactSensitive(metadata) }),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export const logger = {
  error(event: string, metadata?: unknown, requestId?: string) {
    write("error", event, metadata, requestId);
  },
  info(event: string, metadata?: unknown, requestId?: string) {
    write("info", event, metadata, requestId);
  },
  warn(event: string, metadata?: unknown, requestId?: string) {
    write("warn", event, metadata, requestId);
  },
};
