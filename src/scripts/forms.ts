import type { z } from 'zod';

// Small helpers shared by the site's forms: read fields, show the same
// messages the server would send, and post JSON.

export function showFieldErrors(form: HTMLFormElement, issues: { path: string; message: string }[]): void {
  for (const el of form.querySelectorAll<HTMLElement>('[data-error-for]')) el.textContent = '';
  for (const input of form.querySelectorAll<HTMLElement>('[aria-invalid]')) input.removeAttribute('aria-invalid');
  for (const issue of issues) {
    const slot = form.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(issue.path)}"]`);
    if (slot && !slot.textContent) slot.textContent = issue.message;
    form.querySelector(`[name="${CSS.escape(issue.path)}"]`)?.setAttribute('aria-invalid', 'true');
  }
  form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}

export function issuesOf(error: z.ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

export interface PostResult {
  ok: boolean;
  status: number;
  data: { error?: string; fields?: { path: string; message: string }[]; [key: string]: unknown };
}

export async function postJson(url: string, body: unknown, method = 'POST'): Promise<PostResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    });
    const data = (await response.json().catch(() => ({}))) as PostResult['data'];
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'No connection. Please try again.' } };
  }
}
