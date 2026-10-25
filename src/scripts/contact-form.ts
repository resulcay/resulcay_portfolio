import { contactSchema } from '@/domain/schemas';
import { issuesOf, postJson, showFieldErrors } from './forms';
import { mountHumanCheck, type HumanCheck } from './turnstile';

export function setUpContactForm(form: HTMLFormElement): void {
  const status = form.querySelector<HTMLElement>('[role="status"]');
  const widget = form.querySelector<HTMLElement>('[data-turnstile]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const messages = form.querySelector<HTMLTemplateElement>('template[data-messages]');
  if (!status || !widget || !submit || !messages) return;
  const text = (key: string) => messages.content.querySelector(`[data-key="${key}"]`)?.textContent ?? '';
  const say = (key: string) => {
    status.textContent = text(key);
  };
  // Show messages in the page's language rather than the validator's English.
  const localize = (issues: { path: string; message: string }[]) =>
    issues.map((issue) => ({ path: issue.path, message: text(`field-${issue.path}`) || issue.message }));
  const lang = document.documentElement.lang;

  let human: HumanCheck | undefined;
  mountHumanCheck(widget, widget.dataset['sitekey'] ?? '', 'contact', lang).then(
    (check) => (human = check),
    () => say('failed'),
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const parsed = contactSchema.safeParse({
      name: data.get('name'),
      email: data.get('email'),
      message: data.get('message'),
      lang: data.get('lang'),
      website: data.get('website') || undefined,
      token: human?.token() ?? '',
    });
    if (!parsed.success) {
      const issues = issuesOf(parsed.error);
      showFieldErrors(form, localize(issues.filter((i) => i.path !== 'token')));
      if (issues.every((i) => i.path === 'token')) say('human');
      else status.textContent = '';
      return;
    }
    showFieldErrors(form, []);
    submit.disabled = true;
    say('sending');
    const result = await postJson('/api/contact', parsed.data);
    if (result.ok) {
      form.reset();
      say('sent');
    } else {
      if (result.data.fields) showFieldErrors(form, localize(result.data.fields));
      say('failed');
    }
    human?.reset();
    submit.disabled = false;
  });
}
