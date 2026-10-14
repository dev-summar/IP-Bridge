const test = require('node:test');
const assert = require('node:assert/strict');
const ai = require('../dist/services/aiParser');
const { getAIMatchedPatents } = require('../dist/controllers/patentController');
const { dbStore } = require('../dist/services/dbStore');

const credential = 'AQ.test-only-credential';
async function withGemini(run) {
  const previousFetch = global.fetch;
  const settings = { GEMINI_API_KEY: credential, GEMINI_MODEL: 'gemini-2.5-flash', AI_ANALYSIS_PROVIDER: 'gemini', LLM_API_KEY: 'test-legacy-gateway' };
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  try { await run(); } finally {
    global.fetch = previousFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}
const response = value => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] }), { status: 200 });
function checkRequest(url, options) {
  assert.equal(new URL(url).hostname, 'generativelanguage.googleapis.com');
  assert.equal(new URL(url).search, '');
  assert.equal(url.includes(credential), false);
  assert.equal(options.headers['x-goog-api-key'], credential);
}

test('Gemini accepts Google-supported credential formats and uses header authentication', () => withGemini(async () => {
  delete process.env.GEMINI_MODEL;
  global.fetch = async (url, options) => {
    checkRequest(url, options);
    assert.ok(url.includes('gemini-2.5-flash:generateContent'));
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [
      { text: 'internal reasoning', thought: true }, { text: '{"provider":' }, { text: '"gemini"}' },
    ] } }] }), { status: 200 });
  };
  assert.deepEqual(await ai.queryGeminiLLM('Return JSON', credential), { provider: 'gemini' });
  await assert.rejects(ai.queryGeminiLLM('Return JSON', ' '), /missing/);
  global.fetch = async () => new Response(credential, { status: 403 });
  await assert.rejects(ai.queryGeminiLLM('Return JSON', credential), error => {
    assert.ok(error.message.includes('HTTP 403'));
    assert.equal(error.message.includes(credential), false);
    return true;
  });
}));

test('analysis, pricing, and prototype readiness prefer Gemini even with a legacy gateway configured', () => withGemini(async () => {
  const values = [
    { summary: { description: 'Sensor calibration', problemSolved: 'Calibration drift', keyInnovation: 'Reference sensor calibration', commercialValue: 'Industrial calibration' }, industryClassification: ['Manufacturing'], commercialApplications: { potentialIndustries: ['Factories'], useCases: ['Calibration'], adoptionOpportunities: ['Licensing'] }, keywords: ['sensor'], commercialPotentialScore: 79 },
    { suggestedSaleMinInr: 300000, suggestedSaleMaxInr: 900000, suggestedLicenseAnnualInr: 65000, confidence: 72, rationale: 'Sensor calibration uses reference sensors and calibration to improve reliability.', pricingFactors: ['Reference sensors improve calibration', 'Industrial sensors need reliable calibration'] },
    { trlLevel: 6, readinessScore: 81, maturityLabel: 'Gemini assessed prototype', strengths: ['Working sensor prototype'], gaps: ['Pilot required'], nextSteps: ['Factory pilot'] },
  ];
  let calls = 0;
  global.fetch = async (url, options) => { checkRequest(url, options); return response(values[calls++]); };
  const input = { title: 'Sensor calibration', abstract: 'Reference sensors measure calibration drift in factory equipment.', hasPrototype: true, hasProduct: false };
  assert.equal((await ai.analyzePatentWithAI(input.title, input.abstract)).commercialPotentialScore, 79);
  assert.equal((await ai.estimateIPPricing(input)).suggestedLicenseAnnualInr, 65000);
  assert.equal((await ai.ratePrototypeReadiness(input)).maturityLabel, 'Gemini assessed prototype');
  assert.equal(calls, 3);
}));

test('marketplace matching calls Gemini without an LLM_API_KEY and validates model results', () => withGemini(async () => {
  delete process.env.LLM_API_KEY;
  const restores = [];
  const stub = (object, key, value) => { const previous = object[key]; object[key] = value; restores.push(() => { object[key] = previous; }); };
  let calls = 0;
  const patent = { _id: 'sensor-patent', ownerId: 'inventor', status: 'approved', title: 'Sensor calibration', abstract: 'Reference sensors measure calibration drift.', askingPrice: 300000 };
  stub(dbStore.patents, 'find', async () => [patent]);
  stub(dbStore.patentAnalysis, 'findOne', async () => ({ summary: { description: patent.abstract }, industryClassification: ['Manufacturing'], keywords: ['sensor'] }));
  stub(dbStore.users, 'findById', async () => ({ name: 'Inventor', organization: 'Institution' }));
  global.fetch = async (url, options) => { calls++; checkRequest(url, options); return response([{ patentId: patent._id, matchPercentage: 95, reason: 'Gemini matched reference sensor calibration.' }]); };
  let result;
  const res = { status() { return this; }, json(value) { result = value; return this; } };
  try {
    await getAIMatchedPatents({ body: { query: 'Factory sensor calibration' }, headers: {} }, res);
    assert.equal(calls, 1);
    assert.equal(result[0].matchPercentage, 95);
    assert.equal(result[0].matchReason, 'Gemini matched reference sensor calibration.');
    global.fetch = async () => response({ unexpected: true });
    await getAIMatchedPatents({ body: { query: 'sensor calibration' }, headers: {} }, res);
    assert.ok(result[0].matchReason.startsWith('Matched search keywords:'));
  } finally { restores.reverse().forEach(restore => restore()); }
}));
