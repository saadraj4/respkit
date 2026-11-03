// ============================================================================
// respkit — Axios Adapter
// ============================================================================

import type { AxiosLikeResponse, AxiosLikeError } from "../core/types.js";

/**
 * Detect whether a value is an Axios-like response object.
 *
 * Uses duck-typing: checks for `data`, `status`, `statusText`, `headers`, and `config`.
 */
export function isAxiosResponse(value: unknown): value is AxiosLikeResponse {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    "data" in obj &&
    typeof obj["status"] === "number" &&
    typeof obj["statusText"] === "string" &&
    "headers" in obj &&
    "config" in obj
  );
}

/**
 * Detect whether a value is an Axios-like error object.
 *
 * Uses duck-typing: checks for `isAxiosError === true`.
 */
export function isAxiosError(value: unknown): value is AxiosLikeError {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return obj["isAxiosError"] === true;
}

/**
 * Extract the body and status from an Axios response.
 *
 * Axios already parses JSON, so `response.data` is the body.
 */
export function extractAxiosBody(
  response: AxiosLikeResponse,
): { body: unknown; status: number } {
  return {
    body: response.data,
    status: response.status,
  };
}

/**
 * Extract information from an Axios error.
 */
export function extractAxiosError(
  error: AxiosLikeError,
): { body: unknown; status: number | null; message: string } {
  // Server responded with an error status
  if (error.response) {
    return {
      body: error.response.data,
      status: error.response.status,
      message: error.message,
    };
  }

  // Request was made but no response received (network error)
  if (error.request) {
    return {
      body: null,
      status: null,
      message: error.code === "ECONNABORTED"
        ? "Request timed out"
        : "Network error: No response received",
    };
  }

  // Something went wrong setting up the request
  return {
    body: null,
    status: null,
    message: error.message || "An unknown Axios error occurred",
  };
}

