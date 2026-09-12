/**
 * Media Portfolio contract tests.
 *
 * These cover the parts of the redesign that break silently: which format each section is
 * allowed to contain, that the loop wraps exactly, that mute handling stays honest per
 * platform, and that no developer-facing string or invented commercial claim reaches the page.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildEmbed, posterCandidates, resolvePlayable } from '../src/lib/media/embed';
import { clampDrag, wrapOffset } from '../src/components/site/MediaTicker';
import {
  MEDIA_HERO_ITEM,
  MEDIA_STATS,
  MEDIA_TOOLS,
  LONG_FORM_ITEMS,
  MEDIA_CAPABILITIES,
  MEDIA_PRICING,
  MEDIA_PROCESS,
  MEDIA_ROLES,
  MEDIA_SERVICES,
  MEDIA_SOCIALS,
  MEDIA_STUDIO,
  MEDIA_TESTIMONIALS,
  PHOTO_ITEMS,
  SHORT_FORM_ITEMS,
} from '../src/lib/media/sample-portfolio';

/* ── section integrity ─────────────────────────────────────────────────────── */

test('each section only contains its own format', () => {
  for (const item of LONG_FORM_ITEMS) assert.equal(item.format, 'long', item.slug);
  for (const item of SHORT_FORM_ITEMS) assert.equal(item.format, 'short', item.slug);
  for (const item of PHOTO_ITEMS) assert.equal(item.format, 'photo', item.slug);
  assert.equal(MEDIA_HERO_ITEM.format, 'long', 'the studio hero piece is landscape work');
});

test('every video entry has a URL and a poster', () => {
  for (const item of [...LONG_FORM_ITEMS, ...SHORT_FORM_ITEMS]) {
    assert.ok(item.videoUrl, `${item.slug} needs a video URL`);
    assert.ok(item.thumbnail, `${item.slug} needs a poster`);
  }
});

test('photography entries carry an image with its real dimensions', () => {
  for (const item of PHOTO_ITEMS) {
    assert.equal(item.videoUrl, null, `${item.slug} must not claim a video`);
    assert.ok(item.image, `${item.slug} needs a real image, not a placeholder frame`);
    assert.ok(item.caption, `${item.slug} needs a caption naming where the frame came from`);
    // Either an owner-supplied file served from /uploads, or a poster on a third-party host.
    assert.match(item.image as string, /^(https:\/\/|\/uploads\/)/, `${item.slug} image must resolve to a file`);
    // The gallery lays frames out from these, so a photograph without them would be cropped.
    assert.ok(item.width && item.height, `${item.slug} needs its intrinsic width and height`);
  }
  // Portrait and landscape both have to be represented, or the layout is never exercised.
  const portrait = PHOTO_ITEMS.filter((item) => (item.width ?? 1) < (item.height ?? 0));
  const landscape = PHOTO_ITEMS.filter((item) => (item.width ?? 0) > (item.height ?? 1));
  assert.ok(portrait.length >= 2, 'the gallery needs portrait frames');
  assert.ok(landscape.length >= 1, 'the gallery needs landscape frames');
});

/* ── platform handling ─────────────────────────────────────────────────────── */

test('every video resolves to an embeddable playable with a canonical URL', () => {
  for (const item of [...LONG_FORM_ITEMS, ...SHORT_FORM_ITEMS]) {
    const playable = resolvePlayable(item.videoUrl as string, item.thumbnail);
    assert.equal(playable.source, 'youtube', item.slug);
    assert.equal(playable.capability.embeddable, true, item.slug);
    assert.ok(playable.embedUrl, item.slug);
    assert.ok(playable.canonicalUrl, item.slug);
    const chain = posterCandidates(playable, item.thumbnail);
    assert.ok(chain.length >= 3, `${item.slug} should have poster fallbacks`);
    assert.ok(chain.some((url) => /hqdefault\.jpg$/.test(url)), `${item.slug} should fall back to hq`);
  }
});

test('YouTube posters step down from maxres to hq to mq, best first', () => {
  const chain = posterCandidates(resolvePlayable('https://youtu.be/I8gUmRlm3CI'));
  assert.match(chain[0], /maxresdefault\.jpg$/);
  assert.match(chain[1], /hqdefault\.jpg$/);
  assert.match(chain[2], /mqdefault\.jpg$/);
});

test('mute is only applied where the platform really supports it', () => {
  const youtube = resolvePlayable('https://youtu.be/I8gUmRlm3CI');
  const muted = buildEmbed(youtube, 'muted', { loop: true }) as string;
  assert.match(muted, /mute=1/);
  assert.match(muted, /playlist=I8gUmRlm3CI/, 'YouTube only loops when the id is in playlist');
  assert.match(buildEmbed(youtube, 'sound') as string, /mute=0/);

  // TikTok exposes neither a keyless mute nor a derivable poster, so its embed is handed back
  // untouched and the UI waits for a click instead of pretending autoplay works.
  const tiktok = resolvePlayable('https://www.tiktok.com/@someone/video/7300000000000000000');
  assert.equal(tiktok.capability.controllableMute, false);
  assert.equal(buildEmbed(tiktok, 'muted'), tiktok.embedUrl);

  const external = resolvePlayable('https://example.test/not-a-video');
  assert.equal(external.capability.embeddable, false);
  assert.equal(buildEmbed(external, 'muted'), null);
});

