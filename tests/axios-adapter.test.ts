// ============================================================================
// Tests — Axios Adapter
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  isAxiosResponse,
  isAxiosError,
  extractAxiosBody,
  extractAxiosError,
} from "../src/adapters/axios.js";

describe("isAxiosResponse", () => {
  it("should detect a valid Axios-like response", () => {
    expect(
      isAxiosResponse({
        data: { id: 1 },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      }),
    ).toBe(true);
  });

  it("should reject null", () => {
    expect(isAxiosResponse(null)).toBe(false);
  });

  it("should reject undefined", () => {
    expect(isAxiosResponse(undefined)).toBe(false);
  });

  it("should reject a Fetch-like response (no config key)", () => {
    expect(
      isAxiosResponse({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        json: async () => ({}),
      }),
    ).toBe(false);
  });

  it("should reject a plain object", () => {
    expect(isAxiosResponse({ data: "test" })).toBe(false);
  });

  it("should reject a string", () => {
    expect(isAxiosResponse("response")).toBe(false);
  });
});

describe("isAxiosError", () => {
  it("should detect Axios error", () => {
    expect(isAxiosError({ isAxiosError: true, message: "Error" })).toBe(true);
  });

  it("should reject non-Axios error", () => {
    expect(isAxiosError(new Error("Normal error"))).toBe(false);
  });

  it("should reject null", () => {
    expect(isAxiosError(null)).toBe(false);
  });

  it("should reject object with isAxiosError: false", () => {
    expect(isAxiosError({ isAxiosError: false, message: "Not axios" })).toBe(false);
  });
});

describe("extractAxiosBody", () => {
  it("should extract body and status", () => {
    const response = {
      data: { id: 1, name: "Test" },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    };

    const result = extractAxiosBody(response);

    expect(result.body).toEqual({ id: 1, name: "Test" });
    expect(result.status).toBe(200);
  });

  it("should handle null data", () => {
    const response = {
      data: null,
      status: 204,
      statusText: "No Content",
      headers: {},
      config: {},
    };

    const result = extractAxiosBody(response);

    expect(result.body).toBeNull();
    expect(result.status).toBe(204);
  });
});

describe("extractAxiosError", () => {
  it("should extract from response error", () => {
    const error = {
      isAxiosError: true as const,
      message: "Request failed with status code 404",
      response: {
        data: { message: "Not Found" },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: {},
      },
      request: {},
      config: {},
    };

    const result = extractAxiosError(error);

    expect(result.body).toEqual({ message: "Not Found" });
    expect(result.status).toBe(404);
  });

  it("should handle network error (no response)", () => {
    const error = {
      isAxiosError: true as const,
      message: "Network Error",
      request: {},
      config: {},
    };

    const result = extractAxiosError(error);

    expect(result.body).toBeNull();
    expect(result.status).toBeNull();
    expect(result.message).toBe("Network error: No response received");
  });

  it("should handle timeout error", () => {
    const error = {
      isAxiosError: true as const,
      message: "timeout of 5000ms exceeded",
      request: {},
      config: {},
      code: "ECONNABORTED",
    };

    const result = extractAxiosError(error);

    expect(result.message).toBe("Request timed out");
  });

  it("should handle config error (no request)", () => {
    const error = {
      isAxiosError: true as const,
      message: "Invalid URL",
      config: {},
    };

    const result = extractAxiosError(error);

    expect(result.body).toBeNull();
    expect(result.status).toBeNull();
    expect(result.message).toBe("Invalid URL");
  });
});

