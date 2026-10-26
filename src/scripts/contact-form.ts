import { contactSchema } from '@/domain/schemas';
import { issuesOf, postJson, showFieldErrors } from './forms';
import { humanToken } from './turnstile';

const fieldsSchema = contactSchema.omit({ token: true });

export function setUpContactForm(form: HTMLFormElement): void {
  const status = form.querySelector<HTMLElement>('[role="status"]');
  const widget = form.querySelector<HTMLElement>('[data-turnstile]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  // A <template> on the site; a hidden element in Story mode, where React renders the form.
  const messages = form.querySelector<HTMLElement>('[data-messages]');
  if (!status || !widget || !submit || !messages) return;
  const texts = messages instanceof HTMLTemplateElement ? messages.content : messages;
  const text = (key: string) => texts.querySelector(`[data-key="${key}"]`)?.textContent ?? '';
  const say = (key: string) => {
    status.textContent = text(key);
  };
  // Show messages in the page's language rather than the validator's English.
  const localize = (issues: { path: string; message: string }[]) =>
    issues.map((issue) => ({ path: issue.path, message: text(`field-${issue.path}`) || issue.message }));
  const lang = document.documentElement.lang;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const parsed = fieldsSchema.safeParse({
      name: data.get('name'),
      email: data.get('email'),
      message: data.get('message'),
      lang: data.get('lang'),
      website: data.get('website') || undefined,
    });
    // Fields first: Turnstile loads only for a message that's ready to send.
    if (!parsed.success) {
      showFieldErrors(form, localize(issuesOf(parsed.error)));
      status.textContent = '';
      return;
    }
    showFieldErrors(form, []);
    submit.disabled = true;
    say('human');
    let check: { token: string; done: () => void };
    try {
      check = await humanToken(widget, widget.dataset['sitekey'] ?? '', 'contact', lang);
    } catch {
      say('human-failed');
      submit.disabled = false;
      return;
    }
    say('sending');
    const result = await postJson('/api/contact', { ...parsed.data, token: check.token });
    // Tokens are single use; the next send renders a fresh widget.
    check.done();
    if (result.ok) {
      form.reset();
      say('sent');
    } else {
      if (result.data.fields) showFieldErrors(form, localize(result.data.fields));
      say('failed');
    }
    submit.disabled = false;
  });
}
