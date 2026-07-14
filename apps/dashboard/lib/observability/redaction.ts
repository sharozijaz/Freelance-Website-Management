const sensitiveKeyPattern =
  /authorization|cookie|credential|database_url|connectionstring|password|private[_-]?key|secret|token|api[_-]?key/i;

const postgresUrlPattern = /postgres(?:ql)?:\/\/[^\s"'<>]+/gi;
const bearerPattern = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const assignmentPattern =
  /\b(database_url|authorization|token|secret|password|api[_-]?key|private[_-]?key)=([^\s"'<>]+)/gi;

const maxStringLength = 1000;
const maxDepth = 8;

type RedactedValue =
  | null
  | string
  | number
  | boolean
  | RedactedValue[]
  | { [key: string]: RedactedValue };

function redactString(value: string) {
  return value
    .replace(postgresUrlPattern, "[redacted]")
    .replace(bearerPattern, "Bearer [redacted]")
    .replace(assignmentPattern, "$1=[redacted]")
    .slice(0, maxStringLength);
}

function redactError(error: Error) {
  return {
    message: redactString(error.message),
    name: error.name,
  };
}

export function redactSensitive(value: unknown): RedactedValue {
  const seen = new WeakSet();

  function walk(input: unknown, depth: number): RedactedValue {
    if (input === null || input === undefined) {
      return null;
    }

    if (typeof input === "string") {
      return redactString(input);
    }

    if (typeof input === "number" || typeof input === "boolean") {
      return input;
    }

    if (typeof input === "bigint") {
      return input.toString();
    }

    if (input instanceof Error) {
      return redactError(input);
    }

    if (input instanceof Date) {
      return input.toISOString();
    }

    if (typeof input !== "object") {
      return "[unserializable]";
    }

    if (seen.has(input)) {
      return "[circular]";
    }

    if (depth >= maxDepth) {
      return "[truncated]";
    }

    seen.add(input);

    if (Array.isArray(input)) {
      return input.map((item) => walk(item, depth + 1));
    }

    const output: Record<string, RedactedValue> = {};
    for (const [key, nestedValue] of Object.entries(input)) {
      output[key] = sensitiveKeyPattern.test(key) ? "[redacted]" : walk(nestedValue, depth + 1);
    }

    return output;
  }

  return walk(value, 0);
}
