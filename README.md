# respkit

A lightweight, zero-dependency TypeScript library that normalizes API responses and errors from **Fetch** and **Axios** into one consistent, predictable structure.

Stop writing `if (response.data.data)` or guessing error shapes — `respkit` gives you a single `ApiResponse<T>` type across every HTTP client and backend format.

## Why?

Every backend returns responses differently. Some wrap data in `{ success, data, message }`, others return bare arrays, and error formats vary wildly between Fetch TypeError, Axios error objects, and custom backend errors.

**respkit** solves this by normalizing everything into one shape:

```ts
interface ApiResponse<T> {
  success: boolean;       // Was the request successful?
  data: T | null;         // The response payload
  message: string;        // A human-readable message
  status: number | null;  // HTTP status code (null for network errors)
  errors?: Record<string, string[]>;  // Field-level validation errors
}
```

## Features

- 🎯 **One response shape** for Fetch, Axios, and plain objects
- 🔍 **Smart envelope detection** — detects `{ success, data, message }` patterns without misidentifying plain payloads
- ⚡ **Zero runtime dependencies** — Axios is optional peer dependency, detected via duck-typing
- 📦 **Dual ESM + CJS** builds with full TypeScript declarations
- 🌳 **Tree-shakeable** — import only what you need
- 🛡️ **Type-safe** — generics, strict types, no `any`
- 🧪 **Well-tested** — 110+ tests covering edge cases

## Installation

```bash
npm install respkit
```

```bash
yarn add respkit
```

```bash
pnpm add respkit
```

## Supported HTTP Clients

| Client | Support | Notes |
|--------|---------|-------|
| **Fetch API** | ✅ Full | Clones response before reading body; handles non-JSON gracefully |
| **Axios** | ✅ Full | Optional peer dependency; detected via duck-typing |
| **Plain objects** | ✅ Full | Normalize any backend response shape |

## Quick Start

### Fetch API

```ts
import { parseResponse, parseError, isSuccess } from "respkit";

async function getUsers() {
  try {
    const response = await fetch("/api/users");
    const result = await parseResponse<User[]>(response);

    if (isSuccess(result)) {
      console.log(result.data); // User[]
    } else {
      console.error(result.message);
    }
  } catch (error) {
    const result = parseError(error);
    console.error(result.message); // "Network error: Failed to fetch"
  }
}
```

### Axios

```ts
import axios from "axios";
import { parseResponse, parseError, isSuccess } from "respkit";

async function getUser(id: number) {
  try {
    const response = await axios.get(`/api/users/${id}`);
    const result = await parseResponse<User>(response);

    if (isSuccess(result)) {
      console.log(result.data); // User
    }
  } catch (error) {
    // Axios throws for HTTP 4xx/5xx — parseError extracts the server response
    const result = parseError<User>(error);
    console.error(result.message); // "Not found"
    console.error(result.status);  // 404
  }
}
```

## Error Handling

### Validation Errors

```ts
import { parseError, isValidationError } from "respkit";

try {
  await axios.post("/api/register", { email: "", password: "123" });
} catch (error) {
  const result = parseError(error);

  if (isValidationError(result)) {
    console.log(result.errors);
    // {
    //   email: ["The email field is required."],
    //   password: ["The password must be at least 8 characters."]
    // }
  }
}
```

### Auth Errors

```ts
import { parseError, isUnauthorized, isForbidden } from "respkit";

const result = parseError(error);

if (isUnauthorized(result)) {
  // 401 — redirect to login
}

if (isForbidden(result)) {
  // 403 — show "no permission" message
}
```

### Network Errors

```ts
// Fetch network failure
try {
  await fetch("/api/data");
} catch (error) {
  const result = parseError(error);
  console.log(result.message); // "Network error: Failed to fetch"
  console.log(result.status);  // null
}

// Axios timeout
try {
  await axios.get("/api/data", { timeout: 5000 });
} catch (error) {
  const result = parseError(error);
  console.log(result.message); // "Request timed out"
  console.log(result.status);  // null
}
```

