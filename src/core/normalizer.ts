// ============================================================================
// respkit — Response Normalizer
// ============================================================================

import type {
  ApiResponse,
  ParseOptions,
} from "./types.js";
import { DEFAULT_PARSE_OPTIONS } from "./types.js";

/**
 * Determine whether a value looks like a standard API envelope.
 *
 * An envelope is an object that has at least one of the conventional keys
 * (data, message, success) at the top level. This heuristic prevents us
 * from accidentally treating arbitrary payloads (e.g. `{ id: 1, name: "x" }`)
 * as envelopes.
 */
function looksLikeEnvelope(
  body: Record<string, unknown>,
  opts: Required<ParseOptions>,
): boolean {
  // Must have at least one of the conventional envelope keys to be treated as an envelope.
  // We check for success, data, or message (but message alone only counts if the object
  // is small — a large object with just a `message` key is likely not an envelope).
  const hasSuccessKey = opts.successKey in body;
  const hasDataKey = opts.dataKey in body;
  const hasMessageKey = opts.messageKey in body;
  const hasErrorsKey = opts.errorsKey in body;

  if (hasSuccessKey || hasDataKey) {
    return true;
  }

  // If only message/errors keys are present, treat as envelope if the object is small
  // (typical error responses have 1-4 keys).
  if (hasMessageKey || hasErrorsKey) {
    const keyCount = Object.keys(body).length;
    return keyCount <= 5;
  }

  return false;
}

/**
 * Normalize a raw body (already-parsed object) into an `ApiResponse<T>`.
 *
 * @param body    - The parsed response body (object, array, string, etc.)
 * @param status  - The HTTP status code (if known)
 * @param options - Custom key mappings
 */
export function normalizeBody<T>(
  body: unknown,
  status: number | null,
  options?: ParseOptions,
): ApiResponse<T> {
  const opts: Required<ParseOptions> = {
    ...DEFAULT_PARSE_OPTIONS,
    ...options,
  };

  // Determine HTTP-level success
  const httpSuccess = status === null || (status >= 200 && status < 300);

  // --- Handle null/undefined body ---
  if (body === null || body === undefined) {
    return {
      success: httpSuccess,
      data: null,
      message: httpSuccess ? "Success" : `Request failed with status ${status}`,
      status,
    };
  }

  // --- Handle non-object bodies (strings, numbers, booleans) ---
  if (typeof body !== "object") {
    return {
      success: httpSuccess,
      data: body as T,
      message: httpSuccess ? "Success" : `Request failed with status ${status}`,
      status,
    };
  }

  // --- Handle arrays ---
  if (Array.isArray(body)) {
    return {
      success: httpSuccess,
      data: body as T,
      message: httpSuccess ? "Success" : `Request failed with status ${status}`,
      status,
    };
  }

  // --- Handle objects ---
  const record = body as Record<string, unknown>;

  // Check if this looks like a standard envelope
  if (looksLikeEnvelope(record, opts)) {
    return normalizeEnvelope<T>(record, status, httpSuccess, opts);
  }

  // Not an envelope — treat the whole body as the data payload
  return {
    success: httpSuccess,
    data: body as T,
    message: httpSuccess ? "Success" : `Request failed with status ${status}`,
    status,
  };
}

/**
 * Normalize a response body that follows the standard envelope pattern.
 */
function normalizeEnvelope<T>(
  body: Record<string, unknown>,
  status: number | null,
  httpSuccess: boolean,
  opts: Required<ParseOptions>,
): ApiResponse<T> {
  // Extract the success flag
  const rawSuccess = body[opts.successKey];
  let success: boolean;
  if (typeof rawSuccess === "boolean") {
    // Explicit application-level success flag
    success = rawSuccess;
  } else {
    // No explicit flag — rely on HTTP status
    success = httpSuccess;
  }

  // Extract the data
  const data = (opts.dataKey in body ? body[opts.dataKey] : null) as T | null;

  // Extract the message
  const rawMessage = body[opts.messageKey];
  let message: string;
  if (typeof rawMessage === "string" && rawMessage.length > 0) {
    message = rawMessage;
  } else if (success) {
    message = "Success";
  } else {
    message = `Request failed with status ${status}`;
  }

  // Extract validation errors
  const rawErrors = body[opts.errorsKey];
  const errors = isValidationErrors(rawErrors) ? rawErrors : undefined;

  // If not successful and we have no message but do have errors, build a message
  if (!success && message === `Request failed with status ${status}` && errors) {
    message = "Validation failed";
  }

  const result: ApiResponse<T> = {
    success,
    data: success ? data : (data ?? null),
    message,
    status,
  };

  if (errors) {
    result.errors = errors;
  }

  return result;
}

/**
 * Check whether a value looks like a validation errors object:
 * `Record<string, string[]>`
 */
function isValidationErrors(
  value: unknown,
): value is Record<string, string[]> {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const val = record[key];
    if (!Array.isArray(val)) {
      return false;
    }
    for (const item of val) {
      if (typeof item !== "string") {
        return false;
      }
    }
  }

  return true;
}
