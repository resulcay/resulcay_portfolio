import { describe, expect, it } from 'vitest';
import { feedUrl, parseFeed } from '@/infrastructure/medium';

const item = (body: string) => `<item>${body}</item>`;

const FEED = `<?xml version="1.0"?><rss><channel><title><![CDATA[Stories by Resul Cay on Medium]]></title>
${item(`<title><![CDATA[How to Fix “INSTALL_FAILED” on MIUI]]></title>
<link>https://medium.com/@resulcay/how-to-fix-7675156e40d4?source=rss-afe3abe568d2------2</link>
<category><![CDATA[error-handling]]></category><category><![CDATA[flutter]]></category>
<pubDate>Thu, 27 Nov 2025 00:12:56 GMT</pubDate>
<content:encoded><![CDATA[<figure><img src="x.png" /></figure><h3>A friendly story for Flutter &amp; ADB developers</h3><p>First paragraph.</p>]]></content:encoded>`)}
${item(`<title><![CDATA[Staggered grids]]></title>
<link>https://medium.com/@resulcay/staggered-1</link>
<pubDate>Tue, 01 Aug 2023 20:56:42 GMT</pubDate>
<content:encoded><![CDATA[<p>${'word '.repeat(60)}</p>]]></content:encoded>`)}
${item(`<title><![CDATA[No date]]></title><link>https://medium.com/@resulcay/x</link>`)}
</channel></rss>`;

describe('parseFeed', () => {
  const [first, second, ...rest] = parseFeed(FEED);

  it('reads title, clean link, date and tags', () => {
    expect(first).toMatchObject({
      title: 'How to Fix “INSTALL_FAILED” on MIUI',
      url: 'https://medium.com/@resulcay/how-to-fix-7675156e40d4',
      date: '2025-11-27T00:12:56.000Z',
      tags: ['error handling', 'flutter'],
    });
  });

  it('sums up with the subtitle, decoded, else a shortened first paragraph', () => {
    expect(first?.summary).toBe('A friendly story for Flutter & ADB developers');
    expect(second?.summary.length).toBeLessThanOrEqual(180);
    expect(second?.summary.endsWith('word…')).toBe(true);
  });

  it('skips items it cannot date', () => {
    expect(rest).toEqual([]);
  });
});

describe('feedUrl', () => {
  it('turns a profile link into its feed', () => {
    expect(feedUrl('https://medium.com/@resulcay')).toBe('https://medium.com/feed/@resulcay');
    expect(feedUrl('https://example.com/me')).toBeUndefined();
  });
});
