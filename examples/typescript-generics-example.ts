// ============================================================================
// Example: TypeScript Generics Usage
// ============================================================================
// This example demonstrates advanced TypeScript patterns with respkit.

import {
  parseResponse,
  parseError,
  parseResponseSync,
  isSuccess,
  isError,
  type ApiResponse,
  type ParseOptions,
} from "respkit";

// ---------------------------------------------------------------------------
// Strongly typed response types
// ---------------------------------------------------------------------------
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user" | "moderator";
}

interface Product {
  id: number;
  title: string;
  price: number;
  category: string;
}

// ---------------------------------------------------------------------------
// Generic API client with full type safety
// ---------------------------------------------------------------------------
class TypedApiClient {
  private baseUrl: string;
  private options: ParseOptions;

  constructor(baseUrl: string, options?: ParseOptions) {
    this.baseUrl = baseUrl;
    this.options = options ?? {};
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`);
      return await parseResponse<T>(response, this.options);
    } catch (error) {
      return parseError<T>(error, this.options);
    }
  }

  async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return await parseResponse<T>(response, this.options);
    } catch (error) {
      return parseError<T>(error, this.options);
    }
  }
}

// ---------------------------------------------------------------------------
// Usage with different response types
// ---------------------------------------------------------------------------
async function examples() {
  const api = new TypedApiClient("https://api.example.com");

  // Single user — type is inferred as ApiResponse<User>
  const userResult = await api.get<User>("/users/1");
  if (isSuccess(userResult) && userResult.data) {
    const user: User = userResult.data;
    console.log(user.name, user.role); // Fully typed
  }

  // Paginated users — type is ApiResponse<PaginatedResponse<User>>
  const paginatedResult = await api.get<PaginatedResponse<User>>("/users?page=1");
  if (isSuccess(paginatedResult) && paginatedResult.data) {
    const { items, total, page } = paginatedResult.data;
    console.log(`Page ${page}: ${items.length} of ${total} users`);
  }

  // Products — different type through the same client
  const productsResult = await api.get<Product[]>("/products");
  if (isSuccess(productsResult) && productsResult.data) {
    productsResult.data.forEach((product) => {
      console.log(`${product.title}: $${product.price}`);
    });
  }

  // Create user — generic on both input and output
  const createResult = await api.post<User>("/users", {
    name: "Saad",
    email: "saad@example.com",
  });
  if (isError(createResult)) {
    console.error("Failed:", createResult.message);
    if (createResult.errors) {
      // Validation errors are also fully typed
      Object.entries(createResult.errors).forEach(([field, messages]) => {
        console.error(`  ${field}: ${messages.join(", ")}`);
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Custom backend with non-standard keys (using parseResponseSync)
// ---------------------------------------------------------------------------
function customBackendExample() {
  // Backend that uses { ok, result, msg } instead of { success, data, message }
  const backendResponse = {
    data: {
      ok: true,
      result: { id: 1, name: "Saad" },
      msg: "User fetched",
    },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  };

  const result = parseResponseSync<User>(backendResponse, {
    successKey: "ok",
    dataKey: "result",
    messageKey: "msg",
  });

  console.log(result.success); // true
  console.log(result.data);    // { id: 1, name: "Saad" }
  console.log(result.message); // "User fetched"
}

void examples;
void customBackendExample;

export { TypedApiClient };

