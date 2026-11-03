// ============================================================================
// respkit — Error Utilities
// ============================================================================

import type { ApiResponse, ParseOptions } from "../core/types.js";
import { isAxiosError, extractAxiosError } from "../adapters/axios.js";
import { normalizeBody } from "../core/normalizer.js";

/**
 * Normalize any error value into a consistent `ApiResponse` with `success: false`.
 *
 * Handles:
 * - Axios errors (with or without a server response)
 * - Fetch-related errors (TypeError for network failures)
 * - Standard JavaScript `Error` objects
 * - String error messages
 * - Unknown/unexpected error values
 *
 * @param error   - The caught error value
 * @param options - Optional custom key mappings for response body parsing
 * @returns A normalized `ApiResponse` representing the error
 *
 * @example
 * ```ts
 * try {
 *   await axios.post("/api/login", credentials);
 * } catch (error) {
 *   const result = parseError(error);
 *   console.log(result.message); // "Invalid credentials"
 *   console.log(result.status);  // 401
 * }
 * ```
 */
export function parseError<T = unknown>(
  error: unknown,
  options?: ParseOptions,
): ApiResponse<T> {
  // --- Axios error ---
  if (isAxiosError(error)) {
    const { body, status, message } = extractAxiosError(error);

    if (body !== null && body !== undefined && typeof body === "object" && !Array.isArray(body)) {
      // The server sent a structured error response — normalize it
      const result = normalizeBody<T>(body, status, options);
      // Ensure it's marked as failure
      return {
        ...result,
        success: false,
        message: result.message === "Success" ? message : result.message,
      };
    }

    return {
      success: false,
      data: null,
      message,
      status,
    };
  }

  // --- Standard Error objects (including TypeError from Fetch network failures) ---
  if (error instanceof Error) {
    const isFetchNetworkError =
      error instanceof TypeError &&
      (error.message.includes("fetch") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("network"));

    return {
      success: false,
      data: null,
      message: isFetchNetworkError
        ? "Network error: Failed to fetch"
        : error.message || "An unknown error occurred",
      status: null,
    };
  }

  // --- String errors ---
  if (typeof error === "string") {
    return {
      success: false,
      data: null,
      message: error || "An unknown error occurred",
      status: null,
    };
  }

  // --- Object errors (e.g. custom error shapes thrown by middleware) ---
  if (error !== null && error !== undefined && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    const message =
      typeof obj["message"] === "string"
        ? obj["message"]
        : "An unknown error occurred";
    const status =
      typeof obj["status"] === "number"
        ? obj["status"]
        : typeof obj["statusCode"] === "number"
          ? obj["statusCode"]
          : null;

    return {
      success: false,
      data: null,
      message,
      status,
    };
  }

  // --- Truly unknown ---
  return {
    success: false,
    data: null,
    message: "An unknown error occurred",
    status: null,
  };
}

/**
 * Extract a human-readable error message from any error value.
 *
 * @param error    - The error value
 * @param fallback - Fallback message if no message can be extracted
 * @returns A string error message
 *
 * @example
 * ```ts
 * try {
 *   await fetch("/api/data");
 * } catch (err) {
 *   const msg = getErrorMessage(err, "Something went wrong");
 *   showToast(msg);
 * }
 * ```
 */
export function getErrorMessage(
  error: unknown,
  fallback: string = "An unknown error occurred",
): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  if (error !== null && error !== undefined && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    if (typeof obj["message"] === "string" && obj["message"].length > 0) {
      return obj["message"];
    }
  }

  return fallback;
}

