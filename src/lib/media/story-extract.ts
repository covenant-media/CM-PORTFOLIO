/**
 * Client-story extraction for the CMS.
 *
 * A story belongs to a video. The owner writes the quote, but the client name and the
 * kind of work are often already sitting in the video's own title or description —
 * "Prostate & Cervical Cancer Screening Awareness Video" is plainly a campaign, and
 * "Wedding Clients: Mary and Real" names the couple. When the owner leaves the client
 * name blank, the console offers what the video says instead of making them retype it.
 *
 * The rule that governs every branch below: **nothing is invented.** Each extractor
 * either finds a phrase in the source text and returns it, or returns null. A guess is
 * worse than a blank field, because a blank field is visibly a blank field and a wrong
 * name on a client story is a false claim about a real person.
 */

/** The kinds of work the media surface can name, in the order they are offered. */
export const STORY_TYPES = [
  { value: 'wedding', label: 'Wedding', role: 'Wedding client' },
  { value: 'campaign', label: 'Campaign / promo', role: 'Campaign client' },
  { value: 'photoshoot', label: 'Photoshoot', role: 'Photoshoot client' },
  { value: 'event', label: 'Event / conference', role: 'Event client' },
  { value: 'documentary', label: 'Documentary / story', role: 'Documentary subject' },
  { value: 'music', label: 'Music video', role: 'Artist' },
  { value: 'celebration', label: 'Birthday / dedication', role: 'Family' },
  { value: 'other', label: 'Something else', role: 'Client' },
] as const;

export type StoryType = (typeof STORY_TYPES)[number]['value'];

export const STORY_TYPE_VALUES = STORY_TYPES.map((t) => t.value);

export function storyTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return STORY_TYPES.find((t) => t.value === value)?.label ?? null;
}

export function storyRoleFor(value: string | null | undefined): string | null {
  if (!value) return null;
  return STORY_TYPES.find((t) => t.value === value)?.role ?? null;
}

/** Keyword → story type. Order matters: the first match wins. */
const TYPE_KEYWORDS: { type: StoryType; words: RegExp }[] = [
  { type: 'wedding', words: /\bwedding|brid(e|al)|groom|pre-?wedding|traditional marriage\b/i },
  { type: 'celebration', words: /\bbirthday|dedication|anniversary|naming ceremony|baby\b/i },
  { type: 'music', words: /\bmusic video|\bofficial video|\bartist\b|\bsong\b|cover video\b/i },
  { type: 'documentary', words: /\bdocumentary|\bdocu-|\bstory of\b|\bshort film\b/i },
  { type: 'photoshoot', words: /\bphoto ?shoot|\bportraits?\b|\bshoot\b|\bheadshots?\b|\blookbook\b/i },
  {
    type: 'campaign',
    words: /\bcampaign|\bpromo(tional)?\b|\bawareness\b|\bbrand film\b|\badvert\b|\bcommercial\b|\blaunch\b|\bpsa\b/i,
  },
  { type: 'event', words: /\bconference|\bsummit\b|\bseminar\b|\bworkshop\b|\bevent\b|\bceremony\b|\bgraduation\b|\bservice\b/i },
];

export interface ExtractedStory {
  /** The client as the video names them. Null when the video never says. */
  clientName: string | null;
  /** The kind of work. Null when no keyword matches. */
  videoType: StoryType | null;
  /** A role line derived from the type, e.g. "Wedding client". */
  roleLabel: string | null;
  /** Where the name came from, so the console can explain itself. */
  nameSource: 'client_field' | 'clients_pattern' | 'names_pattern' | 'for_pattern' | null;
}

export interface StorySource {
  title?: string | null;
  description?: string | null;
  client?: string | null;
}

/**
 * Pull a client story out of a video record.
 *
 * Deliberately conservative: it reads only what the video says about itself, and it
 * returns nulls rather than a plausible-looking fabrication.
 */
export function extractStory(source: StorySource): ExtractedStory {
  const title = clean(source.title);
  const description = clean(source.description);
  const client = clean(source.client);
  const haystack = [title, description].filter(Boolean).join(' — ');

  const videoType = detectType(haystack);
  const roleLabel = storyRoleFor(videoType);

  // A client name typed into the video record itself is a fact, so it wins.
  if (client) {
    return { clientName: client, videoType, roleLabel, nameSource: 'client_field' };
  }

  const named = fromClientsPattern(haystack);
  if (named) return { clientName: named, videoType, roleLabel, nameSource: 'clients_pattern' };

  const couple = fromNamesPattern(haystack);
  if (couple) return { clientName: couple, videoType, roleLabel, nameSource: 'names_pattern' };

  const forName = fromForPattern(haystack);
  if (forName) return { clientName: forName, videoType, roleLabel, nameSource: 'for_pattern' };

  return { clientName: null, videoType, roleLabel, nameSource: null };
}

function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function detectType(haystack: string): StoryType | null {
  if (!haystack) return null;
  for (const entry of TYPE_KEYWORDS) {
    if (entry.words.test(haystack)) return entry.type;
  }
  return null;
}

/** "Wedding Clients: Mary and Real" / "Client — Alphex Digitalz". */
function fromClientsPattern(haystack: string): string | null {
  const match = haystack.match(/\bclients?\b\s*[:\-–—]\s*([^.,;—|]{2,60})/i);
  return normaliseName(match?.[1]);
}

/**
 * Two capitalised names joined by "and" or "&" — the shape a wedding or a couple
 * shoot is written in. Both sides must look like a name, which is what stops the
 * pattern reading "Shot and edited" as a client.
 */
function fromNamesPattern(haystack: string): string | null {
  const match = haystack.match(/\b([A-Z][a-z'’]{1,20})\s+(?:and|&)\s+([A-Z][a-z'’]{1,20})\b/);
  if (!match) return null;
  return normaliseName(`${match[1]} and ${match[2]}`);
}

/** "produced for Alphex Digitalz", "a film for NAAKISS". */
function fromForPattern(haystack: string): string | null {
  const match = haystack.match(/\bfor\s+([A-Z][\w&.'’-]*(?:\s+[A-Z][\w&.'’-]*){0,3})\b/);
  return normaliseName(match?.[1]);
}

/** Trim connectors and stray punctuation so a label reads as a name. */
function normaliseName(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value
    .replace(/\s+/g, ' ')
    .replace(/^[:\-–—,\s]+|[:\-–—,.\s]+$/g, '')
    .trim();
  if (trimmed.length < 2 || trimmed.length > 60) return null;
  // A sentence is not a name.
  if (/\b(the|and|with|for|from|this|that|our|their)\b$/i.test(trimmed)) return null;
  if (!/[A-Za-z]/.test(trimmed)) return null;
  return trimmed;
}

/** Human-readable explanation shown next to an auto-filled name in the console. */
export function explainNameSource(nameSource: ExtractedStory['nameSource']): string | null {
  switch (nameSource) {
    case 'client_field':
      return 'Taken from the client field on the video.';
    case 'clients_pattern':
      return 'Read from a "Client:" / "Clients:" line in the title or description.';
    case 'names_pattern':
      return 'Read from the two names joined by "and" in the title.';
    case 'for_pattern':
      return 'Read from "for …" in the title or description.';
    default:
      return null;
  }
}
