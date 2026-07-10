import { z } from "zod";

export function createEnvSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape);
}
