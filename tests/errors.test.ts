// ============================================================================
// Tests — parseError and getErrorMessage
// ============================================================================

import { describe, it, expect } from "vitest";
import { parseError, getErrorMessage } from "../src/utils/errors.js";

// ---------------------------------------------------------------------------
// Helper: create a mock Axios error
// ---------------------------------------------------------------------------
function createAxiosError(
  message: string,
  response?: { data: unknown; status: number },
  code?: string,
): {
  isAxiosError: true;
  message: string;
  response?: { data: unknown; status: number; statusText: string; headers: object; config: object };
  request?: object;
  config: object;
  code?: string;
} {
  return {
    isAxiosError: true as const,
    message,
    response: response
      ? {
          ...response,
          statusText: "Error",
          headers: {},
          config: {},
        }
      : undefined,
    request: response ? { url: "/api/test" } : undefined,
    config: {},
    code,
  };
}

// ============================
// Axios Errors
// ============================
describe("parseError — Axios Errors", () => {
  it("should handle Axios error with server response body", () => {
    const error = createAxiosError("Request failed with status code 422", {
      data: {
        success: false,
        message: "Validation failed",
        errors: {
          email: ["Invalid email"],
          password: ["Password is required"],
        },
      },
      status: 422,
    });

    const result = parseError(error);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Validation failed");
    expect(result.status).toBe(422);
    expect(result.errors).toEqual({
      email: ["Invalid email"],
      password: ["Password is required"],
    });
  });

  it("should handle Axios error with plain message response", () => {
    const error = createAxiosError("Request failed with status code 401", {
      data: { message: "Unauthorized" },
      status: 401,
    });

    const result = parseError(error);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Unauthorized");
    expect(result.status).toBe(401);
  });

  it("should handle Axios error with empty response body", () => {
    const error = createAxiosError("Request failed with status code 500", {
      data: null,
      status: 500,
    });

    const result = parseError(error);

    expect(result.success).toBe(false);
    expect(result.status).toBe(500);
  });

  it("should handle Axios network error (no response)", () => {
    const error: {
      isAxiosError: true;
      message: string;
      request: object;
      config: object;
      code?: string;
    } = {
      isAxiosError: true,
      message: "Network Error",
      request: {},
      config: {},
    };

    const result = parseError(error);

    expect(result.success).toBe(false);
    expect(result.status).toBeNull();
    expect(result.message).toBe("Network error: No response received");
  });

  it("should handle Axios timeout error", () => {
    const error: {
      isAxiosError: true;
      message: string;
      request: object;
      config: object;
      code: string;
    } = {
      isAxiosError: true,
      message: "timeout of 5000ms exceeded",
      request: {},
      config: {},
      code: "ECONNABORTED",
    };

    const result = parseError(error);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Request timed out");
    expect(result.status).toBeNull();
  });

  it("should handle Axios config error (no request made)", () => {
    const error = {
      isAxiosError: true as const,
      message: "Invalid URL",
      config: {},
    };

    const result = parseError(error);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid URL");
    expect(result.status).toBeNull();
  });

  it("should handle Axios error with non-object data", () => {
    const error = createAxiosError("Server Error", {
      data: "Internal Server Error",
      status: 500,
    });

    const result = parseError(error);

    expect(result.success).toBe(false);
    expect(result.status).toBe(500);
    expect(result.message).toBe("Server Error");
  });

  it("should handle Axios error with array data", () => {
    const error = createAxiosError("Error", {
      data: ["error1", "error2"],
      status: 400,
    });

    const result = parseError(error);

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
  });
});

// ============================
// Standard Errors
// ============================
describe("parseError — Standard Errors", () => {
  it("should handle standard Error", () => {
    const error = new Error("Something went wrong");

    const result = parseError(error);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Something went wrong");
    expect(result.status).toBeNull();
    expect(result.data).toBeNull();
  });

  it("should handle Error with empty message", () => {
    const error = new Error("");

    const result = parseError(error);

    expect(result.success).toBe(false);
    expect(result.message).toBe("An unknown error occurred");
  });

  it("should handle TypeError (Fetch network error)", () => {
    const error = new TypeError("Failed to fetch");

    const result = parseError(error);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Network error: Failed to fetch");
    expect(result.status).toBeNull();
  });

  it("should handle TypeError with 'NetworkError' message", () => {
    const error = new TypeError("NetworkError when attempting to fetch resource.");

    const result = parseError(error);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Network error: Failed to fetch");
  });

  it("should handle non-network TypeError", () => {
    const error = new TypeError("Cannot read properties of null");

    const result = parseError(error);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Cannot read properties of null");
    expect(result.status).toBeNull();
  });
});

