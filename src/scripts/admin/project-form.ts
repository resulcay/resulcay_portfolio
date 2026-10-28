import { projectSchema } from '@/domain/schemas';
import { issuesOf, postJson, showFieldErrors } from '../forms';
import { prepareImage, upload } from './upload';

type Issue = { path: string; message: string };

const lines = (value: FormDataEntryValue | null) =>
  String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const optional = (value: FormDataEntryValue | null) => {
  const text = String(value ?? '').trim();
  return text === '' ? undefined : text;
};

/** Reads the form into the shape the schema expects, without judging it. */
function collect(form: HTMLFormElement): { value: unknown; issues: Issue[] } {
  const data = new FormData(form);
  const issues: Issue[] = [];
  const en = lines(data.get('highlights.en'));
  const tr = lines(data.get('highlights.tr'));
  if (en.length !== tr.length) {
    issues.push({ path: 'highlights.tr', message: 'Give each English highlight a Turkish line, in the same order.' });
  }
  const links = Object.fromEntries(
    ['appStore', 'googlePlay', 'microsoftStore', 'website', 'repository']
      .map((name) => [name, optional(data.get(`links.${name}`))] as const)
      .filter(([, url]) => url !== undefined),
  );
  const images = [...form.querySelectorAll<HTMLElement>('[data-images] > li')].map((li) => ({
    key: li.dataset['key'],
    width: Number(li.dataset['width']),
    height: Number(li.dataset['height']),
    alt: {
      en: li.querySelector<HTMLInputElement>('[name="alt.en"]')?.value ?? '',
      tr: li.querySelector<HTMLInputElement>('[name="alt.tr"]')?.value ?? '',
    },
  }));
  const value = {
    slug: String(data.get('slug') ?? '').trim(),
    title: data.get('title'),
    hook: { en: data.get('hook.en'), tr: data.get('hook.tr') },
    story: { en: data.get('story.en'), tr: data.get('story.tr') },
    role: { en: data.get('role.en'), tr: data.get('role.tr') },
    pricing: data.get('pricing'),
    workType: data.get('workType'),
    appTypes: data.getAll('appTypes'),
    platforms: data.getAll('platforms'),
    languages: data.getAll('languages'),
    tech: data.getAll('tech'),
    status: data.get('status'),
    category: data.get('category'),
    start: optional(data.get('start')),
    end: optional(data.get('end')),
    highlights: en.map((line, i) => ({ en: line, tr: tr[i] ?? '' })),
    links,
    images,
    featured: data.get('featured') === 'on',
    order: Number(data.get('order')),
    visibility: data.get('visibility'),
  };
  return { value, issues };
}

/** Puts each problem next to its field, and lists the rest under the form. */
function report(form: HTMLFormElement, issues: Issue[]): void {
  const mapped = issues.map((issue) => {
    if (/^highlights\.\d+\.(en|tr)$/.test(issue.path)) return { ...issue, path: `highlights.${issue.path.slice(-2)}` };
    if (issue.path.startsWith('images.')) return { ...issue, path: 'images' };
    return issue;
  });
  showFieldErrors(form, mapped);
  const list = form.querySelector<HTMLElement>('[data-errors]');
  if (!list) return;
  list.replaceChildren(
    ...mapped
      .filter((issue) => !form.querySelector(`[data-error-for="${CSS.escape(issue.path)}"]`))
      .map((issue) => Object.assign(document.createElement('li'), { textContent: `${issue.path || 'form'}: ${issue.message}` })),
  );
}

