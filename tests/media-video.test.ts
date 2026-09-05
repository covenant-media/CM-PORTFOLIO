/**
 * "Paste a link and the CMS figures out the rest" is only safe if detection is deterministic:
 * the embed that gets stored has to be the platform's own, never whatever the input string
 * happened to point at. These are the cases the import panel depends on.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { aspectForForm, detectVideoSource, isVertical, isoDurationToSeconds } from '../src/lib/media/video';
import { looksLikeMarkup, normaliseAsset, sniffKind, uploadLimits } from '../src/lib/media/storage';

test('youtube links resolve to a privacy-friendly embed and derivable posters', () => {
  for (const input of [
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    'https://youtu.be/aqz-KE-bpKQ?t=10',
    'https://www.youtube.com/embed/aqz-KE-bpKQ',
    'https://m.youtube.com/watch?list=PLx&v=aqz-KE-bpKQ',
  ]) {
    const found = detectVideoSource(input);
    assert.equal(found.source, 'youtube', input);
    assert.equal(found.sourceId, 'aqz-KE-bpKQ', input);
    assert.match(String(found.embedUrl), /^https:\/\/www\.youtube-nocookie\.com\/embed\/aqz-KE-bpKQ/);
    assert.ok(found.thumbnailCandidates.length >= 2);
    assert.ok(found.playableDirectly);
    if (!/shorts\//.test(input)) assert.equal(found.canonicalUrl, 'https://www.youtube.com/watch?v=aqz-KE-bpKQ');
  }
});

test('shorts are recognised as vertical video', () => {
  const found = detectVideoSource('https://www.youtube.com/shorts/aqz-KE-bpKQ');
  assert.equal(found.sourceId, 'aqz-KE-bpKQ');
  assert.equal(isVertical(found), true);
  assert.equal(isVertical(detectVideoSource('https://vimeo.com/76979871'), 'short_form'), true);
});

test('other platforms build their own embed URLs and never invent a video id', () => {
  const vimeo = detectVideoSource('https://vimeo.com/76979871');
  assert.equal(vimeo.source, 'vimeo');
  assert.match(String(vimeo.embedUrl), /^https:\/\/player\.vimeo\.com\/video\/76979871\?dnt=1/);
  assert.ok(String(vimeo.oEmbedUrl).startsWith('https://vimeo.com/api/oembed.json?'));

  const tiktok = detectVideoSource('https://www.tiktok.com/@studio/video/7300123456789012345');
  assert.equal(tiktok.source, 'tiktok');
  assert.equal(tiktok.sourceId, '7300123456789012345');
  assert.equal(isVertical(tiktok), true);

  const insta = detectVideoSource('https://www.instagram.com/reel/CxYz1234/');
  assert.equal(insta.source, 'instagram');
  assert.equal(insta.playableDirectly, false, 'an Instagram embed is a post card, not a player');
  assert.ok(insta.notes);

  const facebook = detectVideoSource('https://www.facebook.com/brand/videos/10159999999999999/');
  assert.equal(facebook.source, 'facebook');
  assert.equal(facebook.oEmbedUrl, null, 'no unauthenticated oEmbed for Facebook');
});

test('a direct file plays inline; anything else degrades to a link card', () => {
  const direct = detectVideoSource('https://cdn.example.test/films/feature.mp4');
  assert.equal(direct.source, 'upload');
  assert.equal(direct.embedUrl, 'https://cdn.example.test/films/feature.mp4');
  assert.equal(direct.playableDirectly, true);

  const unknown = detectVideoSource('https://somewhere.example.test/page');
  assert.equal(unknown.source, 'external');
  assert.equal(unknown.embedUrl, null);
  assert.equal(unknown.playableDirectly, false);

  const junk = detectVideoSource('not a url at all');
  assert.equal(junk.source, 'external');
  assert.equal(junk.canonicalUrl, null);
  assert.ok(junk.notes, 'the importer explains what went wrong instead of failing silently');

  assert.equal(detectVideoSource('').source, 'external');
});

test('form factor and duration feed the grid layout', () => {
  assert.equal(aspectForForm('short_form'), 'vertical');
  assert.equal(aspectForForm('photo'), 'square');
  assert.equal(aspectForForm('film'), 'wide');
  assert.equal(aspectForForm(null), 'wide');
  assert.equal(isoDurationToSeconds('PT1M30S'), 90);
  assert.equal(isoDurationToSeconds('PT1H2M3S'), 3723);
  assert.equal(isoDurationToSeconds('PT45.5S'), 46);
  assert.equal(isoDurationToSeconds('nonsense'), null);
  assert.equal(isoDurationToSeconds(null), null);
});

test('uploads are classified by bytes, not by the name the browser sent', () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(24)]);
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(24)]);
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(24)]);
  const mp4 = Buffer.concat([Buffer.alloc(4), Buffer.from('ftypisom'), Buffer.alloc(24)]);
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7'), Buffer.alloc(24)]);
  assert.equal(sniffKind(png), 'image');
  assert.equal(sniffKind(jpeg), 'image');
  assert.equal(sniffKind(webp), 'image');
  assert.equal(sniffKind(mp4), 'video');
  assert.equal(sniffKind(pdf), 'document');
  assert.equal(sniffKind(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')), null, 'an SVG is not accepted as an upload');
  assert.equal(sniffKind(Buffer.from('hi')), null, 'too short to classify');

  const limits = uploadLimits();
  assert.ok(limits.maxBytes >= 5 * 1024 * 1024, 'a film export or a high-resolution scan needs room');
  assert.ok(limits.allowed.IMAGE_EXT.includes('png'));
  assert.ok(!limits.allowed.IMAGE_EXT.includes('svg'), 'SVG is never accepted — it can carry script');
  assert.deepEqual(limits.allowed.DOC_EXT, ['pdf'], 'documents mean PDF, not arbitrary binaries');
  assert.equal(limits.driver, process.env.STORAGE_DRIVER ?? 'local');
});

test('asset rows normalise into what the media component expects', () => {
  const row = normaliseAsset({
    id: 'ast_1',
    filename: 'stills/frame.png',
    url: '/uploads/stills/frame.png',
    kind: 'image',
    width: 1920,
    height: 1080,
    bytes: 4096,
    alt: 'Frame',
    blur: null,
    is_sample: true,
  });
  assert.equal(row.url, '/uploads/stills/frame.png');
  assert.equal(row.kind, 'image');
  assert.equal(row.width, 1920);
  assert.equal(row.is_sample, true);
});

test('markup never enters the media library', () => {
  // An SVG is an image to a browser and a script host to a visitor, so the bytes are checked
  // rather than the extension the uploader claimed.
  assert.equal(looksLikeMarkup(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), true);
  assert.equal(looksLikeMarkup(Buffer.from('  <?xml version="1.0"?><svg/>')), true);
  assert.equal(looksLikeMarkup(Buffer.from('<!doctype html><html><body>hello')), true);
  assert.equal(looksLikeMarkup(Buffer.from('%PDF-1.7\n%âãÏÓ\n')), false, 'a real PDF still uploads');
  assert.equal(looksLikeMarkup(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])), false);
});
