// ============================================================================
// Tests — Type Guards
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  isSuccess,
  isError,
  isUnauthorized,
  isForbidden,
  isValidationError,
} from "../src/utils/guards.js";
import type { ApiResponse } from "../src/core/types.js";

function makeResponse<T>(
  overrides: Partial<ApiResponse<T>> & { success: boolean },
): ApiResponse<T> {
  return {
    data: null as T | null,
    message: "",
    status: null,
    ...overrides,
  };
}

describe("isSuccess", () => {
  it("should return true for success: true", () => {
    expect(isSuccess(makeResponse({ success: true }))).toBe(true);
  });

  it("should return false for success: false", () => {
    expect(isSuccess(makeResponse({ success: false }))).toBe(false);
  });
});

describe("isError", () => {
  it("should return true for success: false", () => {
    expect(isError(makeResponse({ success: false }))).toBe(true);
  });

  it("should return false for success: true", () => {
    expect(isError(makeResponse({ success: true }))).toBe(false);
  });
});

describe("isUnauthorized", () => {
  it("should return true for status 401", () => {
    expect(isUnauthorized(makeResponse({ success: false, status: 401 }))).toBe(true);
  });

  it("should return false for status 403", () => {
    expect(isUnauthorized(makeResponse({ success: false, status: 403 }))).toBe(false);
  });

  it("should return false for null status", () => {
    expect(isUnauthorized(makeResponse({ success: false, status: null }))).toBe(false);
  });
});

describe("isForbidden", () => {
  it("should return true for status 403", () => {
    expect(isForbidden(makeResponse({ success: false, status: 403 }))).toBe(true);
  });

  it("should return false for status 401", () => {
    expect(isForbidden(makeResponse({ success: false, status: 401 }))).toBe(false);
  });
});

describe("isValidationError", () => {
  it("should return true for status 422", () => {
    expect(isValidationError(makeResponse({ success: false, status: 422 }))).toBe(true);
  });

  it("should return true for status 400", () => {
    expect(isValidationError(makeResponse({ success: false, status: 400 }))).toBe(true);
  });

  it("should return false for status 500", () => {
    expect(isValidationError(makeResponse({ success: false, status: 500 }))).toBe(false);
  });

  it("should return false for null status", () => {
    expect(isValidationError(makeResponse({ success: false, status: null }))).toBe(false);
  });

  it("should support custom status codes", () => {
    expect(
      isValidationError(
        makeResponse({ success: false, status: 409 }),
        [400, 409, 422],
      ),
    ).toBe(true);
  });

  it("should return false for non-matching custom codes", () => {
    expect(
      isValidationError(
        makeResponse({ success: false, status: 400 }),
        [422],
      ),
    ).toBe(false);
  });
});

