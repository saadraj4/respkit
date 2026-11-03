// ============================================================================
// respkit — Core Type Definitions
// ============================================================================

/**
 * The normalized API response structure.
 *
 * Every response parsed by this library is returned in this shape,
 * regardless of whether the original came from Fetch, Axios, or a plain object.
 */
export interface ApiResponse<T> {
  /** Whether the request was successful (HTTP 2xx and application-level success). */
  success: boolean;
  /** The response payload, or `null` on failure. */
  data: T | null;
  /** A human-readable message describing the result. */
  message: string;
  /** The HTTP status code, or `null` if unavailable (e.g. network errors). */
  status: number | null;
  /** Optional field-level validation errors (e.g. `{ email: ["Invalid email"] }`). */
  errors?: Record<string, string[]>;
}

/**
 * Configuration for customizing how raw responses are parsed.
 *
 * Use this when your backend uses non-standard keys for its envelope.
 * All keys are optional — sensible defaults are used when omitted.
 */
export interface ParseOptions {
  /**
   * The key in the response body that holds the payload data.
   * @default "data"
   */
  dataKey?: string;

  /**
   * The key in the response body that holds the human-readable message.
   * @default "message"
   */
  messageKey?: string;

  /**
   * The key in the response body that holds the success boolean.
   * @default "success"
   */
  successKey?: string;

  /**
   * The key in the response body that holds the validation errors object.
   * @default "errors"
   */
  errorsKey?: string;

  /**
   * The key in the response body that holds the HTTP status code (if present in body).
   * @default "status"
   */
  statusKey?: string;
}

/**
 * Default parse options.
 */
export const DEFAULT_PARSE_OPTIONS: Required<ParseOptions> = {
  dataKey: "data",
  messageKey: "message",
  successKey: "success",
  errorsKey: "errors",
  statusKey: "status",
};

// ---------------------------------------------------------------------------
// Internal structural types for duck-typing HTTP client responses/errors
// ---------------------------------------------------------------------------

/**
 * Shape of an Axios-like response object.
 * Used for duck-typing detection — we never import Axios.
 */
export interface AxiosLikeResponse {
  data: unknown;
  status: number;
  statusText: string;
  headers: unknown;
  config: unknown;
}

/**
 * Shape of an Axios-like error object.
 * Used for duck-typing detection — we never import Axios.
 */
export interface AxiosLikeError {
  isAxiosError: boolean;
  response?: AxiosLikeResponse;
  request?: unknown;
  message: string;
  config?: unknown;
  code?: string;
}

/**
 * Shape of a Fetch-like Response object.
 * Used for duck-typing detection.
 */
export interface FetchLikeResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  json(): Promise<unknown>;
  text(): Promise<string>;
  clone(): FetchLikeResponse;
  bodyUsed: boolean;
}

/**
 * All input types that `parseResponse` can accept.
 */
export type ParseableInput =
  | FetchLikeResponse
  | AxiosLikeResponse
  | Record<string, unknown>
  | unknown;

