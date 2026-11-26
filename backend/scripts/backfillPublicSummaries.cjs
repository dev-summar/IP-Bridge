/**
 * Write 3-line card summaries onto every patent.publicSummary in MongoDB.
 * Local and production already share the same Atlas DB — this updates both.
 *
 * Usage:
 *   node scripts/backfillPublicSummaries.cjs
 *   node scripts/backfillPublicSummaries.cjs --force   # overwrite existing
 */
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');

async function loadHelpers() {
  // Prefer compiled dist; fall back to ts-node transpile of src.
  try {
    const commercial = require('../dist/services/commercialModel');
    const { connectDB } = require('../dist/config/db');
    const { dbStore, setUseMongo } = require('../dist/services/dbStore');
    return { commercial, connectDB, dbStore, setUseMongo, via: 'dist' };
  } catch {
    require('ts-node/register/transpile-only');
    const commercial = require('../src/services/commercialModel');
    const { connectDB } = require('../src/config/db');
    const { dbStore, setUseMongo } = require('../src/services/dbStore');
    return { commercial, connectDB, dbStore, setUseMongo, via: 'src' };
  }
}

async function main() {
  const force = process.argv.includes('--force');
  const { commercial, connectDB, dbStore, setUseMongo, via } = await loadHelpers();
  const { publicLines } = commercial;

  console.log(`[backfill] Loading helpers via ${via}`);
  console.log(`[backfill] Mongo URI host: ${(process.env.MONGODB_URI || '').replace(/\/\/.*@/, '//***@').slice(0, 80)}…`);
  console.log(`[backfill] Mode: ${force ? 'overwrite all' : 'fill missing only'}`);

  await connectDB();
  setUseMongo(true);

  const patents = await dbStore.patents.find();
  let updated = 0;
  let skipped = 0;

  for (const patent of patents) {
    const existing = Array.isArray(patent.publicSummary)
      ? patent.publicSummary.map((l) => String(l || '').trim()).filter(Boolean)
      : [];
    if (!force && existing.length === 3) {
      skipped += 1;
      continue;
    }

    const lines = publicLines({
      title: patent.title,
      abstract: patent.abstract,
      isForSale: patent.isForSale,
      isForLicense: patent.isForLicense,
      trlLevel: patent.trlLevel,
    }).slice(0, 3);

    if (lines.length < 3) {
      console.warn(`[backfill] skip (short summary): ${patent.patentNumber || patent._id} — ${patent.title}`);
      skipped += 1;
      continue;
    }

    await dbStore.patents.update(String(patent._id), { publicSummary: lines });
    updated += 1;
    if (updated % 25 === 0) {
      console.log(`[backfill] updated ${updated}/${patents.length}…`);
    }
  }

  console.log('======================================================');
  console.log(`[backfill] Done. total=${patents.length} updated=${updated} skipped=${skipped}`);
  console.log('[backfill] Same Atlas DB → local + production both see these lines.');
  console.log('======================================================');

  await mongoose.disconnect().catch(() => {});
  process.exit(0);
}

main().catch((err) => {
  console.error('[backfill] Failed:', err);
  process.exit(1);
});
