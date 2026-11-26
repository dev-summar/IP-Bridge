/**
 * Recompute commercialPotentialScore (+ breakdown) for every patent analysis
 * from title/abstract/TRL — so Discover cards stop clustering around one number.
 *
 * Usage:
 *   node scripts/backfillCommercialScores.cjs
 */
require('dotenv').config();

async function loadHelpers() {
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
  const { commercial, connectDB, dbStore, setUseMongo, via } = await loadHelpers();
  const { assessCommercialPotential } = commercial;

  console.log(`[scores] Helpers via ${via}`);
  await connectDB();
  setUseMongo(true);

  const patents = await dbStore.patents.find();
  const analyses = await dbStore.patentAnalysis.find();
  const byPatent = new Map(analyses.map((a) => [String(a.patentId), a]));

  const scores = [];
  let updated = 0;

  for (const patent of patents) {
    const analysis = byPatent.get(String(patent._id));
    const assessment = assessCommercialPotential({
      title: patent.title,
      abstract: patent.abstract,
      industries: analysis?.industryClassification,
      hasPrototype: !!patent.hasPrototype,
      hasProduct: !!patent.hasProduct,
      trlLevel: patent.trlLevel ?? analysis?.readinessAssessment?.trlLevel ?? null,
      prototypeDescription: patent.prototypeDescription,
    });

    scores.push(assessment.commercialPotentialScore);

    await dbStore.patentAnalysis.upsert(String(patent._id), {
      ...(analysis || {}),
      commercialPotentialScore: assessment.commercialPotentialScore,
      commercialBreakdown: assessment.commercialBreakdown,
      scoreRationale: assessment.scoreRationale,
      industryClassification: analysis?.industryClassification || [],
      summary: analysis?.summary || { description: '', problemSolved: '', keyInnovation: '' },
      commercialApplications: analysis?.commercialApplications || [],
      keywords: analysis?.keywords || [],
    });
    updated += 1;
  }

  scores.sort((a, b) => a - b);
  const min = scores[0] ?? 0;
  const max = scores[scores.length - 1] ?? 0;
  const mid = scores[Math.floor(scores.length / 2)] ?? 0;
  const unique = new Set(scores).size;
  console.log(`[scores] Updated ${updated} analyses`);
  console.log(`[scores] Spread min=${min} median=${mid} max=${max} unique=${unique}/${scores.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[scores] Failed:', err);
  process.exit(1);
});