/* ── the loop ──────────────────────────────────────────────────────────────── */

test('the ticker loop wraps exactly and never lands on the group width', () => {
  assert.equal(wrapOffset(0, 400), 0);
  assert.equal(wrapOffset(150, 400), 150);
  assert.equal(wrapOffset(400, 400), 0, 'a full group is the same as none of it');
  assert.equal(wrapOffset(410, 400), 10);
  assert.equal(wrapOffset(-10, 400), 390, 'negative travel wraps to the end, not to -10');
  assert.equal(wrapOffset(-810, 400), 390);
  assert.equal(wrapOffset(1e6 + 37, 400), 37);
  assert.equal(wrapOffset(5, 0), 0, 'an unmeasured group must not divide by zero');
  assert.equal(wrapOffset(Number.NaN, 400), 0);
});

/* ── copy rules ────────────────────────────────────────────────────────────── */

/** Every string a visitor can read, gathered from the data layer. */
function visibleCopy(): string[] {
  const strings: string[] = [];
  for (const item of [...LONG_FORM_ITEMS, ...SHORT_FORM_ITEMS, ...PHOTO_ITEMS]) {
    strings.push(item.title, item.description, item.kindLabel, item.role, item.caption ?? '', ...item.tags);
  }
  for (const service of MEDIA_SERVICES) strings.push(service.title, service.body, ...service.deliverables);
  for (const step of MEDIA_PROCESS) strings.push(step.title, step.body);
  for (const story of MEDIA_TESTIMONIALS) strings.push(story.quote, story.author, story.context);
  for (const group of MEDIA_PRICING) {
    strings.push(group.title, group.lede);
    for (const entry of group.packages) strings.push(entry.name, entry.summary, entry.bestFor, ...entry.includes);
  }
  strings.push(...MEDIA_CAPABILITIES, MEDIA_STUDIO.location, MEDIA_STUDIO.availability, MEDIA_STUDIO.statement);
  return strings;
}

test('visible copy is free of em dashes', () => {
  const offenders = visibleCopy().filter((value) => value.includes('—'));
  assert.deepEqual(offenders, [], 'replace em dashes with commas, colons or a rewritten sentence');
});

test('no developer or placeholder language reaches the page', () => {
  const banned = [/placeholder/i, /\bsample\b/i, /\bcms\b/i, /previewing muted/i, /one aspect ratio/i, /drag to browse/i, /to be published/i, /demo video/i, /project one/i];
  const offenders = visibleCopy().flatMap((value) => banned.filter((pattern) => pattern.test(value)).map((pattern) => `${pattern} in "${value.slice(0, 60)}"`));
  assert.deepEqual(offenders, []);
});

test('no fee, currency or measurable result is asserted', () => {
  const strings = visibleCopy();
  const offenders = strings.filter((value) => /[₦$€£]/.test(value));
  assert.deepEqual(offenders, [], 'pricing states scope, never an invented fee');
  // Testimonials must not claim numbers: no percentages, counts or multipliers.
  const claims = MEDIA_TESTIMONIALS.filter((story) => /\d+\s*(%|x|times|views|clients|projects)/i.test(story.quote));
  assert.deepEqual(claims, [], 'no measurable result claimed in written testimonials');
});

test('roles are bare words, because the article is static', () => {
  // The hero prints "A" outside the rolling line and animates only the word, so the article
  // never travels and the line reads as a phrase at every step. A role that carried its own
  // article would render as "A a videographer".
  for (const role of MEDIA_ROLES) {
    assert.doesNotMatch(role, /^a n?\s|^an\s/i, `"${role}" must not carry its own article`);
    assert.match(role, /^[A-Z][a-z]+( [A-Za-z]+)*$/, `"${role}" should be a plain job title`);
  }
  assert.equal(new Set(MEDIA_ROLES).size, MEDIA_ROLES.length, 'roles are unique');
  assert.ok(!MEDIA_ROLES.some((role) => /stream/i.test(role)), 'the streaming job title is not used in the hero');
  assert.ok(MEDIA_SERVICES.some((service) => service.title === 'Live Streaming'), 'streaming is still represented as a service');
  assert.match(
    MEDIA_SERVICES.map((service) => service.body).join(' '),
    /I create and manage live streams/,
    'live streaming is described as the service it is',
  );
});

