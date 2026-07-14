import { z } from "zod";

export const websiteTypes = ["wordpress", "sharoz_connected", "external_legacy"] as const;

export type WebsiteType = (typeof websiteTypes)[number];

export const websiteTypeSchema = z.enum(websiteTypes);

export const websiteTypeLabels = {
  external_legacy: "External / Legacy",
  sharoz_connected: "Sharoz Connected",
  wordpress: "WordPress",
} satisfies Record<WebsiteType, string>;

export const websiteTypeDescriptions = {
  external_legacy:
    "A site you track for support, renewals, notes, domains, and deployments, but the platform does not power its content or forms.",
  sharoz_connected:
    "A custom-coded site that uses Sharoz Platform modules such as Blog, Forms, Media, SEO, Catalog, Orders, Customers, or Booking.",
  wordpress:
    "An existing WordPress site you manage operationally. Use this when content still lives in WordPress but the agency tracks hosting, domains, updates, and client support here.",
} satisfies Record<WebsiteType, string>;

export const moduleKeys = [
  "blog",
  "forms",
  "media",
  "seo",
  "catalog",
  "orders",
  "customers",
  "booking",
] as const;

export type ModuleKey = (typeof moduleKeys)[number];

export const moduleKeySchema = z.enum(moduleKeys);

export interface ModuleDefinition {
  description: string;
  key: ModuleKey;
  label: string;
}

const moduleDefinitions = [
  {
    description: "Structured posts and publishing data for connected websites.",
    key: "blog",
    label: "Blog",
  },
  {
    description: "Form definitions and submission workflows.",
    key: "forms",
    label: "Forms",
  },
  {
    description: "Website-owned media assets and metadata.",
    key: "media",
    label: "Media",
  },
  {
    description: "Search metadata, audits, and optimization workflows.",
    key: "seo",
    label: "SEO",
  },
  {
    description: "Product, menu, or service catalog data.",
    key: "catalog",
    label: "Catalog",
  },
  {
    description: "Order records and operational order workflows.",
    key: "orders",
    label: "Orders",
  },
  {
    description: "Customer profiles and customer-owned activity.",
    key: "customers",
    label: "Customers",
  },
  {
    description: "Appointment, reservation, or service booking data.",
    key: "booking",
    label: "Booking",
  },
] as const satisfies readonly ModuleDefinition[];

const moduleDefinitionMap = new Map<ModuleKey, ModuleDefinition>(
  moduleDefinitions.map((definition) => [definition.key, definition]),
);

export const moduleDependencies = {
  blog: [],
  booking: [],
  catalog: [],
  customers: [],
  forms: [],
  media: [],
  orders: ["catalog", "customers"],
  seo: [],
} as const satisfies Record<ModuleKey, readonly ModuleKey[]>;

export function listModuleDefinitions(): ModuleDefinition[] {
  return [...moduleDefinitions];
}

export function isKnownModuleKey(value: string): value is ModuleKey {
  return moduleKeys.includes(value as ModuleKey);
}

export function getModuleDefinition(key: ModuleKey): ModuleDefinition {
  const definition = moduleDefinitionMap.get(key);

  if (!definition) {
    throw new Error(`Unknown module key: ${key}`);
  }

  return definition;
}

export function getModuleDependencies(key: ModuleKey): readonly ModuleKey[] {
  return moduleDependencies[key];
}

export function getDependentModuleKeys(key: ModuleKey): ModuleKey[] {
  return moduleKeys.filter((moduleKey) =>
    (moduleDependencies[moduleKey] as readonly ModuleKey[]).includes(key),
  );
}

export function isWebsiteType(value: string): value is WebsiteType {
  return websiteTypes.includes(value as WebsiteType);
}