// ============================
// String Errors
// ============================
describe("parseError — String Errors", () => {
  it("should handle string error", () => {
    const result = parseError("Something broke");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Something broke");
    expect(result.status).toBeNull();
  });

  it("should handle empty string error", () => {
    const result = parseError("");

    expect(result.success).toBe(false);
    expect(result.message).toBe("An unknown error occurred");
  });
});

// ============================
// Object Errors
// ============================
describe("parseError — Object Errors", () => {
  it("should handle plain object with message", () => {
    const result = parseError({ message: "Custom error", status: 418 });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Custom error");
    expect(result.status).toBe(418);
  });

  it("should handle plain object with statusCode", () => {
    const result = parseError({ message: "Not found", statusCode: 404 });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Not found");
    expect(result.status).toBe(404);
  });

  it("should handle plain object without message", () => {
    const result = parseError({ code: "ERR_UNKNOWN" });

    expect(result.success).toBe(false);
    expect(result.message).toBe("An unknown error occurred");
  });
});

// ============================
// Unknown Errors
// ============================
describe("parseError — Unknown Values", () => {
  it("should handle null", () => {
    const result = parseError(null);

    expect(result.success).toBe(false);
    expect(result.message).toBe("An unknown error occurred");
  });

  it("should handle undefined", () => {
    const result = parseError(undefined);

    expect(result.success).toBe(false);
    expect(result.message).toBe("An unknown error occurred");
  });

  it("should handle number", () => {
    const result = parseError(42);

    expect(result.success).toBe(false);
    expect(result.message).toBe("An unknown error occurred");
  });

  it("should handle boolean", () => {
    const result = parseError(false);

    expect(result.success).toBe(false);
    expect(result.message).toBe("An unknown error occurred");
  });
});

// ============================
// parseError with custom options
// ============================
describe("parseError — Custom Options", () => {
  it("should use custom keys when parsing Axios error response", () => {
    const error = createAxiosError("Request failed", {
      data: {
        ok: false,
        result: null,
        msg: "Invalid credentials",
        validation: { username: ["Required"] },
      },
      status: 401,
    });

    const result = parseError(error, {
      successKey: "ok",
      dataKey: "result",
      messageKey: "msg",
      errorsKey: "validation",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid credentials");
    expect(result.errors).toEqual({ username: ["Required"] });
  });
});

// ============================
// getErrorMessage
// ============================
describe("getErrorMessage", () => {
  it("should extract message from Error", () => {
    expect(getErrorMessage(new Error("Something failed"))).toBe("Something failed");
  });

  it("should extract message from string", () => {
    expect(getErrorMessage("Network error")).toBe("Network error");
  });

  it("should extract message from object", () => {
    expect(getErrorMessage({ message: "Custom msg" })).toBe("Custom msg");
  });

  it("should return fallback for null", () => {
    expect(getErrorMessage(null)).toBe("An unknown error occurred");
  });

  it("should return fallback for undefined", () => {
    expect(getErrorMessage(undefined)).toBe("An unknown error occurred");
  });

  it("should return custom fallback", () => {
    expect(getErrorMessage(null, "Something went wrong")).toBe("Something went wrong");
  });

  it("should return fallback for empty string", () => {
    expect(getErrorMessage("", "Fallback")).toBe("Fallback");
  });

  it("should return fallback for object without message", () => {
    expect(getErrorMessage({ code: 500 }, "No message")).toBe("No message");
  });

  it("should return fallback for Error with empty message", () => {
    expect(getErrorMessage(new Error(""), "Default")).toBe("Default");
  });

  it("should return fallback for number", () => {
    expect(getErrorMessage(42, "Invalid")).toBe("Invalid");
  });
});