### Quick Error Messages

```ts
import { getErrorMessage } from "respkit";

try {
  await fetch("/api/data");
} catch (error) {
  const msg = getErrorMessage(error, "Something went wrong");
  showToast(msg); // Works with any error type
}
```

## TypeScript Generics

The library is fully generic — pass your types and get full IntelliSense:

```ts
interface User {
  id: number;
  name: string;
  email: string;
}

// Result is ApiResponse<User>
const result = await parseResponse<User>(response);

if (isSuccess(result) && result.data) {
  result.data.name;  // string ✅
  result.data.age;   // TypeScript error ❌
}
```

### Paginated Responses

```ts
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
}

const result = await parseResponse<PaginatedResponse<User>>(response);

if (isSuccess(result) && result.data) {
  result.data.items; // User[]
  result.data.total; // number
}
```

## Custom Response Configuration

Not every backend uses `{ success, data, message }`. Configure custom keys:

```ts
const result = await parseResponse<User>(response, {
  dataKey: "result",       // default: "data"
  messageKey: "msg",       // default: "message"
  successKey: "ok",        // default: "success"
  errorsKey: "validation", // default: "errors"
});
```

### Example: Backend using `{ ok, result, msg }`

```ts
// Backend returns: { ok: true, result: { id: 1 }, msg: "Done" }

const result = await parseResponse<User>(response, {
  successKey: "ok",
  dataKey: "result",
  messageKey: "msg",
});

console.log(result.success); // true
console.log(result.data);    // { id: 1 }
console.log(result.message); // "Done"
```

## React / Next.js Usage

### Custom Hook

```tsx
import { parseResponse, parseError, isSuccess, isValidationError, type ApiResponse } from "respkit";

function useApi<T>(apiCall: () => Promise<Response>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>();
  const [loading, setLoading] = useState(false);

  const execute = async (): Promise<ApiResponse<T>> => {
    setLoading(true);
    try {
      const response = await apiCall();
      const result = await parseResponse<T>(response);
      if (isSuccess(result)) setData(result.data);
      else {
        setError(result.message);
        if (isValidationError(result)) setErrors(result.errors);
      }
      return result;
    } catch (err) {
      const result = parseError<T>(err);
      setError(result.message);
      return result;
    } finally {
      setLoading(false);
    }
  };

  return { data, error, errors, loading, execute };
}
```

### Form with Validation

```tsx
function RegisterForm() {
  const { errors, loading, execute } = useApi<{ token: string }>(
    () => fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
  );

  return (
    <form onSubmit={() => execute()}>
      <input name="email" />
      {errors?.email && <span>{errors.email.join(", ")}</span>}

      <input name="password" type="password" />
      {errors?.password && <span>{errors.password.join(", ")}</span>}

      <button disabled={loading}>Register</button>
    </form>
  );
}
```

## Synchronous Parsing

For Axios responses or plain objects where you don't need async:

```ts
import { parseResponseSync } from "respkit";

const axiosResponse = await axios.get("/api/users");
const result = parseResponseSync<User[]>(axiosResponse);
// No await needed!
```

> **Note:** `parseResponseSync` throws if given a Fetch Response. Use `parseResponse` for Fetch.

## API Reference

### `parseResponse<T>(input, options?): Promise<ApiResponse<T>>`

Parses and normalizes any API response. Automatically detects Fetch Response, Axios response, or plain object.

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `unknown` | Fetch Response, Axios response, or plain object |
| `options` | `ParseOptions` | Optional custom key mappings |

### `parseResponseSync<T>(input, options?): ApiResponse<T>`

Synchronous version. Throws if given a Fetch Response.

### `parseError<T>(error, options?): ApiResponse<T>`

Normalizes any error into `ApiResponse` with `success: false`. Handles Axios errors, TypeError, Error, strings, and unknown values.

