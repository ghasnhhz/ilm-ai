const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Default request timeout. RAG/quiz/plan generation can legitimately run long, so
// callers may pass a larger `timeoutMs`; the abort prevents requests hanging forever
// with only a disabled button as feedback.
const DEFAULT_TIMEOUT_MS = 45_000;

export async function apiFetch<T>(
  path: string,
  options: {
    token?: string;
    method?: string;
    body?: unknown;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const { token, method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = {};
  // For FormData, let the browser set Content-Type (incl. the multipart boundary).
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      signal: controller.signal,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, "This is taking longer than expected — please try again.");
    }
    throw new ApiError(0, "Network error — check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export { API_BASE };
