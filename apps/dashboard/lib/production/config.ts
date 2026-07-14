const placeholderPattern = /changeme|change-before-production|example\.com|placeholder|your-/i;

const requiredVariables = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "NEXT_PUBLIC_APP_URL",
] as const;
const urlVariables = ["DATABASE_URL", "BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL"] as const;

export interface ProductionEnvironmentValidation {
  errors: string[];
  ok: boolean;
}

function isPresent(value: string | undefined) {
  return Boolean(value?.trim());
}

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function validateProductionEnvironment(
  env: Record<string, string | undefined>,
): ProductionEnvironmentValidation {
  const errors: string[] = [];

  for (const name of requiredVariables) {
    const value = env[name];
    if (!isPresent(value)) {
      errors.push(`${name} is required.`);
      continue;
    }

    if (placeholderPattern.test(value ?? "")) {
      errors.push(`${name} must not use a placeholder value.`);
    }
  }

  for (const name of urlVariables) {
    const value = env[name];
    if (isPresent(value) && !isValidUrl(value ?? "")) {
      errors.push(`${name} must be a valid URL.`);
    }
  }

  return {
    errors,
    ok: errors.length === 0,
  };
}
