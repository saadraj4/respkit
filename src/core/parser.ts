// ============================================================================
// respkit — Main Parser
// ============================================================================

import type { ApiResponse, ParseOptions } from "./types.js";
import { normalizeBody } from "./normalizer.js";
import { isFetchResponse, extractFetchBody } from "../adapters/fetch.js";
import { isAxiosResponse, extractAxiosBody } from "../adapters/axios.js";

/**
 * Parse and normalize an API response into a consistent `ApiResponse<T>` structure.
 *
 * Automatically detects whether the input is:
 * - A **Fetch API `Response`** — clones and reads the body asynchronously
 * - An **Axios response** — extracts `response.data` synchronously
 * - A **plain object** — normalizes it directly as a response body
 *
 * Returns a `Promise<ApiResponse<T>>` since Fetch bodies are asynchronous.
 * For synchronous-only use cases (Axios or plain objects), you can also use
 * `parseResponseSync()`.
 *
 * @param input   - A Fetch Response, Axios response, or plain object
 * @param options - Optional custom key mappings for envelope detection
 * @returns A normalized `ApiResponse<T>`
 *
 * @example
 * ```ts
 * // Fetch
 * const response = await fetch("/api/users");
 * const result = await parseResponse<User[]>(response);
 *
 * // Axios
 * const response = await axios.get("/api/users");
 * const result = await parseResponse<User[]>(response);
 *
 * // Plain object
 * const result = await parseResponse<User>({
 *   success: true,
 *   data: { id: 1, name: "Saad" },
 *   message: "User fetched"
 * });
 * ```
 */
export async function parseResponse<T>(
  input: unknown,
  options?: ParseOptions,
): Promise<ApiResponse<T>> {
  // --- Fetch Response ---
  if (isFetchResponse(input)) {
    const { body, status } = await extractFetchBody(input);
    return normalizeBody<T>(body, status, options);
  }

  // --- Axios Response ---
  if (isAxiosResponse(input)) {
    const { body, status } = extractAxiosBody(input);
    return normalizeBody<T>(body, status, options);
  }

  // --- Plain object or other value ---
  return normalizeBody<T>(input, null, options);
}

/**
 * Synchronously parse and normalize an API response.
 *
 * Use this when you know the input is NOT a Fetch Response (e.g. Axios responses
 * or plain objects). Throws if given a Fetch Response.
 *
 * @param input   - An Axios response or plain object (NOT a Fetch Response)
 * @param options - Optional custom key mappings
 * @returns A normalized `ApiResponse<T>`
 *
 * @throws {Error} If the input is a Fetch Response (use `parseResponse` instead)
 */
export function parseResponseSync<T>(
  input: unknown,
  options?: ParseOptions,
): ApiResponse<T> {
  if (isFetchResponse(input)) {
    throw new Error(
      "Cannot synchronously parse a Fetch Response. Use parseResponse() instead.",
    );
  }

  // --- Axios Response ---
  if (isAxiosResponse(input)) {
    const { body, status } = extractAxiosBody(input);
    return normalizeBody<T>(body, status, options);
  }

  // --- Plain object or other value ---
  return normalizeBody<T>(input, null, options);
}

