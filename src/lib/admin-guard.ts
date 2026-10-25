// Every admin URL, pages and API alike, answers exactly like a missing page
// unless the request carries a verified admin session.

export function isAdminPath(pathname: string): boolean {
  return /^\/(?:tr\/)?admin(?:\/|$)/i.test(pathname) || /^\/api\/admin(?:\/|$)/i.test(pathname);
}
