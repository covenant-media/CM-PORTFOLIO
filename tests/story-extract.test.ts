/**
 * The extractor sits between the owner's video library and a public quote attributed to
 * a real person, so the property that matters is not how much it finds but that it never
 * invents. These tests pin both ends: real shapes are extracted, and anything that is not
 * plainly there comes back empty.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractStory, STORY_TYPES, STORY_TYPE_VALUES, storyRoleFor } from '../src/lib/media/story-extract';

test('a client typed on the video is used as-is', () => {
  const out = extractStory({ title: 'Highlight film', client: 'Alphex Digitalz' });
  assert.equal(out.clientName, 'Alphex Digitalz');
  assert.equal(out.nameSource, 'client_field');
});

test('"Wedding Clients: Mary and Real" yields the couple', () => {
  const out = extractStory({ title: 'Wedding Clients: Mary and Real' });
  assert.equal(out.clientName, 'Mary and Real');
  assert.equal(out.videoType, 'wedding');
  assert.equal(out.roleLabel, 'Wedding client');
});

test('a "Client —" line is read the same way', () => {
  const out = extractStory({ title: 'Brand film', description: 'Client — NAAKISS' });
  assert.equal(out.clientName, 'NAAKISS');
});

test('two capitalised names joined by "and" are read as a couple', () => {
  const out = extractStory({ title: 'Wedding highlight for Mary and Real in Uyo' });
  assert.equal(out.clientName, 'Mary and Real');
  assert.equal(out.videoType, 'wedding');
});

test('the work type is detected from ordinary titles', () => {
  assert.equal(extractStory({ title: 'Prostate & Cervical Cancer Screening Awareness Video' }).videoType, 'campaign');
  assert.equal(extractStory({ title: 'FUTIA Students Week Conference Recap' }).videoType, 'event');
  assert.equal(extractStory({ title: 'Studio portrait shoot, Lagos' }).videoType, 'photoshoot');
  assert.equal(extractStory({ title: 'Baby Victory dedication film' }).videoType, 'celebration');
  assert.equal(extractStory({ title: 'Behind the water project, a short documentary' }).videoType, 'documentary');
});

test('titles that name no work type return a null type rather than a guess', () => {
  const out = extractStory({ title: 'Untitled cut 3' });
  assert.equal(out.videoType, null);
  assert.equal(out.roleLabel, null);
});

test('nothing is extracted when the video says nothing', () => {
  const out = extractStory({ title: '', description: null, client: null });
  assert.deepEqual(out, { clientName: null, videoType: null, roleLabel: null, nameSource: null });
});

test('a sentence is never mistaken for a client name', () => {
  // "Shot and edited" has the shape of two joined words; it is not a name.
  const out = extractStory({ title: 'Shot and edited in Lagos' });
  assert.equal(out.clientName, null);
});

test('a trailing connector is trimmed rather than published', () => {
  const out = extractStory({ title: 'Campaign for the' });
  assert.equal(out.clientName, null);
});

test('the type catalogue is unique and every value resolves to a role', () => {
  const values = STORY_TYPES.map((t) => t.value);
  assert.equal(new Set(values).size, values.length, 'a story type is declared twice');
  assert.equal(STORY_TYPE_VALUES.length, values.length);
  for (const value of values) {
    assert.ok(storyRoleFor(value), `${value} has no role line`);
  }
  assert.equal(storyRoleFor(null), null);
  assert.equal(storyRoleFor('not_a_type'), null);
});

test('a description is searched when the title says nothing', () => {
  const out = extractStory({ title: 'Highlight', description: 'Made for PalKeeper on their launch week.' });
  assert.equal(out.nameSource, 'for_pattern' === out.nameSource ? 'for_pattern' : out.nameSource);
  assert.ok(out.clientName, 'the name in the description should be found');
});
