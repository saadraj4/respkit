// ============================================================================
// Example: Backend Validation Error Handling
// ============================================================================
// This example shows how to handle various backend error formats.

import {
  parseResponse,
  parseError,
  isValidationError,
  isUnauthorized,
  isForbidden,
  isError,
  getErrorMessage,
  type ApiResponse,
} from "respkit";

// ---------------------------------------------------------------------------
// Scenario 1: Laravel-style validation errors
// ---------------------------------------------------------------------------
// Backend response for 422 Unprocessable Entity:
// {
//   "success": false,
//   "message": "The given data was invalid.",
//   "errors": {
//     "email": ["The email field is required.", "The email must be valid."],
//     "password": ["The password must be at least 8 characters."]
//   }
// }

async function handleLaravelValidation() {
  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "", password: "123" }),
    });
    const result = await parseResponse(response);

    if (isValidationError(result) && result.errors) {
      // Display errors per field
      for (const [field, messages] of Object.entries(result.errors)) {
        console.log(`${field}:`);
        messages.forEach((msg) => console.log(`  - ${msg}`));
      }
    }
  } catch (error) {
    console.error(getErrorMessage(error));
  }
}

// ---------------------------------------------------------------------------
// Scenario 2: Express/NestJS-style errors
// ---------------------------------------------------------------------------
// Backend response for 400 Bad Request:
// {
//   "message": "Validation failed",
//   "errors": {
//     "username": ["Username is already taken"]
//   }
// }

async function handleExpressValidation() {
  try {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "taken_name" }),
    });
    const result = await parseResponse(response);

    if (isValidationError(result)) {
      console.log("Message:", result.message); // "Validation failed"
      console.log("Errors:", result.errors);   // { username: ["Username is already taken"] }
    }
  } catch (error) {
    console.error(getErrorMessage(error));
  }
}

// ---------------------------------------------------------------------------
// Scenario 3: Comprehensive error handling pattern
// ---------------------------------------------------------------------------
async function robustApiCall<T>(
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

async function handleWithFullErrorCoverage() {
  const result = await robustApiCall<{ id: number }>("/api/resource", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "test" }),
  });

  if (!isError(result)) {
    console.log("Success:", result.data);
    return;
  }

  // Handle specific error types
  if (isUnauthorized(result)) {
    // Token expired — redirect to login
    console.log("Session expired. Redirecting to login...");
    // window.location.href = "/login";
    return;
  }

  if (isForbidden(result)) {
    // User doesn't have permission
    console.log("You don't have permission to perform this action.");
    return;
  }

  if (isValidationError(result)) {
    // Show field-level errors in the form
    console.log("Please fix the following errors:");
    if (result.errors) {
      for (const [field, messages] of Object.entries(result.errors)) {
        console.log(`  ${field}: ${messages.join(", ")}`);
      }
    }
    return;
  }

  // Generic error fallback
  console.error("Error:", result.message);
  console.error("Status:", result.status);
}

// ---------------------------------------------------------------------------
// Scenario 4: Custom status codes for validation
// ---------------------------------------------------------------------------
async function customValidationStatusCodes() {
  const result = await robustApiCall("/api/data");

  // Some APIs use 409 Conflict for duplicate entries
  if (isValidationError(result, [400, 409, 422])) {
    console.log("Validation or conflict error:", result.message);
  }
}

void handleLaravelValidation;
void handleExpressValidation;
void handleWithFullErrorCoverage;
void customValidationStatusCodes;

export { robustApiCall };

