/**
 * Markdown rendering for CMS-authored body copy.
 * Markdown is parsed server-side and the HTML is whitelisted — no raw HTML from
 * admin input is ever trusted.
 */
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'blockquote', 'strong', 'em', 'a', 'code', 'pre',
    'figure', 'figcaption', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'br', 'hr', 'span', 'video', 'source',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    code: ['class'],
    pre: ['class'],
    span: ['class'],
    video: ['src', 'poster', 'controls', 'muted', 'playsinline', 'preload', 'loop'],
    source: ['src', 'type'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        ...(attribs.href && !attribs.href.startsWith('/') ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {}),
      },
    }),
    h1: () => ({ tagName: 'h2', attribs: {} }),
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: 'lazy', decoding: 'async' },
    }),
  },
};

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(source: string | null | undefined): string {
  if (!source) return '';
  const raw = String(source).slice(0, 200_000);
  const html = marked.parse(raw, { async: false }) as string;
  return sanitizeHtml(html, SANITIZE);
}

export function markdownExcerpt(source: string | null | undefined, length = 180): string {
  if (!source) return '';
  const text = sanitizeHtml(String(source), { allowedTags: [], allowedAttributes: {} })
    .replace(/[#>*_`~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length <= length ? text : `${text.slice(0, length - 1).trimEnd()}…`;
}
