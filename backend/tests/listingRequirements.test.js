const test = require('node:test');
const assert = require('node:assert/strict');
const { validateListingEvidence } = require('../dist/services/listingRequirements');
const { registerPatent } = require('../dist/controllers/patentController');
const { PatentModel } = require('../dist/models/schemas');
const { dbStore } = require('../dist/services/dbStore');
const ai = require('../dist/services/aiParser');
const base = { pdfUrl: 'https://documents.example.org/official-grant.pdf', ipType: 'utility_patent', registrationStatus: 'granted', grantConfirmed: true };

test('requires an official document link, explicit eligible status, type, and confirmation', () => {
  for (const invalid of [
    { pdfUrl: '' }, { pdfUrl: 'not-a-url' }, { pdfUrl: 'javascript:alert(1)' }, { pdfUrl: 'ftp://example.org/grant.pdf' },
    { pdfUrl: 'https://user:password@example.org/grant.pdf' }, { ipType: '' }, { ipType: 'unrecognized' },
    { registrationStatus: 'pending' }, { registrationStatus: 'published' }, { registrationStatus: 'approved' },
    { registrationStatus: 'registered' }, { grantConfirmed: false }, { grantConfirmed: 'true' },
    { ipType: 'other', otherIpType: '' }, { ipType: 'other', otherIpType: 'x'.repeat(81) },
    { ipType: 'design', registrationStatus: 'granted' },
  ]) assert.equal(validateListingEvidence({ ...base, ...invalid }).valid, false, JSON.stringify(invalid));
  const signed = validateListingEvidence({ ...base, pdfUrl: 'https://files.example.org/document/123?token=abc' });
  assert.equal(signed.valid, true);
  assert.equal(signed.value.pdfUrl, 'https://files.example.org/document/123?token=abc');
  assert.equal(validateListingEvidence({ ...base, ipType: 'design', registrationStatus: 'registered' }).valid, true);
  assert.equal(validateListingEvidence({ ...base, ipType: 'other', otherIpType: 'Plant Patent' }).valid, true);
});

test('Mongo schema also rejects missing document/type/approval fields', async () => {
  const record = { ownerId: 'owner', patentNumber: 'IN-TEST', title: 'IP', abstract: 'Description' };
  await assert.rejects(new PatentModel(record).validate());
  await new PatentModel({ ...record, ...base }).validate();
  await assert.rejects(new PatentModel({ ...record, ...base, ipType: 'other' }).validate());
});

test('new submission rejects ineligible records before persistence and retains chosen IP type', async () => {
  const restores = [];
  const stub = (object, key, replacement) => { const old = object[key]; object[key] = replacement; restores.push(() => { object[key] = old; }); };
  const records = [];
  let analysisCalls = 0;
  stub(dbStore.patents, 'find', async () => records);
  stub(dbStore.patents, 'create', async data => { const record = { _id: `id-${records.length}`, ...data }; records.push(record); return record; });
  stub(dbStore.patents, 'findById', async id => records.find(record => record._id === id));
  stub(dbStore.patentAnalysis, 'create', async data => data);
  stub(dbStore.auditLogs, 'create', async data => data);
  stub(ai, 'analyzePatentWithAI', async () => { analysisCalls++; return { commercialPotentialScore: 75 }; });
  const submit = async body => {
    const response = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    await registerPatent({ body, user: { id: 'owner' } }, response);
    return response;
  };
  try {
    const form = { patentNumber: 'IN-GRANTED', title: 'IP title', abstract: 'Official abstract', askingPrice: 120000 };
    assert.equal((await submit(form)).code, 400);
    assert.equal((await submit({ ...form, ...base, registrationStatus: 'published' })).code, 400);
    assert.equal(records.length, 0);
    assert.equal(analysisCalls, 0);
    let result = await submit({ ...form, ...base });
    assert.equal(result.code, 201);
    assert.equal(result.data.patent.status, 'pending');
    assert.equal(result.data.patent.ipType, 'utility_patent');
    assert.equal(result.data.patent.pdfUrl, base.pdfUrl);
    result = await submit({ ...form, ...base, patentNumber: 'DESIGN-APPROVED', ipType: 'design', registrationStatus: 'registered' });
    assert.equal(result.code, 201);
    assert.equal(result.data.patent.ipType, 'design');
    result = await submit({ ...form, ...base, patentNumber: 'OTHER-GRANTED', ipType: 'other', otherIpType: 'Plant Patent' });
    assert.equal(result.code, 201);
    assert.equal(result.data.patent.otherIpType, 'Plant Patent');
  } finally { restores.reverse().forEach(restore => restore()); }
});
