// ============================================================================
// Tests — parseResponse (core parser)
// ============================================================================

import { describe, it, expect } from "vitest";
import { parseResponse, parseResponseSync } from "../src/core/parser.js";
import type { ApiResponse } from "../src/core/types.js";

// ---------------------------------------------------------------------------
// Helper: create a mock Fetch Response
// ---------------------------------------------------------------------------
function createFetchResponse(
  body: unknown,
  status: number = 200,
  ok?: boolean,
): {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
  clone: () => ReturnType<typeof createFetchResponse>;
  bodyUsed: boolean;
} {
  const responseOk = ok ?? (status >= 200 && status < 300);
  const jsonStr = body !== undefined ? JSON.stringify(body) : "";

  const response = {
    ok: responseOk,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => {
      if (body === undefined || body === null) {
        if (body === null) return null;
        throw new SyntaxError("Unexpected end of JSON input");
      }
      return body;
    },
    text: async () => jsonStr,
    clone: () => createFetchResponse(body, status, ok),
    bodyUsed: false,
  };
  return response;
}

// ---------------------------------------------------------------------------
// Helper: create a mock Axios response
// ---------------------------------------------------------------------------
function createAxiosResponse(data: unknown, status: number = 200) {
  return {
    data,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: { "content-type": "application/json" },
    config: { url: "/api/test" },
  };
}

// ============================
// Fetch Responses
// ============================
describe("parseResponse — Fetch", () => {
  it("should parse a successful envelope response", async () => {
    const response = createFetchResponse({
      success: true,
      data: { id: 1, name: "Saad" },
      message: "User fetched successfully",
    });

    const result = await parseResponse<{ id: number; name: string }>(response);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1, name: "Saad" });
    expect(result.message).toBe("User fetched successfully");
    expect(result.status).toBe(200);
    expect(result.errors).toBeUndefined();
  });

  it("should parse a failed envelope response", async () => {
    const response = createFetchResponse(
      {
        success: false,
        data: null,
        message: "Validation failed",
        errors: {
          email: ["Invalid email"],
          password: ["Password is required"],
        },
      },
      422,
    );

    const result = await parseResponse(response);

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.message).toBe("Validation failed");
    expect(result.status).toBe(422);
    expect(result.errors).toEqual({
      email: ["Invalid email"],
      password: ["Password is required"],
    });
  });

  it("should handle HTTP 200 with success: false", async () => {
    const response = createFetchResponse(
      {
        success: false,
        data: null,
        message: "Operation failed",
      },
      200,
    );

    const result = await parseResponse(response);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Operation failed");
    expect(result.status).toBe(200);
  });

  it("should handle a non-envelope response (e.g. raw array)", async () => {
    const users = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];
    const response = createFetchResponse(users);

    const result = await parseResponse<typeof users>(response);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(users);
    expect(result.status).toBe(200);
  });

  it("should handle a non-envelope object (no success/data keys)", async () => {
    const response = createFetchResponse({ id: 1, name: "Saad", role: "admin" });

    const result = await parseResponse<{ id: number; name: string; role: string }>(response);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1, name: "Saad", role: "admin" });
  });

  it("should handle empty body (204 No Content)", async () => {
    const response = createFetchResponse(undefined, 204);

    const result = await parseResponse(response);

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
    expect(result.status).toBe(204);
  });

  it("should handle null body", async () => {
    const response = createFetchResponse(null, 200);

    const result = await parseResponse(response);

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
    expect(result.status).toBe(200);
  });

  it("should handle a plain string body", async () => {
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => { throw new SyntaxError("not JSON"); },
      text: async () => "Hello, World!",
      clone: function() { return { ...this, clone: this.clone }; },
      bodyUsed: false,
    };

    const result = await parseResponse<string>(response as unknown);

    expect(result.success).toBe(true);
    expect(result.data).toBe("Hello, World!");
  });

  it("should handle HTTP 500 with error body", async () => {
    const response = createFetchResponse(
      { message: "Internal Server Error" },
      500,
    );

    const result = await parseResponse(response);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Internal Server Error");
    expect(result.status).toBe(500);
  });

  it("should handle HTTP 404", async () => {
    const response = createFetchResponse(
      { success: false, message: "Not found" },
      404,
    );

    const result = await parseResponse(response);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Not found");
    expect(result.status).toBe(404);
  });
});

// ============================
// Axios Responses
// ============================
describe("parseResponse — Axios", () => {
  it("should parse a successful Axios envelope response", async () => {
    const response = createAxiosResponse({
      success: true,
      data: { id: 1, name: "Saad" },
      message: "User fetched",
    });

    const result = await parseResponse<{ id: number; name: string }>(response);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1, name: "Saad" });
    expect(result.message).toBe("User fetched");
    expect(result.status).toBe(200);
  });

  it("should parse a failed Axios envelope response", async () => {
    const response = createAxiosResponse(
      {
        success: false,
        message: "Forbidden",
      },
      403,
    );

    const result = await parseResponse(response);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Forbidden");
    expect(result.status).toBe(403);
  });

  it("should handle Axios response with raw array data", async () => {
    const data = [1, 2, 3];
    const response = createAxiosResponse(data);

    const result = await parseResponse<number[]>(response);

    expect(result.success).toBe(true);
    expect(result.data).toEqual([1, 2, 3]);
  });

  it("should handle Axios response with null data", async () => {
    const response = createAxiosResponse(null);

    const result = await parseResponse(response);

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("should handle Axios response with plain string data", async () => {
    const response = createAxiosResponse("plain text");

    const result = await parseResponse<string>(response);

    expect(result.success).toBe(true);
    expect(result.data).toBe("plain text");
  });
});

