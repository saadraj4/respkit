// ============================================================================
// respkit — Public API
// ============================================================================

// Core types
export type {
  ApiResponse,
  ParseOptions,
  AxiosLikeResponse,
  AxiosLikeError,
  FetchLikeResponse,
  ParseableInput,
} from "./core/types.js";

export { DEFAULT_PARSE_OPTIONS } from "./core/types.js";

// Parser
export { parseResponse, parseResponseSync } from "./core/parser.js";

// Error utilities
export { parseError, getErrorMessage } from "./utils/errors.js";

// Type guards
export {
  isSuccess,
  isError,
  isUnauthorized,
  isForbidden,
  isValidationError,
} from "./utils/guards.js";

// Adapters (for advanced use)
export { isFetchResponse } from "./adapters/fetch.js";
export { isAxiosResponse, isAxiosError } from "./adapters/axios.js";

