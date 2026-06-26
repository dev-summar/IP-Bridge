require('dotenv').config();
require('ts-node/register/transpile-only');

const { connectDB } = require('./src/config/db');
const { dbStore } = require('./src/services/dbStore');
const { analyzePatentWithAI } = require('./src/services/aiParser');

async function run() {
  console.log('======================================================');
  console.log('Re-analyzing all patents with AI...');
  console.log('======================================================');

  await connectDB();

  const patents = await dbStore.patents.find();
  console.log(`[Reanalyze] Found ${patents.length} patent(s).\n`);

  for (const patent of patents) {
    try {
      console.log(`[Reanalyze] ${patent.patentNumber}`);
      console.log(`  Title: ${patent.title.substring(0, 72)}...`);
      const aiAnalysis = await analyzePatentWithAI(patent.title, patent.abstract);
      const saved = await dbStore.patentAnalysis.upsert(String(patent._id), aiAnalysis);
      console.log(`  ✔ Score: ${saved.commercialPotentialScore}/100`);
      console.log(`  ✔ Industries: ${(saved.industryClassification || []).join(', ')}`);
      console.log('');
    } catch (err) {
      console.error(`  ✘ Failed: ${err.message}\n`);
    }
  }

  console.log('======================================================');
  console.log('Done. Hard-refresh marketplace to see updated scores.');
  console.log('======================================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('[Reanalyze] Fatal error:', err);
  process.exit(1);
});
