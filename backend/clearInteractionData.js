const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const mongoURI = process.env.MONGODB_URI;
const jsonDbPath = path.join(__dirname, 'data/db.json');

const INTERACTION_COLLECTIONS = [
  'interestrequests',
  'meetingrequests',
  'auditlogs',
  'offers',
  'ndasignatures',
  'accessrequests',
  'transactions',
];

function resolveDbNames(uri) {
  const match = uri.match(/mongodb\+srv:\/\/[^/]+\/([^?]+)/);
  const names = new Set();
  if (match && match[1]) names.add(match[1]);
  names.add('test');
  return [...names];
}

async function clearDatabase(dbName) {
  const db = mongoose.connection.client.db(dbName);
  const collections = await db.listCollections().toArray();
  const names = collections.map((c) => c.name);
  if (!names.length) {
    console.log(`[Clear] Database "${dbName}" has no collections, skipping.`);
    return;
  }

  console.log(`[Clear] Database "${dbName}" — collections: ${names.join(', ')}`);

  for (const coll of INTERACTION_COLLECTIONS) {
    if (names.includes(coll)) {
      const result = await db.collection(coll).deleteMany({});
      console.log(`  - Cleared ${result.deletedCount} from "${dbName}.${coll}"`);
    }
  }

  if (names.includes('users')) {
    const result = await db.collection('users').updateMany({}, { $set: { savedPatents: [] } });
    console.log(`  - Reset savedPatents on ${result.modifiedCount} user(s) in "${dbName}"`);
  }

  const patentCount = names.includes('patents') ? await db.collection('patents').countDocuments() : 0;
  const analysisCount = names.includes('patentanalyses') ? await db.collection('patentanalyses').countDocuments() : 0;
  const userCount = names.includes('users') ? await db.collection('users').countDocuments() : 0;
  console.log(`[Clear] "${dbName}" retained: ${userCount} users, ${patentCount} patents, ${analysisCount} analyses`);
}

async function clearMongoInteractions() {
  if (!mongoURI) {
    console.log('[Clear] No MONGODB_URI found, skipping MongoDB.');
    return;
  }

  const safeUri = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  const dbNames = resolveDbNames(mongoURI);
  console.log(`[Clear] Connecting to MongoDB at: ${safeUri}`);
  console.log(`[Clear] Target database(s): ${dbNames.join(', ')}`);

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });

    for (const dbName of dbNames) {
      await clearDatabase(dbName);
    }
  } catch (err) {
    console.error('[Clear] MongoDB error:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

function clearJsonInteractions() {
  if (!fs.existsSync(jsonDbPath)) {
    console.log('[Clear] No local JSON fallback file found, skipping.');
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(jsonDbPath, 'utf8'));

    data.interestRequests = [];
    data.meetingRequests = [];
    data.auditLogs = [];
    data.offers = [];
    data.ndaSignatures = [];
    data.accessRequests = [];
    data.transactions = [];

    if (Array.isArray(data.users)) {
      data.users = data.users.map((u) => ({ ...u, savedPatents: [] }));
    }

    fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(
      `[Clear] JSON fallback updated — kept ${data.users?.length ?? 0} users, ${data.patents?.length ?? 0} patents, ${data.patentAnalysis?.length ?? 0} analyses`
    );
  } catch (err) {
    console.error('[Clear] JSON error:', err.message);
    process.exitCode = 1;
  }
}

async function run() {
  console.log('======================================================');
  console.log('Clearing buyer/seller interactions (keeping patents & users)');
  console.log('======================================================');
  await clearMongoInteractions();
  clearJsonInteractions();
  console.log('======================================================');
  console.log('Done. Ready for fresh end-to-end test.');
  console.log('======================================================');
}

run();