test('services and process cover the full range the brief lists', () => {
  assert.equal(MEDIA_SERVICES.length, 8);
  assert.equal(MEDIA_PROCESS.length, 5);
  for (const service of MEDIA_SERVICES) {
    assert.ok(service.body.length > 40, `${service.title} needs a real description`);
    assert.ok(service.deliverables.length >= 3, `${service.title} needs its deliverables`);
    assert.ok(service.icon, `${service.title} needs an icon`);
  }
  const titles = MEDIA_SERVICES.map((service) => service.title).join(' | ');
  for (const expected of ['Videography', 'Video Editing', 'Cinematography', 'Photography', 'Live Streaming', 'Event Coverage', 'Commercial & Promotional Videos', 'Social Media Content']) {
    assert.ok(titles.includes(expected), `missing service: ${expected}`);
  }
});

test('pricing covers the four groups and every package is scoped', () => {
  assert.equal(MEDIA_PRICING.length, 4);
  const ids = MEDIA_PRICING.map((group) => group.id);
  assert.deepEqual(ids, ['long-form', 'short-form', 'photography', 'additions']);
  for (const group of MEDIA_PRICING) {
    assert.ok(group.packages.length >= 2, `${group.title} needs packages`);
    for (const entry of group.packages) {
      assert.ok(entry.summary.length > 30, `${entry.name} needs a summary`);
      assert.ok(entry.includes.length >= 3, `${entry.name} needs to say what it covers`);
      assert.ok(entry.bestFor.length > 10, `${entry.name} needs to say who it suits`);
    }
  }
});

