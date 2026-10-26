// Loads Cloudflare Turnstile only when a form actually needs it, so pages
// without a form never download it.

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<TurnstileApi> | undefined;

function load(): Promise<TurnstileApi> {
  loading ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile missing')));
    script.onerror = () => {
      loading = undefined;
      reject(new Error("Turnstile couldn't load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export interface HumanCheck {
  token(): string | undefined;
  reset(): void;
}

export async function mountHumanCheck(
  container: HTMLElement,
  siteKey: string,
  action: string,
  lang: string,
  onChange: () => void = () => {},
): Promise<HumanCheck> {
  const api = await load();
  let current: string | undefined;
  const id = api.render(container, {
    sitekey: siteKey,
    action,
    language: lang,
    appearance: 'interaction-only',
    callback: (token: string) => {
      current = token;
      onChange();
    },
    'expired-callback': () => {
      current = undefined;
      onChange();
    },
    'error-callback': () => {
      current = undefined;
      onChange();
    },
  });
  return {
    token: () => current,
    reset() {
      current = undefined;
      api.reset(id);
    },
  };
}

/**
 * Loads Turnstile, runs one check and resolves with its token, then the
 * caller removes the widget with done(). The widget stays invisible unless
 * Cloudflare needs the visitor to interact. Used by the contact form on Send.
 */
export async function humanToken(
  container: HTMLElement,
  siteKey: string,
  action: string,
  lang: string,
): Promise<{ token: string; done: () => void }> {
  const api = await load();
  return new Promise((resolve, reject) => {
    let id = '';
    const done = () => api.remove(id);
    const fail = (why: string) => {
      done();
      reject(new Error(why));
      // Tells Turnstile the error is handled, so it doesn't throw it.
      return true;
    };
    id = api.render(container, {
      sitekey: siteKey,
      action,
      language: lang,
      appearance: 'interaction-only',
      execution: 'execute',
      callback: (token: string) => resolve({ token, done }),
      'error-callback': () => fail('error'),
      'expired-callback': () => fail('expired'),
      'timeout-callback': () => fail('timeout'),
    });
    api.execute(id);
  });
}
