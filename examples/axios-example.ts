// ============================================================================
// Example: Axios Integration
// ============================================================================
// This example shows how to use respkit with Axios.

import axios from "axios";
import {
  parseResponse,
  parseError,
  isSuccess,
  isError,
  isValidationError,
  isUnauthorized,
  isForbidden,
  getErrorMessage,
  type ApiResponse,
} from "respkit";

// Define your types
interface User {
  id: number;
  name: string;
  email: string;
}

interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Basic GET request
// ---------------------------------------------------------------------------
async function getUser(id: number): Promise<ApiResponse<User>> {
  try {
    const response = await axios.get(`/api/users/${id}`);
    // Axios response is parsed synchronously (body is already in response.data)
    return await parseResponse<User>(response);
  } catch (error) {
    return parseError<User>(error);
  }
}

// ---------------------------------------------------------------------------
// POST with validation errors
// ---------------------------------------------------------------------------
async function createUser(payload: CreateUserPayload): Promise<ApiResponse<User>> {
  try {
    const response = await axios.post("/api/users", payload);
    return await parseResponse<User>(response);
  } catch (error) {
    // Axios THROWS for HTTP 4xx/5xx status codes.
    // parseError extracts the server's error response from the Axios error object.
    return parseError<User>(error);
  }
}

// Usage:
async function handleCreateUser() {
  const result = await createUser({
    name: "Saad",
    email: "invalid-email",
    password: "",
  });

  if (isSuccess(result)) {
    console.log("User created:", result.data);
  } else if (isValidationError(result)) {
    // Display field-level validation errors
    if (result.errors) {
      for (const [field, messages] of Object.entries(result.errors)) {
        console.log(`${field}: ${messages.join(", ")}`);
      }
    }
  } else if (isUnauthorized(result)) {
    // Redirect to login
    console.log("Please log in first");
  } else if (isForbidden(result)) {
    console.log("You don't have permission to create users");
  } else if (isError(result)) {
    console.error("Error:", result.message);
  }
}

// ---------------------------------------------------------------------------
// Using a reusable Axios wrapper
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: "https://api.example.com",
  timeout: 10000,
});

async function apiRequest<T>(
  method: "get" | "post" | "put" | "patch" | "delete",
  url: string,
  data?: unknown,
): Promise<ApiResponse<T>> {
  try {
    const response = await api.request({ method, url, data });
    return await parseResponse<T>(response);
  } catch (error) {
    return parseError<T>(error);
  }
}

// Usage:
async function main() {
  const userResult = await apiRequest<User>("get", "/users/1");
  const createResult = await apiRequest<User>("post", "/users", {
    name: "Test",
    email: "test@example.com",
    password: "secure123",
  });

  // Simple error message extraction for toast notifications
  if (isError(createResult)) {
    const msg = getErrorMessage(createResult.message, "Failed to create user");
    console.error(msg);
  }

  console.log(userResult, createResult);
}

void getUser;
void handleCreateUser;
void main;

export { getUser, createUser, apiRequest };

