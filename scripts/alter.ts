import { execute } from '../src/lib/db/index.js';

async function run() {
  try {
    await execute('ALTER TABLE contact_submission ADD COLUMN subject TEXT;');
    console.log('Added subject column');
  } catch (e) {
    console.log('Error or already exists', e);
  }
}
run();