// ============================
// Plain Objects
// ============================
describe("parseResponse — Plain Objects", () => {
  it("should normalize a plain envelope object", async () => {
    const result = await parseResponse<{ id: number }>({
      success: true,
      data: { id: 42 },
      message: "OK",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 42 });
    expect(result.message).toBe("OK");
    expect(result.status).toBeNull(); // No HTTP status for plain objects
  });

  it("should handle null input", async () => {
    const result = await parseResponse(null);

    expect(result.success).toBe(true); // no HTTP status → assume success
    expect(result.data).toBeNull();
  });

  it("should handle undefined input", async () => {
    const result = await parseResponse(undefined);

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("should handle numeric input", async () => {
    const result = await parseResponse(42);

    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
  });

  it("should handle boolean input", async () => {
    const result = await parseResponse(true);

    expect(result.success).toBe(true);
    expect(result.data).toBe(true);
  });
});

// ============================
// Custom Parse Options
// ============================
describe("parseResponse — Custom Options", () => {
  it("should use custom dataKey", async () => {
    const response = createAxiosResponse({
      success: true,
      result: { id: 1, name: "Custom" },
      message: "Fetched with custom key",
    });

    const result = await parseResponse<{ id: number; name: string }>(
      response,
      { dataKey: "result" },
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1, name: "Custom" });
  });

  it("should use custom successKey", async () => {
    const response = createAxiosResponse({
      ok: true,
      data: { id: 1 },
      message: "Done",
    });

    const result = await parseResponse(response, { successKey: "ok" });

    expect(result.success).toBe(true);
  });

  it("should use custom messageKey", async () => {
    const response = createAxiosResponse({
      success: true,
      data: null,
      msg: "Custom message key",
    });

    const result = await parseResponse(response, { messageKey: "msg" });

    expect(result.message).toBe("Custom message key");
  });

  it("should use custom errorsKey", async () => {
    const response = createAxiosResponse(
      {
        success: false,
        data: null,
        message: "Validation failed",
        validation_errors: {
          email: ["Required"],
        },
      },
      422,
    );

    const result = await parseResponse(response, { errorsKey: "validation_errors" });

    expect(result.errors).toEqual({ email: ["Required"] });
  });

  it("should support multiple custom keys at once", async () => {
    const response = createAxiosResponse({
      ok: true,
      result: { name: "Test" },
      msg: "All good",
    });

    const result = await parseResponse(response, {
      successKey: "ok",
      dataKey: "result",
      messageKey: "msg",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: "Test" });
    expect(result.message).toBe("All good");
  });
});

// ============================
// parseResponseSync
// ============================
describe("parseResponseSync", () => {
  it("should parse Axios response synchronously", () => {
    const response = createAxiosResponse({
      success: true,
      data: { id: 1 },
      message: "OK",
    });

    const result = parseResponseSync<{ id: number }>(response);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1 });
  });

  it("should throw for Fetch Response", () => {
    const response = createFetchResponse({ data: {} });

    expect(() => parseResponseSync(response)).toThrow(
      "Cannot synchronously parse a Fetch Response",
    );
  });

  it("should parse plain object synchronously", () => {
    const result = parseResponseSync({ success: false, message: "Nope" });

    expect(result.success).toBe(false);
    expect(result.message).toBe("Nope");
  });
});

// ============================
// Nested data structures
// ============================
describe("parseResponse — Nested Data", () => {
  it("should handle deeply nested data without flattening", async () => {
    const nested = {
      success: true,
      data: {
        user: {
          profile: {
            name: "Saad",
            address: {
              city: "Lahore",
            },
          },
        },
      },
      message: "OK",
    };

    const response = createAxiosResponse(nested);
    const result = await parseResponse(response);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(nested.data);
  });

  it("should handle data being a nested envelope-like structure", async () => {
    // The inner object also has a `data` key — we should NOT re-extract
    const body = {
      success: true,
      data: {
        data: { id: 99 },
        meta: { page: 1 },
      },
      message: "Paginated",
    };

    const response = createAxiosResponse(body);
    const result = await parseResponse(response);

    expect(result.data).toEqual({ data: { id: 99 }, meta: { page: 1 } });
  });
});

// ============================
// Edge cases
// ============================
describe("parseResponse — Edge Cases", () => {
  it("should handle envelope with missing message", async () => {
    const response = createAxiosResponse({ success: true, data: { id: 1 } });
    const result = await parseResponse(response);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Success");
  });

  it("should handle envelope with empty string message", async () => {
    const response = createAxiosResponse({
      success: true,
      data: null,
      message: "",
    });
    const result = await parseResponse(response);

    expect(result.message).toBe("Success");
  });

  it("should handle envelope with success but no data key", async () => {
    const response = createAxiosResponse({ success: true, message: "No data" });
    const result = await parseResponse(response);

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
    expect(result.message).toBe("No data");
  });

  it("should handle errors that are not Record<string, string[]>", async () => {
    const response = createAxiosResponse(
      {
        success: false,
        message: "Bad request",
        errors: "Not a valid errors object",
      },
      400,
    );
    const result = await parseResponse(response);

    expect(result.errors).toBeUndefined();
  });

  it("should handle errors with non-string array values", async () => {
    const response = createAxiosResponse(
      {
        success: false,
        message: "Bad",
        errors: { field: [123, 456] },
      },
      400,
    );
    const result = await parseResponse(response);

    expect(result.errors).toBeUndefined();
  });
});

