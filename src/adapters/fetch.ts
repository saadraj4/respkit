// ============================================================================
// respkit — Fetch Adapter
// ============================================================================

import type { FetchLikeResponse } from "../core/types.js";

/**
 * Detect whether a value is a Fetch API `Response` object.
 *
 * Uses duck-typing: checks for `ok`, `status`, `json`, `text`, `clone`, and `headers`.
 */
export function isFetchResponse(value: unknown): value is FetchLikeResponse {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj["ok"] === "boolean" &&
    typeof obj["status"] === "number" &&
    typeof obj["json"] === "function" &&
    typeof obj["text"] === "function" &&
    typeof obj["clone"] === "function" &&
    typeof obj["headers"] === "object"
  );
}

/**
 * Extract the body and status from a Fetch API Response.
 *
 * Clones the response before reading the body so the original is not consumed.
 * Falls back to `text()` if `json()` fails (e.g. empty body or non-JSON content).
 */
export async function extractFetchBody(
  response: FetchLikeResponse,
): Promise<{ body: unknown; status: number }> {
  const status = response.status;

  // Clone so we don't consume the original
  const cloned = response.clone();

  try {
    const body = await cloned.json();
    return { body, status };
  } catch {
    // JSON parsing failed — try text
    try {
      const text = await cloned.text();
      if (text.length === 0) {
        return { body: null, status };
      }
      return { body: text, status };
    } catch {
      return { body: null, status };
    }
  }
}

