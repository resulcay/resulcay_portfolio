import type { z } from 'zod';

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  const response = new Response(JSON.stringify(data), { status, headers });
  response.headers.set('Content-Type', 'application/json; charset=utf-8');
  return response;
}

export interface FieldError {
  path: string;
  message: string;
}

export function fieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

const MAX_JSON_BYTES = 256 * 1024;

/** Parses and validates a JSON body, or returns the 4xx response to send. */
export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { response: Response }> {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    return { response: json({ error: 'Send JSON.' }, 415) };
  }
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) return { response: json({ error: 'The request is too large.' }, 413) };
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { response: json({ error: "The request isn't valid JSON." }, 400) };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return { response: json({ error: 'Some fields need fixing.', fields: fieldErrors(result.error) }, 422) };
  }
  return { data: result.data };
}

export function clientIp(request: Request): string | undefined {
  return request.headers.get('CF-Connecting-IP') ?? undefined;
}
