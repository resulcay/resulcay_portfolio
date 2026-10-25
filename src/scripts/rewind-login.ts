import { loginSchema } from '@/domain/schemas';
import { issuesOf, postJson, showFieldErrors } from './forms';
import { mountHumanCheck } from './turnstile';

// Opened from the 404 page's butterfly. Loaded on demand, so ordinary
// visitors to a missing page never download any of it.

export async function openLogin(dialog: HTMLDialogElement): Promise<void> {
  const form = dialog.querySelector('form');
  const status = dialog.querySelector<HTMLElement>('[role="status"]');
  const widget = dialog.querySelector<HTMLElement>('[data-turnstile]');
  const submit = dialog.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!form || !status || !widget || !submit) return;

  dialog.showModal();
  if (form.dataset['ready']) return;
  form.dataset['ready'] = 'true';

  const siteKey = widget.dataset['sitekey'] ?? '';
  let human: Awaited<ReturnType<typeof mountHumanCheck>> | undefined;
  try {
    human = await mountHumanCheck(widget, siteKey, 'rewind', document.documentElement.lang);
  } catch {
    status.textContent = "The human check couldn't load. Try again later.";
  }

  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const parsed = loginSchema.safeParse({
      email: data.get('email'),
      password: data.get('password'),
      token: human?.token() ?? '',
    });
    if (!parsed.success) {
      const issues = issuesOf(parsed.error);
      showFieldErrors(form, issues.filter((i) => i.path !== 'token'));
      status.textContent = issues.some((i) => i.path === 'token') ? 'Wait for the human check to finish.' : '';
      return;
    }
    showFieldErrors(form, []);
    submit.disabled = true;
    status.textContent = 'Checking…';
    const result = await postJson('/api/rewind', parsed.data);
    if (result.ok) {
      status.textContent = 'Welcome back.';
      window.location.assign('/admin');
      return;
    }
    status.textContent = result.data.error ?? "That didn't work.";
    human?.reset();
    submit.disabled = false;
  });
}