test('the row is exactly the six studio profiles, in order, all with real destinations', () => {
  assert.deepEqual(
    MEDIA_SOCIALS.map((entry) => entry.network),
    ['tiktok', 'facebook', 'instagram', 'linkedin', 'youtube', 'whatsapp'],
    'the row presents TikTok, Facebook, Instagram, LinkedIn, YouTube and WhatsApp, in that order',
  );
  for (const entry of MEDIA_SOCIALS) {
    assert.ok(entry.label, `${entry.network} needs a label`);
    assert.match(entry.url, /^https:\/\/[^#\s]+$/, `${entry.network} must point somewhere real, never "#"`);
    // Never a platform home page: every entry is the studio's own destination.
    assert.doesNotMatch(
      entry.url,
      /^https:\/\/www\.(facebook|instagram|linkedin)\.com\/?$/,
      `${entry.network} must be the studio's profile, not the platform home`,
    );
  }
  // The profiles the owner supplied, plus the three confirmed from the studio's own output.
  assert.ok(MEDIA_SOCIALS.find((e) => e.network === 'tiktok')?.url.includes('covenant.media'));
  assert.ok(MEDIA_SOCIALS.find((e) => e.network === 'facebook')?.url.includes('1C8JPrYov1'));
  assert.ok(MEDIA_SOCIALS.find((e) => e.network === 'instagram')?.url.includes('covenant_media_tv'));
  assert.ok(MEDIA_SOCIALS.find((e) => e.network === 'linkedin')?.url.includes('covenant-media-021b242a3'));
  assert.ok(MEDIA_SOCIALS.find((e) => e.network === 'youtube')?.url.includes('Covenant_Media'));
  assert.ok(MEDIA_SOCIALS.find((e) => e.network === 'whatsapp')?.url.includes('2349064095620'));
});

test('every tool in the strip is one of the marks the section can draw', () => {
  const drawn = /case '(capcut|davinci|obs|vmix|lightroom|photoshop|premiere)':/g;
  const source = read('src/components/ui/ToolMark.tsx');
  const available = new Set(Array.from(source.matchAll(drawn), (m) => m[1]));
  for (const tool of MEDIA_TOOLS) {
    assert.ok(available.has(tool.id), `ToolMark has no mark for ${tool.id}`);
    assert.ok(tool.name.length > 2, `${tool.id} needs an accessible name`);
  }
  // The strip shows marks, never names, so the section must not print the labels.
  const section = read('src/components/site/MediaTools.tsx');
  assert.doesNotMatch(section, /\{tool\.name\}<\//, 'the tool name is announced, not printed');
});

test('studio contact details are the published ones', () => {
  assert.equal(MEDIA_STUDIO.phone, '09064095620');
  assert.equal(MEDIA_STUDIO.email, 'covenantmedia0015@gmail.com');
  assert.equal(MEDIA_STUDIO.whatsapp, '2349064095620');
  assert.match(MEDIA_STUDIO.location, /Lagos/);
  assert.ok(MEDIA_STUDIO.portrait.startsWith('/images/'), 'the founder portrait is a real file in the repo');
});

/* ── this round's hard rules, pinned at the source ─────────────────────────── */

const read = (relative: string) => readFileSync(join(import.meta.dirname, '..', relative), 'utf8');
const MEDIA_CARDS = read('src/components/site/MediaCards.tsx');
const MEDIA_GALLERIES = read('src/components/site/MediaGalleries.tsx');
const MEDIA_PLAYER = read('src/components/site/MediaVideoPlayer.tsx');
const MEDIA_PAGE = read('src/components/site/MediaPortfolioPage.tsx');

test('the studio figures are the four that were supplied, in order', () => {
  assert.deepEqual(
    MEDIA_STATS.map((stat) => `${stat.value}${stat.suffix}`),
    ['8+', '40+', '30+', '96%'],
  );
  for (const stat of MEDIA_STATS) assert.ok(stat.label.length > 4, `${stat.label} needs a real label`);
});

test('nothing in the catalogue repeats, so a rolling row never shows a duplicate', () => {
  const videos = [...LONG_FORM_ITEMS, ...SHORT_FORM_ITEMS].map((item) => item.videoUrl);
  assert.equal(new Set(videos).size, videos.length, 'two entries share a video');
  const slates = [...LONG_FORM_ITEMS, ...SHORT_FORM_ITEMS, ...PHOTO_ITEMS].map((item) => item.slug);
  assert.equal(new Set(slates).size, slates.length, 'two entries share a slug');
  const images = PHOTO_ITEMS.map((item) => item.image);
  assert.equal(new Set(images).size, images.length, 'two photographs share a file');
  // Enough long-form work that neither row repeats inside a desktop viewport.
  assert.ok(LONG_FORM_ITEMS.length >= 6, 'the long-form rows need enough unique pieces');
});

test('short-form never starts playing on its own', () => {
  const rail = MEDIA_GALLERIES.slice(MEDIA_GALLERIES.indexOf('export function MediaShortFormRail'));
  const body = rail.slice(0, rail.indexOf('/* ── photography'));
  assert.match(body, /preview="none"/, 'the rail must render still cards');
  assert.doesNotMatch(body, /preview="(in-view|hover)"/, 'no preview mode may start a player by itself');
  // The preview machinery itself stays for the long-form rows, but a card can no longer be
  // asked to start when it scrolls into view anywhere in the gallery file.
  assert.doesNotMatch(MEDIA_GALLERIES, /preview="in-view"/, 'nothing previews merely by being on screen');
});

test('the details card is opaque, prints no description and opens the piece with sound', () => {
  assert.match(MEDIA_CARDS, /bg-\[color:var\(--color-ink-1000\)\]/, 'the modal backdrop is a solid colour');
  const dialog = MEDIA_CARDS.slice(MEDIA_CARDS.indexOf('role="dialog"'));
  const dialogHead = dialog.slice(0, dialog.indexOf('</div>\n    </div>'));
  assert.doesNotMatch(dialogHead, /backdrop-blur/, 'nothing may show through the modal backdrop');
  assert.doesNotMatch(MEDIA_CARDS, /clamp-3|item\.description/, 'the description is never rendered');
  assert.match(MEDIA_CARDS, /startWithSound/, 'a card the visitor opened plays with sound');
  assert.doesNotMatch(MEDIA_PLAYER, /Tap for sound/, 'the sound banner is gone');
});

test('no persistent floating buttons remain on the media surface', () => {
  for (const removed of ['MediaBand', 'MediaSocialRail', 'MediaHeroReel']) {
    assert.equal(existsSync(join(import.meta.dirname, `../src/components/site/${removed}.tsx`)), false, `${removed} was removed on request`);
  }
  const sources = ['MediaPortfolioPage', 'MediaPricingPage', 'MediaCatalogView', 'ExperienceShell'];
  for (const name of sources) {
    const file = read(`src/components/site/${name}.tsx`);
    assert.doesNotMatch(file, /MediaBand|MediaSocialRail/, `${name} must not render a floating action`);
  }
  // Back-to-top is the single persistent control, and it is still present.
  assert.match(read('src/components/site/MediaPortfolioPage.tsx'), /MediaBackToTop/);
});

test('the hero is a two-column composition with the video card and the social row in it', () => {
  assert.match(MEDIA_PAGE, /lg:grid-cols-\[minmax\(0,1\.06fr\)/, 'the hero text column keeps the larger share');
  assert.match(MEDIA_PAGE, /<MediaHeroVideo items=\{HERO_SHORT_ITEMS\} \/>/, 'the hero card is placed in the hero and runs the vertical set');
  assert.match(MEDIA_PAGE, /Hello, I&#x27;m|Hello, I&apos;m/, 'the greeting eyebrow opens the hero');
  assert.match(MEDIA_PAGE, /<MediaSocialButtons \/>/, 'the social row is placed under the calls to action');
  assert.match(MEDIA_PAGE, /<MediaRoleLine[\s\S]*?prefix="A"/, 'the role line takes a static article');
  assert.match(MEDIA_PAGE, /\/media\/long-form[\s\S]*?\/media\/short-form[\s\S]*?\/media\/photography/, 'each work section links to its catalog');
});

test('the hero card advances on its own, holds 5-10s, and can be stepped by hand', () => {
  const card = read('src/components/site/MediaHeroVideo.tsx');
  const advance = /const ADVANCE_MS = (\d+);/.exec(card);
  assert.ok(advance, 'the card declares its own dwell time');
  const ms = Number(advance[1]);
  assert.ok(ms >= 5000 && ms <= 10000, `dwell time must sit between 5s and 10s, found ${ms}ms`);
  assert.match(card, /aria-label="Previous short-form piece"/, 'there is a previous control');
  assert.match(card, /aria-label="Next short-form piece"/, 'there is a next control');
  // Stepping by hand holds the card, so it never fights the visitor.
  assert.match(card, /setHeld\(true\)/, 'a manual step holds the card');
  assert.match(card, /prefers-reduced-motion|reduced/, 'reduced motion stops the automatic advance');
  // It is a preview: it starts muted and only the details card plays with sound.
  assert.match(card, /buildEmbed\(itemPlayable, 'muted'/, 'the card previews muted');
  assert.doesNotMatch(card, /startWithSound/, 'the card never takes sound for itself');
});

test('the details card fits the screen and the stage plays as soon as it opens', () => {
  // No page scroll inside the details card, and a panel bounded by the viewport.
  assert.match(MEDIA_CARDS, /overscroll-none/, 'the overlay does not scroll the page');
  assert.match(MEDIA_CARDS, /max-h-\[calc\(100svh-1\.5rem\)\]/, 'the panel never exceeds the viewport');
  // Vertical work is measured from the video itself: exactly 9:16, bounded by the viewport in
  // both directions, and the card's width is built from that stage — so the border wraps the
  // video and the card is never wider than the piece it is showing.
  assert.match(
    MEDIA_CARDS,
    /const VERTICAL_STAGE_WIDTH = 'min\(calc\(96vw - 3\.5rem\), calc\(min\(70svh, 40rem\) \* 9 \/ 16\)\)'/,
    'the portrait stage has one definition, bounded by the viewport height and width',
  );
  assert.match(MEDIA_CARDS, /aspectRatio: '9 \/ 16'/, 'the portrait stage is exactly the video\'s ratio');
  assert.match(MEDIA_CARDS, /calc\(\$\{VERTICAL_STAGE_WIDTH\} \+ \$\{VERTICAL_CARD_PADDING\}\)/, 'the card is the stage plus its padding, nothing wider');
  // The wide stage is bounded by height too, or a short laptop screen clips the card.
  assert.match(MEDIA_CARDS, /calc\(\(100svh_-_9rem\)\*16\/9\)/, 'the wide panel shrinks to fit the viewport height');
  // Opening a card is the gesture: the player mounts already playing, with sound.
  assert.match(MEDIA_CARDS, /startWithSound/, 'the opened piece plays with sound');
  assert.match(MEDIA_PLAYER, /if \(!autoAllowed\) return;/, 'the player starts from its own effect');
});

test('no ambient surface can ever make a sound', () => {
  // Only two call sites may ask for sound, and both of them are inside a card the visitor
  // opened. Everything else passes nothing, which means muted.
  const callers = [
    ['src/components/site/MediaCards.tsx', true],
    ['src/components/site/MediaHeroVideo.tsx', false],
    ['src/components/site/MediaGalleries.tsx', false],
    ['src/components/site/MediaCatalogGrid.tsx', false],
  ] as const;
  for (const [file, allowed] of callers) {
    const source = read(file);
    if (allowed) continue;
    assert.doesNotMatch(source, /startWithSound/, `${file} must not start playback with sound`);
  }
  assert.match(MEDIA_PLAYER, /muted=\{phase !== 'sound'\}/, 'a silent phase is always muted');
});

test('the footer never renders an empty social row on the media surface', () => {
  // The CMS social rows are drafts, so each media screen falls back to MEDIA_SOCIALS. The row is
  // five buttons, in the order the hero presents them.
  for (const file of ['MediaPortfolioPage', 'MediaCatalogScreen', 'MediaPricingPage']) {
    const source = read(`src/components/site/${file}.tsx`);
    assert.match(source, /ctx\.social\.length \? ctx\.social : MEDIA_SOCIALS/, `${file} needs the published-profile fallback`);
  }
  const page = read('src/components/site/MediaPortfolioPage.tsx');
  assert.match(page, /socials=\{socials\}/, 'the page hands the resolved profiles to the footer');
});

test('the media footer keeps the tech footer arrangement and its own surface', () => {
  const footer = read('src/components/site/SiteFooter.tsx').replace(/\r\n/g, '\n');
  // Its own branch, opened by surface.
  assert.match(footer, /if \(surface === 'media'\) \{/, 'the media footer is its own arrangement');
  const media = footer.slice(footer.indexOf("if (surface === 'media')"), footer.indexOf('return (\n    <footer className="relative isolate mt-px'));
  const tech = read('src/components/site/TechFooter.tsx');
  for (const shared of ['Stay in Touch', 'Services', 'Newsletter', 'Subscribe for insights and updates.']) {
    assert.ok(media.includes(shared), `media footer is missing ${shared}`);
    assert.ok(tech.includes(shared), `tech footer is missing ${shared}`);
  }
  // One field, one button: the oversized two-column newsletter band is gone.
  assert.doesNotMatch(media, /md:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\]/, 'no oversized newsletter band');
  assert.match(media, /id="media-nl"/, 'one labelled newsletter field');
  // The tech and main arrangements are untouched: the shared branch still has its columns.
  assert.match(footer, /mask-link text-fg-muted/, 'the shared footer keeps its Direct column');
});

test('the catalogs filter, and end on the same enquiry form as the front page', () => {
  assert.match(read('src/components/site/MediaCatalogGrid.tsx'), /FilterBar/, 'the catalog has category filters');
  assert.match(read('src/components/site/MediaCatalogView.tsx'), /inquiry/, 'the catalog ends with the form');
  assert.match(read('src/components/site/MediaCatalogScreen.tsx'), /MediaInquiryForm/, 'the catalog reuses the media enquiry form');
});

test('the photography wall keeps each frame at its own ratio and prints nothing on it', () => {
  const wall = MEDIA_GALLERIES.slice(MEDIA_GALLERIES.indexOf('export function MediaPhotoWall'));
  assert.match(wall, /aspectRatio: ratio/, 'frames take their own proportions');
  // The title may appear as alt text (it is the photograph's name), but never as a caption on
  // the tile: the wall has no text nodes at all beyond the closing note under the grid.
  assert.doesNotMatch(wall, /<span[^>]*leading-tight[^>]*>\s*\{entry\.title\}/, 'no title is printed on a photograph');
  assert.doesNotMatch(wall, /uppercase[^>]*>\s*\{entry\.kindLabel\}/, 'no format label is printed on a photograph');
  assert.match(wall, /mediaGallery: true/, 'the viewer is told this is a photography gallery');
  assert.match(read('src/components/ui/Lightbox.tsx'), /var\(--color-ink-1000\)/, 'the photo viewer is opaque');
});

/* ── the correction round's hard rules ─────────────────────────────────────────────────────── */

test('the details card is mounted on the body so nothing can show through or around it', () => {
  const portal = /createPortal\(/.test(MEDIA_CARDS);
  assert.ok(portal, 'the modal is portalled to the document body, clear of any transformed ancestor');
  assert.match(MEDIA_CARDS, /document\.body,/, 'the portal target is the body');
  // No opacity fade on a modal: a fading overlay is a fading view of the page behind it.
  const modal = MEDIA_CARDS.slice(MEDIA_CARDS.indexOf('return createPortal('));
  assert.doesNotMatch(modal, /cm-fade-in|cm-fade-up/, 'the modal never fades in over the page');
  assert.match(modal, /animation: 'cm-panel-in/, 'the panel arrives on transform alone');
  // Long titles wrap inside the panel instead of spilling out of it.
  assert.match(MEDIA_CARDS, /break-words font-display/, 'the title wraps rather than overflowing');
});

test('an opened piece starts playing without a second click', () => {
  // YouTube will not start a fresh frame unmuted, so the embed is mounted muted (the start every
  // browser honours) and the sound is switched on by commanding the player that is already up.
  assert.match(MEDIA_PLAYER, /enablejsapi|'muted'/, 'a YouTube frame mounts on the muted start');
  assert.match(MEDIA_PLAYER, /buildEmbed\(playable, youtube \? 'muted' : phase/, 'YouTube is asked for a muted start, then unmuted');
  assert.match(MEDIA_PLAYER, /command\('unMute'\)/, 'the running player is unmuted over its command channel');
  assert.match(MEDIA_PLAYER, /command\('playVideo'\)/, 'and told to play, so no play button is needed');
  assert.match(MEDIA_PLAYER, /postMessage/, 'the command channel is the embed\'s own postMessage API');
  // The frame is never rebuilt to change its sound: the source is frozen once it exists.
  assert.match(MEDIA_PLAYER, /if \(phase === 'idle' \|\| !embeddableLater \|\| src\) return;/, 'the embed source is built once');
});

test('the hero reel rolls: eight seconds each, the waiting pieces playing beside the card', () => {
  const card = read('src/components/site/MediaHeroVideo.tsx');
  const advance = /const ADVANCE_MS = (\d+);/.exec(card);
  assert.ok(advance, 'the card declares its own dwell time');
  assert.equal(Number(advance[1]), 8000, 'each piece plays for eight seconds');
  // The piece on screen and the two waiting beside it are live players, not posters: the
  // previous and the next are already running when either arrow is pressed, which is what
  // removes the pause and the reload at the switch.
  assert.match(card, /state === 'current' \|\| state === 'next'/, 'the waiting piece mounts a player too');
  assert.match(card, /translate3d\(calc\(100% \+ var\(--cm-gap\)\),0,0\)/, 'the incoming piece waits one slide to the right');
  assert.match(card, /--cm-peek/, 'part of the incoming piece shows outside the card');
  // The dimmed plates that used to flank the frame are gone.
  assert.doesNotMatch(card, /posterFor\(previous\)|posterFor\(next\)|opacity-25/, 'no dimmed plate sits behind the card');
});

test('the greeting wears the logo: the given name in the brand gold, the surname in its white', () => {
  const greeting = MEDIA_PAGE.slice(MEDIA_PAGE.indexOf('<h1'), MEDIA_PAGE.indexOf('</h1>'));
  // The name is plain text at display size, the Tech hero's approach, so a masked in-view reveal
  // can never leave it stranded inside its own clip box — it cannot ship hidden.
  assert.doesNotMatch(greeting, /MaskReveal/, 'the name is no longer gated behind a masked in-view reveal');
  assert.match(greeting, /className="text-\[var\(--accent\)\]">\{firstName\}/, 'the given name is the brand gold');
  assert.match(greeting, /className="text-fg[^"]*">\{lastName\}/, 'the surname is the brand white');
  assert.doesNotMatch(greeting, /font-light/, 'the name is set at a weight that holds on a dark page');
  // Restrained, not shouty, and the surname takes its own line on mobile so the two fit.
  assert.match(greeting, /text-\[clamp\(2\.1rem,5\.4vw,3\.5rem\)\]/, 'the name is set at a restrained display size');
  assert.match(greeting, /text-fg max-lg:block/, 'the surname wraps onto its own line on mobile');
  // It is revealed by the Tech hero's own mechanism: a FadeIn wrapper that is never clipped.
  assert.match(MEDIA_PAGE, /<FadeIn delay=\{140\} y=\{10\}>\s*<h1/, 'the name rides in on a FadeIn wrapper');
});

test('a strip only accepts a drag along its own direction, so it can never be pulled backwards', () => {
  // Right-to-left rows (positive speed) take a leftward pull; a rightward pull is clamped to
  // zero, which is what makes the reel snap back instead of being dragged through the loop.
  assert.equal(clampDrag(22, -60), 60, 'a right-to-left row follows a leftward pull');
  assert.equal(clampDrag(22, 60), 0, 'and refuses a rightward one');
  // Left-to-right rows (negative speed) are the mirror image.
  assert.equal(clampDrag(-20, 60), 60, 'a left-to-right row follows a rightward pull');
  assert.equal(clampDrag(-20, -60), 0, 'and refuses a leftward one');
  // Both long-form rows and the short-form rail are swipable.
  const galleries = read('src/components/site/MediaGalleries.tsx');
  assert.equal((galleries.match(/pauseOnHover draggable/g) ?? []).length, 3, 'the long-form rows and the short-form rail all swipe');
  // The swipe carries momentum and then hands back to the automatic roll.
  const ticker = read('src/components/site/MediaTicker.tsx');
  assert.match(ticker, /fling\.current \*= Math\.pow\(0\.02, dt\)/, 'a flick glides and decays back into the roll');
  assert.match(ticker, /addEventListener\('pointerup', finish\)/, 'a release outside the strip still ends the drag');
});

test('the desktop rows are sized like the 1355×920 reference: 3.5+ long-form, 4.5+ short-form', () => {
  const galleries = read('src/components/site/MediaGalleries.tsx');
  // Desktop widths are fixed rather than viewport-based, so every screen from the reference width
  // up shows the same composition instead of zooming the cards as the window grows.
  assert.match(galleries, /xl:w-\[20rem\]/, 'long-form cards are fixed at 20rem on desktop');
  assert.match(galleries, /xl:w-\[15\.5rem\]/, 'short-form cards are fixed at 15.5rem on desktop');
  // In the 1248px page column (84rem minus its own padding) that is ~3.7 and ~4.8 pieces at once.
  const column = 1344 - 2 * 48;
  assert.ok(column / (320 + 16) >= 3.5, 'at least three and a half long-form pieces fit');
  assert.ok(column / (248 + 14) >= 4.5, 'at least four and a half short-form pieces fit');
});

test('the statement ends white, the About copy is plain, and the hero card is centred', () => {
  // "We capture." and "We create." keep the surface accent; only "We inspire." is white.
  assert.match(MEDIA_PAGE, /className=\{index === all\.length - 1 \? 'text-white' : undefined\}/, 'only the closing phrase is white');
  // The biography is ordinary body copy again, not justified.
  assert.doesNotMatch(MEDIA_PAGE, /space-y-4 text-justify/, 'the About copy is not justified');
  // The hero card is centred in its column, so the peek is even on both sides.
  const hero = read('src/components/site/MediaHeroVideo.tsx');
  assert.match(hero, /relative mx-auto w-\[calc\(100%-var\(--cm-peek\)\)\]/, 'the card is centred, so the peek is even on both sides');
  assert.match(hero, /mx-auto mt-5 w-\[calc\(100%-2\*var\(--cm-peek\)\)\] text-center/, 'and its caption sits under the card centre');
});

test('the tools band stands still and carries the real marks', () => {
  const band = read('src/components/site/MediaTools.tsx');
  assert.doesNotMatch(band, /MediaTicker|cm-marquee|mask-image/, 'the band no longer moves');
  assert.match(band, /flex-wrap items-center justify-center/, 'the marks are arranged in one centred row');
  // Every icon is the product's own artwork, served from the prepared set.
  const mark = read('src/components/ui/ToolMark.tsx');
  for (const id of ['capcut', 'davinci', 'obs', 'vmix', 'lightroom', 'photoshop', 'premiere']) {
    assert.match(mark, new RegExp(`case '${id}':`), `ToolMark still names ${id}`);
  }
  assert.match(mark, /'\/images\/tools\/capcut\.png'/, 'the real CapCut icon is used');
  assert.match(mark, /'\/images\/tools\/davinci\.png'/, 'the real Resolve icon is used');
  assert.match(mark, /'\/images\/tools\/obs\.png'/, 'the real OBS icon is used');
  for (const file of ['capcut', 'davinci', 'obs', 'vmix', 'lightroom', 'photoshop', 'premiere']) {
    assert.ok(existsSync(join(import.meta.dirname, `../public/images/tools/${file}.png`)), `${file}.png is in the repository`);
  }
});

test('the About column reads in the owner\'s order and the credit sits under the picture', () => {
  const about = MEDIA_PAGE.slice(MEDIA_PAGE.indexOf('id="about"'));
  const order = ['About the Studio', 'The FACE Behind the Brand', 'MEDIA_STUDIO.statement'];
  const positions = order.map((token) => about.indexOf(token));
  assert.ok(positions.every((value) => value >= 0), 'the About blocks are all present');
  assert.ok(positions[0]! < positions[1]! && positions[1]! < positions[2]!, 'eyebrow, heading, then the statement');
  // The biography comes before the services card, which comes before the statement and the actions.
  const bio = about.indexOf('I am {founderName}');
  const card = about.indexOf('{CAPABILITIES.map');
  const statement = about.indexOf('MEDIA_STUDIO.statement');
  const actions = about.indexOf('Work with the Studio');
  assert.ok(bio > 0 && card > bio && statement > card && actions > statement, 'the left column follows the brief');
  // The credit is outside the picture, in the brand white, and the name inside keeps the logo split.
  const figure = about.slice(about.indexOf('<figure'), about.indexOf('</figure>'));
  assert.match(figure, /<\/div>[\s\S]{0,260}?<figcaption/, 'the credit sits under the frame, not over the picture');
  assert.match(figure.slice(figure.indexOf('<figcaption')), /text-white[\s\S]*?\{MEDIA_STUDIO.founderCredit\}/, 'the credit is set in the brand white');
  assert.match(MEDIA_STUDIO.founderCredit, /^Founder \/ CEO, Covenant Media$/, 'the credit is the line the owner asked for');
});

test('the media footer carries the studio paragraph, the header social row and the short legal line', () => {
  // Normalise line endings: the branch is sliced out by matching a `return (` + newline pair, so
  // a CRLF checkout would otherwise swallow the whole file and make every assertion meaningless.
  const footer = read('src/components/site/SiteFooter.tsx').replace(/\r\n/g, '\n');
  const media = footer.slice(footer.indexOf("if (surface === 'media')"), footer.indexOf('return (\n    <footer className="relative isolate mt-px'));
  assert.match(media, /MediaSocialButtons/, 'the footer shows the same five social buttons as the header');
  assert.match(media, /description \?\? cta.body/, 'the studio paragraph sits under the brand');
  assert.ok(media.includes('© {year} {legal.brandLine}.'), 'the copyright line is the exact short one'); assert.ok(!/All rights reserved|Designed &amp; Built with precision/.test(media), 'the removed sentence is not added back');
  assert.match(media, /legal.tagline \? <span className="font-mono uppercase/, 'the studio promise stays beside it');
  for (const gone of ['Privacy', 'Terms', 'Security &amp; privacy']) {
    assert.ok(!media.includes(gone), `the media footer no longer links ${gone}`);
  }
  // The newsletter, the services list and the direct details are untouched.
  for (const kept of ['Stay in Touch', 'Services', 'id="media-nl"', 'All Services']) {
    assert.ok(media.includes(kept), `the media footer keeps ${kept}`);
  }
});