| Parameter | Type | Description |
|-----------|------|-------------|
| `error` | `unknown` | Any caught error value |
| `options` | `ParseOptions` | Optional custom key mappings for server error bodies |

### `getErrorMessage(error, fallback?): string`

Extracts a human-readable message from any error value.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `error` | `unknown` | — | Any error value |
| `fallback` | `string` | `"An unknown error occurred"` | Fallback message |

### `isSuccess<T>(response): boolean`

Returns `true` if `response.success === true`.

### `isError<T>(response): boolean`

Returns `true` if `response.success === false`.

### `isUnauthorized<T>(response): boolean`

Returns `true` if `response.status === 401`.

### `isForbidden<T>(response): boolean`

Returns `true` if `response.status === 403`.

### `isValidationError<T>(response, statusCodes?): boolean`

Returns `true` if the response status is a validation error (default: 400 or 422).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `response` | `ApiResponse<T>` | — | Normalized response |
| `statusCodes` | `number[]` | `[400, 422]` | Status codes to consider as validation errors |

### `ParseOptions`

```ts
interface ParseOptions {
  dataKey?: string;    // default: "data"
  messageKey?: string; // default: "message"
  successKey?: string; // default: "success"
  errorsKey?: string;  // default: "errors"
  statusKey?: string;  // default: "status"
}
```

### Detection Utilities

```ts
isFetchResponse(value: unknown): boolean  // Duck-type detect Fetch Response
isAxiosResponse(value: unknown): boolean  // Duck-type detect Axios response
isAxiosError(value: unknown): boolean     // Duck-type detect Axios error
```

## Error Handling Behavior

### How success is determined

1. **Explicit success flag**: If the response body has a `success` (or custom `successKey`) boolean, that value is used.
2. **HTTP status fallback**: If no explicit flag exists, HTTP 2xx = success, anything else = failure.
3. **No status**: Plain objects with no HTTP status default to `success: true` (no reason to assume failure).

### Important: HTTP 200 with `success: false`

```ts
// Backend returns HTTP 200 with: { success: false, message: "Operation failed" }
const result = await parseResponse(response);
result.success; // false — respects the application-level flag
```

### Envelope Detection

The library detects standard envelope patterns (`{ success, data, message }`) and extracts fields accordingly. Objects without these keys are treated as raw payloads:

```ts
// This IS an envelope → data is extracted from the `data` key
{ success: true, data: { id: 1 }, message: "OK" }

// This is NOT an envelope → the entire object becomes `data`
{ id: 1, name: "Saad", role: "admin" }
```

### Fetch Response Handling

- **Clones before reading**: The original Response is never consumed.
- **JSON fallback to text**: If `json()` fails, falls back to `text()`.
- **Empty bodies**: Return `data: null` (e.g. 204 No Content).
- **Does not throw for 4xx/5xx**: Unlike Axios, Fetch doesn't throw for error status codes. `parseResponse` handles this correctly by checking `response.status`.

## Limitations

1. **Envelope detection is heuristic**: The library uses the presence of `success` or `data` keys to detect envelopes. If your backend returns objects with these keys that are NOT envelopes, use custom `ParseOptions` to avoid false positives.

2. **No automatic retry or caching**: This library normalizes responses — it does not make HTTP requests, retry failures, or cache results.

3. **Validation errors must be `Record<string, string[]>`**: Other error formats (e.g. arrays of error objects) are not automatically extracted into the `errors` field.

4. **Axios is duck-typed**: The library detects Axios responses and errors by structural shape (`isAxiosError`, `config`, etc.), not by `instanceof`. This works with all Axios versions but could theoretically match non-Axios objects with the same shape.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Write tests for new functionality
4. Ensure all tests pass: `npm test`
5. Ensure TypeScript compiles: `npm run lint`
6. Build the package: `npm run build`
7. Submit a pull request

### Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run lint

# Build
npm run build
```

## License

[MIT](./LICENSE)
