require('dotenv').config();

const { connectDB } = require('./dist/config/db');
const { dbStore } = require('./dist/services/dbStore');
const { analyzePatentWithAI } = require('./dist/services/aiParser');
const {
  GENERIC_FALLBACK_DESCRIPTIONS,
  buildDuplicateDescriptionSet,
  isQualityPatentAnalysis,
} = require('./dist/services/analysisQuality');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function needsReanalysis(analysis, duplicateDescriptions) {
  return {
    needs: !isQualityPatentAnalysis(analysis, duplicateDescriptions),
    reason: !analysis
      ? 'missing analysis'
      : !(analysis.summary?.description || '').trim()
        ? 'empty description'
        : GENERIC_FALLBACK_DESCRIPTIONS.has((analysis.summary?.description || '').trim())
          ? 'generic fallback template'
          : duplicateDescriptions.has((analysis.summary?.description || '').trim())
            ? 'duplicate summary shared by multiple patents'
            : 'already has unique analysis',
  };
}

async function run() {
  const forceAll = process.argv.includes('--all');
  const delayMs = Number(process.env.REANALYZE_DELAY_MS || 1500);

  console.log('======================================================');
  console.log(forceAll ? 'Re-analyzing ALL patents with AI...' : 'Re-analyzing patents that need AI analysis...');
  console.log('======================================================');

  if (!process.env.LLM_API_KEY && !process.env.GEMINI_API_KEY) {
    console.warn('[Reanalyze] Warning: LLM_API_KEY and GEMINI_API_KEY are not set — results may use local fallbacks again.');
  }

  await connectDB();

  const patents = await dbStore.patents.find();
  const allAnalyses = await dbStore.patentAnalysis.find();
  const analysisByPatentId = new Map(
    allAnalyses.map((analysis) => [String(analysis.patentId), analysis])
  );
  const duplicateDescriptions = buildDuplicateDescriptionSet(allAnalyses);

  const queue = [];
  const skipped = [];

  for (const patent of patents) {
    const analysis = analysisByPatentId.get(String(patent._id)) || null;
    if (forceAll) {
      queue.push({ patent, reason: 'forced (--all)' });
      continue;
    }

    const check = needsReanalysis(analysis, duplicateDescriptions);
    if (check.needs) {
      queue.push({ patent, reason: check.reason });
    } else {
      skipped.push({ patent, reason: check.reason });
    }
  }

  console.log(`[Reanalyze] Total patents: ${patents.length}`);
  console.log(`[Reanalyze] To process: ${queue.length}`);
  console.log(`[Reanalyze] Skipping: ${skipped.length}\n`);

  if (queue.length === 0) {
    console.log('Nothing to re-analyze. Use --all to force a full refresh.');
    process.exit(0);
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < queue.length; i++) {
    const { patent, reason } = queue[i];
    try {
      console.log(`[${i + 1}/${queue.length}] ${patent.patentNumber} (${reason})`);
      console.log(`  Title: ${patent.title.substring(0, 80)}${patent.title.length > 80 ? '...' : ''}`);

      const aiAnalysis = await analyzePatentWithAI(patent.title, patent.abstract);
      const saved = await dbStore.patentAnalysis.upsert(String(patent._id), aiAnalysis);

      console.log(`  ✔ Score: ${saved.commercialPotentialScore}/100`);
      console.log(`  ✔ Industries: ${(saved.industryClassification || []).join(', ')}`);
      console.log(`  ✔ Summary: ${(saved.summary?.description || '').substring(0, 90)}...`);
      console.log('');
      success++;

      if (i < queue.length - 1 && delayMs > 0) {
        await sleep(delayMs);
      }
    } catch (err) {
      console.error(`  ✘ Failed: ${err.message}\n`);
      failed++;
    }
  }

  console.log('======================================================');
  console.log(`Done. Success: ${success}, Failed: ${failed}, Skipped: ${skipped.length}`);
  console.log('Hard-refresh Discover to see updated summaries.');
  console.log('======================================================');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('[Reanalyze] Fatal error:', err);
  process.exit(1);
});
