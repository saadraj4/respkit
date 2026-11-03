// ============================================================================
// Tests — Fetch Adapter
// ============================================================================

import { describe, it, expect } from "vitest";
import { isFetchResponse, extractFetchBody } from "../src/adapters/fetch.js";

describe("isFetchResponse", () => {
  it("should detect a valid Fetch-like Response", () => {
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => ({}),
      text: async () => "",
      clone: () => response,
      bodyUsed: false,
    };
    expect(isFetchResponse(response)).toBe(true);
  });

  it("should reject null", () => {
    expect(isFetchResponse(null)).toBe(false);
  });

  it("should reject undefined", () => {
    expect(isFetchResponse(undefined)).toBe(false);
  });

  it("should reject a plain object", () => {
    expect(isFetchResponse({ data: "test" })).toBe(false);
  });

  it("should reject an Axios-like response", () => {
    expect(
      isFetchResponse({
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      }),
    ).toBe(false);
  });

  it("should reject a string", () => {
    expect(isFetchResponse("response")).toBe(false);
  });

  it("should reject a number", () => {
    expect(isFetchResponse(42)).toBe(false);
  });
});

describe("extractFetchBody", () => {
  it("should extract JSON body", async () => {
    const data = { id: 1, name: "Test" };
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => data,
      text: async () => JSON.stringify(data),
      clone() { return { ...this, clone: this.clone.bind(this) }; },
      bodyUsed: false,
    };

    const result = await extractFetchBody(response as never);

    expect(result.body).toEqual(data);
    expect(result.status).toBe(200);
  });

  it("should fall back to text when JSON parsing fails", async () => {
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => { throw new SyntaxError("Unexpected token"); },
      text: async () => "Plain text response",
      clone() { return { ...this, clone: this.clone.bind(this) }; },
      bodyUsed: false,
    };

    const result = await extractFetchBody(response as never);

    expect(result.body).toBe("Plain text response");
  });

  it("should return null body for empty response", async () => {
    const response = {
      ok: true,
      status: 204,
      statusText: "No Content",
      headers: new Headers(),
      json: async () => { throw new SyntaxError("Unexpected end"); },
      text: async () => "",
      clone() { return { ...this, clone: this.clone.bind(this) }; },
      bodyUsed: false,
    };

    const result = await extractFetchBody(response as never);

    expect(result.body).toBeNull();
    expect(result.status).toBe(204);
  });

  it("should return null body when both json and text fail", async () => {
    const response = {
      ok: false,
      status: 500,
      statusText: "Error",
      headers: new Headers(),
      json: async () => { throw new Error("fail"); },
      text: async () => { throw new Error("fail"); },
      clone() { return { ...this, clone: this.clone.bind(this) }; },
      bodyUsed: false,
    };

    const result = await extractFetchBody(response as never);

    expect(result.body).toBeNull();
    expect(result.status).toBe(500);
  });
});

