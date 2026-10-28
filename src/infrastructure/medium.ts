// Resul's latest Medium articles, read from his profile's RSS feed (Medium has
// no public API for posts). The feed is cached at Cloudflare's edge for an hour;
// if Medium is slow or down, the home page simply shows no articles.

export interface Article {
  title: string;
  url: string;
  /** ISO date it was published. */
  date: string;
  summary: string;
  tags: string[];
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

const decode = (text: string) =>
  text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (whole, code: string) =>
    code[0] === '#' ? String.fromCodePoint(code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1))) : (ENTITIES[code] ?? whole),
  );

const text = (html: string) => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

/** The value of `tag` in an item, without its CDATA wrapper. */
const field = (item: string, tag: string) => item.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`))?.[1] ?? '';

/** "https://medium.com/@resulcay" -> "https://medium.com/feed/@resulcay". */
export function feedUrl(profileUrl: string): string | undefined {
  const user = profileUrl.match(/medium\.com\/(@[\w.-]+)/)?.[1];
  return user ? `https://medium.com/feed/${user}` : undefined;
}

/** The articles in a Medium RSS feed, newest first, as the feed lists them. */
export function parseFeed(xml: string): Article[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap(([, item = '']) => {
    const title = text(field(item, 'title'));
    // Drop Medium's tracking query from the link.
    const url = field(item, 'link').split('?')[0] ?? '';
    const date = new Date(field(item, 'pubDate'));
    if (!title || !url.startsWith('https://') || Number.isNaN(date.getTime())) return [];
    // The subtitle if the story has one (a short heading like "Introduction" isn't), else its first real paragraph.
    const body = field(item, 'content:encoded');
    const heading = text(body.match(/<h[34]>([\s\S]*?)<\/h[34]>/)?.[1] ?? '');
    const paragraph = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(([, p = '']) => text(p)).find((p) => p.length >= 40) ?? '';
    const lead = heading.length > 30 ? heading : paragraph || heading;
    const summary = lead.length > 180 ? `${lead.slice(0, 177).replace(/\s+\S*$/, '')}…` : lead;
    const tags = [...item.matchAll(/<category><!\[CDATA\[([^\]]+)\]\]><\/category>/g)].map(([, tag = '']) => tag.replace(/-/g, ' '));
    return [{ title, url, date: date.toISOString(), summary, tags }];
  });
}

export async function latestArticles(profileUrl: string, count = 3): Promise<Article[]> {
  const url = feedUrl(profileUrl);
  if (!url) return [];
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'resulcay.com' },
      signal: AbortSignal.timeout(3000),
      cf: { cacheTtl: 3600, cacheEverything: true },
    } as RequestInit);
    if (!response.ok) return [];
    return parseFeed(await response.text()).slice(0, count);
  } catch {
    return [];
  }
}