function imageItem(key: string, url: string, width: number, height: number): HTMLLIElement {
  const li = document.createElement('li');
  li.dataset['key'] = key;
  li.dataset['width'] = String(width);
  li.dataset['height'] = String(height);
  const img = Object.assign(document.createElement('img'), { src: url, alt: '', width, height });
  const alt = (lang: 'en' | 'tr', label: string) =>
    Object.assign(document.createElement('input'), { name: `alt.${lang}`, placeholder: label, maxLength: 200, ariaLabel: label });
  const row = document.createElement('div');
  row.className = 'row';
  const move = Object.assign(document.createElement('button'), { type: 'button', className: 'button button--small', textContent: 'Move left' });
  move.dataset['move'] = '-1';
  const remove = Object.assign(document.createElement('button'), {
    type: 'button',
    className: 'button button--small button--danger',
    textContent: 'Remove',
  });
  remove.dataset['remove'] = '';
  row.replaceChildren(move, remove);
  li.replaceChildren(img, alt('en', 'Alt text, English'), alt('tr', 'Alt text, Turkish'), row);
  return li;
}

export function setUpProjectForm(form: HTMLFormElement): void {
  const saveStatus = form.querySelector<HTMLElement>('[data-save-status]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const list = form.querySelector<HTMLUListElement>('[data-images]');
  const picker = form.querySelector<HTMLInputElement>('[data-upload]');
  const uploadStatus = form.querySelector<HTMLElement>('[data-upload-status]');
  let dirty = false;
  form.addEventListener('input', () => (dirty = true));
  window.addEventListener('beforeunload', (event) => {
    if (dirty) event.preventDefault();
  });

  list?.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('button');
    const li = button?.closest('li');
    if (!button || !li) return;
    if (button.dataset['remove'] !== undefined) li.remove();
    else if (button.dataset['move'] && li.previousElementSibling) li.parentElement?.insertBefore(li, li.previousElementSibling);
    dirty = true;
  });

  picker?.addEventListener('change', async () => {
    const slug = String(new FormData(form).get('slug') ?? '').trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      if (uploadStatus) uploadStatus.textContent = 'Set the slug first; images are filed under it.';
      return;
    }
    const files = [...(picker.files ?? [])];
    for (const [i, file] of files.entries()) {
      if (uploadStatus) uploadStatus.textContent = `Uploading ${i + 1} of ${files.length}: ${file.name}`;
      try {
        const prepared = await prepareImage(file);
        const done = await upload(prepared, 'projects', slug);
        list?.appendChild(imageItem(done.key, done.url, done.width ?? 1, done.height ?? 1));
        dirty = true;
      } catch (error) {
        if (uploadStatus) uploadStatus.textContent = `${file.name}: ${(error as Error).message}`;
        picker.value = '';
        return;
      }
    }
    if (uploadStatus) uploadStatus.textContent = `Uploaded ${files.length}. Add alt text, then save.`;
    picker.value = '';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const { value, issues } = collect(form);
    const parsed = projectSchema.safeParse(value);
    const all = [...issues, ...(parsed.success ? [] : issuesOf(parsed.error))];
    if (!parsed.success || all.length > 0) {
      report(form, all);
      if (saveStatus) saveStatus.textContent = 'Fix the highlighted fields.';
      return;
    }
    report(form, []);
    if (submit) submit.disabled = true;
    if (saveStatus) saveStatus.textContent = 'Saving…';
    const result = await postJson('/api/admin/projects', parsed.data);
    if (submit) submit.disabled = false;
    if (!result.ok) {
      report(form, result.data.fields ?? []);
      if (saveStatus) saveStatus.textContent = result.data.error ?? 'Saving failed.';
      return;
    }
    dirty = false;
    if (form.dataset['new']) {
      window.location.assign(`/admin/projects/${parsed.data.slug}`);
      return;
    }
    if (saveStatus) saveStatus.textContent = `Saved at ${new Date().toLocaleTimeString()}.`;
  });

  form.querySelector('[data-delete]')?.addEventListener('click', async () => {
    const slug = String(new FormData(form).get('slug'));
    if (!window.confirm(`Delete "${slug}"? Its images stay in Files.`)) return;
    const response = await fetch(`/api/admin/projects/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    if (response.ok) {
      dirty = false;
      window.location.assign('/admin/projects');
    } else if (saveStatus) saveStatus.textContent = 'Deleting failed.';
  });
}
