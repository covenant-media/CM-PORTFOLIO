/**
 * Client stories are the only place the site attributes words to a person, so the rules that
 * decide *who* a story belongs to have to be pinned. Two promises are tested here: nothing is ever
 * invented (no name, no quote), and the generic attribution is derived from what the piece already
 * says — the title and description — rather than from a guess about the client.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { deriveStory, kindLabel, namesFromTitle } from '../src/lib/media/story';
import { STORY_KINDS } from '../src/lib/cms/options';

test('a written client name always wins over anything derived', () => {
  const story = deriveStory({ title: 'Wedding Highlight — Mary and Real', storyClient: 'Chief Okon' });
  assert.equal(story.author, 'Chief Okon');
  assert.equal(story.matched, true);

  const fromColumn = deriveStory({ title: 'Wedding Highlight', client: 'Ada and Tunde' });
  assert.equal(fromColumn.author, 'Ada and Tunde');
});

test('an empty name falls back to the context the title already states', () => {
  assert.equal(deriveStory({ title: 'Wedding Highlight' }).author, 'Wedding clients');
  assert.equal(deriveStory({ title: 'Wedding Highlight' }).context, 'Wedding');
  assert.equal(deriveStory({ title: 'Child dedication at RCCG' }).author, 'Dedication clients');
  assert.equal(deriveStory({ title: 'Promotional campaign for a fintech' }).context, 'Promotional campaign');
});

test('names already printed in the title are kept, the way the brief asks', () => {
  assert.equal(deriveStory({ title: 'Wedding Highlight — Mary and Real' }).author, 'Wedding clients: Mary and Real');
  assert.equal(deriveStory({ title: 'Wedding | Mary & Real' }).author, 'Wedding clients: Mary & Real');
  assert.equal(deriveStory({ title: 'Child dedication — The Okon Family' }).author, 'Dedication clients: The Okon Family');
});

test('production words are never mistaken for people', () => {
  for (const title of [
    'Wedding Highlight — Full Film',
    'Wedding Highlight — Part 2',
    'Wedding — Behind The Scenes',
    'Wedding Highlight — Official Trailer',
  ]) {
    assert.equal(namesFromTitle(title), null, title);
    assert.equal(deriveStory({ title }).author, 'Wedding clients', title);
  }
});

test('a piece that identifies nobody is left unattributed rather than guessed', () => {
  const story = deriveStory({ title: 'Sample reel — Big Buck Bunny', description: 'Stock footage used while the reel is built.' });
  assert.equal(story.author, '');
  assert.equal(story.matched, false);
  assert.equal(story.context, 'Media production');
});

test('an explicit type of work overrides the detection, and "auto" means detect', () => {
  assert.equal(deriveStory({ title: 'A film with no clues', storyKind: 'wedding' }).context, 'Wedding');
  assert.equal(deriveStory({ title: 'Wedding Highlight', storyKind: 'school_event' }).context, 'School event');
  assert.equal(deriveStory({ title: 'Wedding Highlight', storyKind: 'auto' }).context, 'Wedding');
  assert.equal(deriveStory({ title: 'Wedding Highlight', storyKind: '' }).context, 'Wedding');
});

test('every stored kind prints as a label, including one written by hand', () => {
  for (const kind of STORY_KINDS) assert.ok(kindLabel(kind.value), kind.value);
  assert.equal(kindLabel('travel_documentary'), 'Travel Documentary');
});

test('detection reads the description too, not just the title', () => {
  assert.equal(deriveStory({ title: 'Behind the scenes', description: 'A look at how the set runs.' }).context, 'Media production');
  assert.equal(namesFromTitle('Behind the scenes'), null);
  assert.equal(deriveStory({ title: 'A short film', description: 'Shot at a school graduation in Uyo.' }).context, 'School event');
  assert.equal(deriveStory({ title: 'A short film', description: 'Shot at a school graduation in Uyo.' }).author, 'School client');
});

test('the page copy falls back to the studio’s own words field by field', async () => {
  const { biographyParagraphs, capabilityList } = await import('../src/lib/media/portfolio');
  const { MEDIA_CAPABILITIES } = await import('../src/lib/media/sample-portfolio');
  const written = [...MEDIA_CAPABILITIES];

  // Nothing saved yet → the written set, so the page is never empty.
  assert.deepEqual(capabilityList(''), written);
  assert.deepEqual(capabilityList(null), written);
  // Saved in the CMS → exactly the lines the owner typed, trimmed and blank-free.
  assert.deepEqual(capabilityList('Weddings\n  Brand films \n\nLive streaming'), ['Weddings', 'Brand films', 'Live streaming']);

  const fallback = ['First paragraph.', 'Second paragraph.'];
  assert.deepEqual(biographyParagraphs(undefined, fallback), fallback);
  assert.deepEqual(biographyParagraphs('\n', fallback), fallback);
  assert.deepEqual(biographyParagraphs('One.\nTwo.\nThree.', fallback), ['One.', 'Two.', 'Three.']);
});
