/**
 * Client-story derivation — pure, dependency-free, safe on both sides of the wire.
 *
 * A story belongs to a video, and the owner should not have to write the same attribution
 * twice. When the client name is left blank this works out what the piece *already says* from
 * its own title and description ("Wedding", "Child dedication", "Promotional campaign") and
 * names the attribution accordingly ("Wedding clients"). It never invents a name, a quotation,
 * a year or a result: if nothing matches, the context is simply "Media production" and an
 * unnamed story stays unnamed.
 *
 * It lives apart from `portfolio.ts` (which reads the database) so the CMS client components can
 * preview exactly the same label the public rail will show.
 */
import { STORY_KINDS } from '../cms/options';

export interface StorySource {
  title: string;
  description?: string | null;
  /** The plain `client` column on the video record. */
  client?: string | null;
  /** The dedicated client-story name, when the owner wrote one. */
  storyClient?: string | null;
  /** The stored kind (`strory_kind` option value), when the owner picked one. */
  storyKind?: string | null;
}

export interface DerivedStory {
  author: string;
  context: string;
  /** False when nothing at all identified the piece — the rail then shows no attribution. */
  matched: boolean;
}

/**
 * Ordered most specific first: "child dedication" must beat the generic "event", and a wedding
 * mention must beat "church" when a piece is both.
 */
const STORY_RULES: { test: RegExp; context: string; clients: string | null }[] = [
  { test: /dedication/, context: 'Child dedication', clients: 'Dedication clients' },
  { test: /wedding|marri|bride|groom/, context: 'Wedding', clients: 'Wedding clients' },
  { test: /photoshoot|photo shoot|photograph|portrait session/, context: 'Photoshoot', clients: 'Photoshoot client' },
  { test: /promo|promotional|advert|commercial|brand campaign|awareness|campaign/, context: 'Promotional campaign', clients: 'Campaign client' },
  { test: /music video|lyric video/, context: 'Music video', clients: 'Artiste' },
  { test: /convention|conference|summit|seminar|symposium|web3|tech event/, context: 'Conference', clients: 'Conference client' },
  { test: /church|gospel|worship|ministry|crusade/, context: 'Church media', clients: 'Church media client' },
  { test: /students?'?\s*week|school|graduation|convocation|faculty/, context: 'School event', clients: 'School client' },
  { test: /birthday|anniversary|celebration/, context: 'Celebration', clients: 'Celebration client' },
  { test: /burial|funeral|memorial|remembrance/, context: 'Memorial', clients: 'Family' },
];

export function kindLabel(value: string): string {
  const explicit = STORY_KINDS.find((entry) => entry.value === value);
  if (explicit) return explicit.label;
  // A value outside the list still prints as words rather than as a slug.
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** The context a title/description implies. Exported so the admin board can show its working. */
export function detectStoryContext(text: string): { context: string; clients: string | null } {
  const haystack = text.toLowerCase();
  for (const rule of STORY_RULES) {
    if (rule.test.test(haystack)) return { context: rule.context, clients: rule.clients };
  }
  return { context: 'Media production', clients: null };
}

/**
 * Words that describe the *piece* rather than a person, so "Wedding — Full Film" never becomes
 * "Wedding clients: Full Film". Only ever used to reject a candidate, never to build one.
 */
const NOT_A_NAME = new Set([
  'film', 'films', 'highlight', 'highlights', 'trailer', 'teaser', 'reel', 'reels', 'video', 'videos',
  'edit', 'edits', 'cut', 'full', 'part', 'parts', 'final', 'version', 'preview', 'recap', 'clip',
  'clips', 'scenes', 'bts', 'behind', 'the', 'day', 'days', 'session', 'sessions', 'coverage',
  'photography', 'photos', 'story', 'stories', 'documentary', 'short', 'long', 'official', 'new',
  'event', 'events', 'wedding', 'weddings', 'dedication', 'campaign', 'promo', 'commercial', 'project',
]);

const NAME_CONNECTORS = new Set(['and', '&', '+', 'with', 'x']);

/**
 * The names a title already carries: "Wedding Highlight — Mary and Real" → "Mary and Real".
 * Conservative on purpose — the last segment must look like two or more capitalised words joined by
 * "and"/"&"/"+"/"with", hold no digits, and not be built only from production words. Anything
 * ambiguous yields nothing: a wrong name is worse than a generic one.
 */
export function namesFromTitle(title: string): string | null {
  const segments = title
    .split(/\s+[—–|•]\s+|\s+-\s+|\s*:\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (segments.length < 2) return null;
  const candidate = (segments[segments.length - 1] ?? '').replace(/[.,)\]"']+$/, '').trim();
  if (!candidate || /[0-9]/.test(candidate)) return null;
  const words = candidate.split(/\s+/);
  if (words.length < 2 || words.length > 5) return null;
  let connectors = 0;
  let names = 0;
  for (const word of words) {
    // "&" and "+" must survive the punctuation strip to count as a connector.
    const bare = word.replace(/[&+,.]/g, '');
    const connectorKey = bare.toLowerCase() || word.toLowerCase().replace(/[.,]/g, '');
    if (NAME_CONNECTORS.has(connectorKey)) {
      connectors += 1;
      continue;
    }
    if (!/^[A-Z][\p{L}'’-]*$/u.test(word)) return null;
    if (!NOT_A_NAME.has(word.toLowerCase())) names += 1;
  }
  // "Mary and Real" (a connector) and "The Okon Family" (two name-like words) both qualify;
  // "Full Film" and "Behind The Scenes" do not.
  return names >= 1 && (connectors >= 1 || names >= 2) ? candidate : null;
}

export function deriveStory(input: StorySource): DerivedStory {
  const text = `${input.title} ${input.description ?? ''}`;
  const name = (input.storyClient ?? '').trim() || (input.client ?? '').trim();
  const detected = detectStoryContext(text);
  const picked = input.storyKind && input.storyKind !== 'auto' ? input.storyKind : null;
  const context = picked ? kindLabel(picked) : detected.context;
  if (name) return { author: name, context, matched: true };
  if (detected.clients) {
    // "Wedding clients" alone is honest but thin — when the title names the people, keep them.
    const names = namesFromTitle(input.title);
    return { author: names ? `${detected.clients}: ${names}` : detected.clients, context, matched: true };
  }
  return { author: '', context, matched: false };
}
