// ============================================================================
// respkit — Type Guards
// ============================================================================

import type { ApiResponse } from "../core/types.js";

/**
 * Check whether a normalized response represents success.
 *
 * @example
 * ```ts
 * const result = await parseResponse<User>(response);
 * if (isSuccess(result)) {
 *   console.log(result.data); // User
 * }
 * ```
 */
export function isSuccess<T>(response: ApiResponse<T>): boolean {
  return response.success === true;
}

/**
 * Check whether a normalized response represents failure.
 *
 * @example
 * ```ts
 * const result = await parseResponse<User>(response);
 * if (isError(result)) {
 *   console.error(result.message);
 * }
 * ```
 */
export function isError<T>(response: ApiResponse<T>): boolean {
  return response.success === false;
}

/**
 * Check whether a normalized response represents an HTTP 401 Unauthorized error.
 */
export function isUnauthorized<T>(response: ApiResponse<T>): boolean {
  return response.status === 401;
}

/**
 * Check whether a normalized response represents an HTTP 403 Forbidden error.
 */
export function isForbidden<T>(response: ApiResponse<T>): boolean {
  return response.status === 403;
}

/**
 * Check whether a normalized response represents a validation error.
 *
 * By default, considers HTTP 400 and 422 as validation errors.
 * You can provide custom status codes.
 *
 * @param response      - The normalized response
 * @param statusCodes   - Custom status codes to treat as validation errors (default: [400, 422])
 *
 * @example
 * ```ts
 * const result = parseError(error);
 * if (isValidationError(result)) {
 *   // Show field-level errors
 *   console.log(result.errors);
 * }
 * ```
 */
export function isValidationError<T>(
  response: ApiResponse<T>,
  statusCodes: number[] = [400, 422],
): boolean {
  if (response.status === null) {
    return false;
  }
  return statusCodes.includes(response.status);
}

