// Every admin URL answers exactly like a missing page unless the request
// carries a verified admin session. Login lands in a later change; until then
// no request is an admin request, so the whole admin area is a plain 404.

export function isAdminPath(pathname: string): boolean {
  return /^\/(?:tr\/)?admin(?:\/|$)/i.test(pathname);
}

export async function hasAdminSession(_request: Request): Promise<boolean> {
  return false;
}
