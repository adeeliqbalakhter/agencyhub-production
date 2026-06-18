export function success<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function created<T>(data: T): Response {
  return Response.json({ data }, { status: 201 });
}

export function paginated<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number }
): Response {
  return Response.json({
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
}

export function error(message: string, status = 400, details?: unknown): Response {
  const body: Record<string, unknown> = { error: message };
  if (details) body.details = details;
  return Response.json(body, { status });
}

export function unauthorized(message = "Unauthorized"): Response {
  return Response.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden"): Response {
  return Response.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found"): Response {
  return Response.json({ error: message }, { status: 404 });
}

export function serverError(err: unknown): Response {
  const message = err instanceof Error ? err.message : "Internal server error";
  console.error("Server error:", err);
  const details = process.env.NODE_ENV === "development" ? message : undefined;
  const body: Record<string, unknown> = { error: "Internal server error" };
  if (details) body.details = details;
  return Response.json(body, { status: 500 });
}
