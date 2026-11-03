// ============================================================================
// Example: React / Next.js Usage
// ============================================================================
// This example shows how to use respkit in a React component.
// Works with both React (Vite, CRA) and Next.js.

import { useState, useCallback } from "react";
import {
  parseResponse,
  parseError,
  isSuccess,
  isValidationError,
  type ApiResponse,
} from "respkit";

// ---------------------------------------------------------------------------
// Custom Hook: useApi
// ---------------------------------------------------------------------------
interface UseApiReturn<T> {
  data: T | null;
  error: string | null;
  errors: Record<string, string[]> | undefined;
  loading: boolean;
  execute: (...args: unknown[]) => Promise<ApiResponse<T>>;
}

function useApi<T>(
  apiCall: (...args: unknown[]) => Promise<Response>,
): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>();
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (...args: unknown[]): Promise<ApiResponse<T>> => {
      setLoading(true);
      setError(null);
      setErrors(undefined);

      try {
        const response = await apiCall(...args);
        const result = await parseResponse<T>(response);

        if (isSuccess(result)) {
          setData(result.data);
        } else {
          setError(result.message);
          if (isValidationError(result)) {
            setErrors(result.errors);
          }
        }

        setLoading(false);
        return result;
      } catch (err) {
        const result = parseError<T>(err);
        setError(result.message);
        setLoading(false);
        return result;
      }
    },
    [apiCall],
  );

  return { data, error, errors, loading, execute };
}

// ---------------------------------------------------------------------------
// Example: Login Form Component
// ---------------------------------------------------------------------------
interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

function LoginForm() {
  const { error, errors, loading, execute } = useApi<LoginResponse>(
    (email: unknown, password: unknown) =>
      fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await execute(
      formData.get("email"),
      formData.get("password"),
    );

    if (isSuccess(result)) {
      // Redirect to dashboard
      console.log("Logged in! Token:", result.data?.token);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input name="email" type="email" placeholder="Email" />
        {errors?.email && (
          <span className="error">{errors.email.join(", ")}</span>
        )}
      </div>

      <div>
        <input name="password" type="password" placeholder="Password" />
        {errors?.password && (
          <span className="error">{errors.password.join(", ")}</span>
        )}
      </div>

      {error && !errors && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Example: Data fetching component
// ---------------------------------------------------------------------------
interface User {
  id: number;
  name: string;
  email: string;
}

function UserList() {
  const { data: users, error, loading, execute } = useApi<User[]>(
    () => fetch("/api/users"),
  );

  return (
    <div>
      <button onClick={() => execute()} disabled={loading}>
        {loading ? "Loading..." : "Load Users"}
      </button>

      {error && <div className="error">{error}</div>}

      {users && (
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              {user.name} — {user.email}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { useApi, LoginForm, UserList };

