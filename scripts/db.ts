/**
 * Covenant Media database CLI.
 *   node --import tsx scripts/db.ts migrate|seed|reset|status
 */
process.env.CM_SCRIPT = '1';

async function main() {
  const cmd = process.argv[2] ?? 'status';
  const { getDriver, driverKind } = await import('../src/lib/db/driver');
  const { ensureSchema, select } = await import('../src/lib/db/index');

  if (cmd === 'status') {
    await ensureSchema();
    const rows = await select<{ table_name: string; n: string }>(
      `SELECT table_name, (xpath('/row/cnt/text()', xml_agg))[1]::text AS n
       FROM (SELECT table_name, query_to_xml(format('SELECT count(*) AS cnt FROM %I', table_name), false, true, '') AS xml_agg
             FROM information_schema.tables WHERE table_schema='public') t ORDER BY table_name`,
    );
    console.log(`driver: ${driverKind()}`);
    for (const r of rows) console.log(`  ${r.table_name.padEnd(22)} ${r.n}`);
    return;
  }

  if (cmd === 'reset') {
    const driver = await getDriver();
    await driver.execMulti(
      `DO $$ DECLARE r RECORD; BEGIN
         FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
           EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
         END LOOP;
       END $$;`,
    );
    await driver.close();
    console.log('dropped all public tables');
    return;
  }

  if (cmd === 'migrate') {
    await ensureSchema();
    console.log('schema applied (idempotent)');
    return;
  }

  if (cmd === 'seed') {
    await ensureSchema();
    const { seedDatabase } = await import('../src/lib/db/seed');
    const report = await seedDatabase({ force: process.argv.includes('--force') });
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`unknown command: ${cmd}`);
  console.log('usage: node --import tsx scripts/db.ts [migrate|seed|reset|status]');
}

async function shutdown() {
  try {
    const { getDriver } = await import('../src/lib/db/driver');
    const driver = await getDriver();
    await driver.close();
  } catch {
    /* nothing open */
  }
}

main()
  .then(async () => {
    await shutdown();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await shutdown();
    process.exit(1);
  });
