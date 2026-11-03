// ============================================================================
// Example: Fetch API Integration
// ============================================================================
// This example shows how to use respkit with the native Fetch API.

import {
  parseResponse,
  parseError,
  isSuccess,
  isValidationError,
  isUnauthorized,
  type ApiResponse,
} from "respkit";

// Define your types
interface User {
  id: number;
  name: string;
  email: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Basic GET request
// ---------------------------------------------------------------------------
async function getUsers(): Promise<ApiResponse<User[]>> {
  try {
    const response = await fetch("/api/users");
    return await parseResponse<User[]>(response);
  } catch (error) {
    return parseError<User[]>(error);
  }
}

// Usage:
async function displayUsers() {
  const result = await getUsers();

  if (isSuccess(result)) {
    console.log("Users:", result.data);
  } else {
    console.error("Error:", result.message);
  }
}

// ---------------------------------------------------------------------------
// POST request with validation error handling
// ---------------------------------------------------------------------------
async function login(credentials: LoginCredentials): Promise<ApiResponse<{ token: string }>> {
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    // Note: Fetch does NOT throw for HTTP errors (4xx, 5xx).
    // parseResponse handles this correctly.
    return await parseResponse<{ token: string }>(response);
  } catch (error) {
    // Only network errors and other exceptions land here
    return parseError<{ token: string }>(error);
  }
}

// Usage:
async function handleLogin() {
  const result = await login({ email: "user@example.com", password: "secret" });

  if (isSuccess(result)) {
    console.log("Token:", result.data?.token);
  } else if (isValidationError(result)) {
    console.log("Validation errors:", result.errors);
    // { email: ["Invalid email"], password: ["Password is required"] }
  } else if (isUnauthorized(result)) {
    console.log("Invalid credentials");
  } else {
    console.error("Unexpected error:", result.message);
  }
}

// ---------------------------------------------------------------------------
// Using a reusable fetch wrapper
// ---------------------------------------------------------------------------
async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, init);
    return await parseResponse<T>(response);
  } catch (error) {
    return parseError<T>(error);
  }
}

// Usage:
async function main() {
  const users = await apiFetch<User[]>("/api/users");
  const login = await apiFetch<{ token: string }>("/api/login", {
    method: "POST",
    body: JSON.stringify({ email: "a@b.com", password: "123" }),
  });

  console.log(users, login);
}

// Prevent "unused" warnings — in real code you'd call these
void displayUsers;
void handleLogin;
void main;

export { getUsers, login, apiFetch };

