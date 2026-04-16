import { getJWT } from "./tokens";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export const apiFetch = async (endpoint: string, options: FetchOptions = {}) => {
  const token = getJWT();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // Only set Content-Type for requests that carry a body. Setting it on GET/HEAD
  // requests triggers unnecessary CORS preflight and is semantically incorrect.
  const method = (options.method ?? "GET").toUpperCase();
  if (!["GET", "HEAD"].includes(method)) {
    headers.set("Content-Type", "application/json");
  }

  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (options.params) {
    Object.keys(options.params).forEach((key) =>
      url.searchParams.append(key, options.params![key])
    );
  }

  const response = await fetch(url.toString(), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(errorData.detail || `Request failed: ${response.status}`);
  }

  return response.json();
};
