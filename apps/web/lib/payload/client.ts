import { draftMode } from "next/headers";
import { defaultRevalidateSeconds, payloadApiUrl } from "../config";
import type { PayloadListResponse } from "./types";

type PayloadWhereValue = boolean | number | string | null;

type PayloadWhere = Record<
  string,
  | PayloadWhereValue
  | {
      equals?: PayloadWhereValue;
      greater_than_equal?: PayloadWhereValue;
      less_than_equal?: PayloadWhereValue;
      not_equals?: PayloadWhereValue;
    }
>;

export interface PayloadFindOptions {
  collection: string;
  depth?: number;
  draft?: boolean;
  limit?: number;
  page?: number;
  sort?: string;
  tags?: string[];
  where?: PayloadWhere;
}

function appendWhereParams(params: URLSearchParams, where?: PayloadWhere): void {
  if (!where) {
    return;
  }

  for (const [field, condition] of Object.entries(where)) {
    if (condition && typeof condition === "object") {
      for (const [operator, value] of Object.entries(condition)) {
        params.set(`where[${field}][${operator}]`, String(value));
      }
      continue;
    }

    params.set(`where[${field}][equals]`, String(condition));
  }
}

export async function findPayloadDocs<T>({
  collection,
  depth = 2,
  draft,
  limit = 10,
  page,
  sort,
  tags = [],
  where,
}: PayloadFindOptions): Promise<PayloadListResponse<T>> {
  const preview = await draftMode();
  const shouldUseDraft = draft ?? preview.isEnabled;
  const params = new URLSearchParams({
    depth: depth.toString(),
    draft: shouldUseDraft ? "true" : "false",
    limit: limit.toString(),
  });

  if (page) {
    params.set("page", page.toString());
  }

  if (sort) {
    params.set("sort", sort);
  }

  appendWhereParams(params, where);

  const response = await fetch(`${payloadApiUrl}/api/${collection}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
    next: shouldUseDraft
      ? { revalidate: 0 }
      : {
          revalidate: defaultRevalidateSeconds,
          tags: [`payload:${collection}`, ...tags],
        },
  });

  if (!response.ok) {
    throw new Error(`Payload request failed for ${collection}: ${response.status.toString()}`);
  }

  return response.json() as Promise<PayloadListResponse<T>>;
}

export async function findFirstPayloadDoc<T>(options: PayloadFindOptions): Promise<T | null> {
  const response = await findPayloadDocs<T>({
    ...options,
    limit: 1,
  });

  return response.docs[0] ?? null;
}
