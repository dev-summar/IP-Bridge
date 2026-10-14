const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DEMO_EMAILS = new Set([
  'admin@patentbridge.com', 'owner@patentbridge.com', 'buyer@patentbridge.com',
]);
const COLLECTIONS = {
  users: 'users', patents: 'patents', patentAnalysis: 'patentanalyses',
  interestRequests: 'interestrequests', meetingRequests: 'meetingrequests',
  auditLogs: 'auditlogs', offers: 'offers', ndaSignatures: 'ndasignatures',
  transactions: 'transactions', accessRequests: 'accessrequests', searchHistory: 'searchhistories',
};
const OWNER_COLLECTIONS = ['patents', 'interestRequests', 'meetingRequests', 'offers', 'transactions', 'accessRequests'];
const normalizeEmail = value => String(value || '').trim().toLowerCase();

function planRetirement(data, email) {
  if (!email || DEMO_EMAILS.has(email)) throw new Error('Supply a real inventor email with --owner.');
  const demoUsers = data.users.filter(user => DEMO_EMAILS.has(normalizeEmail(user.email)));
  const owners = new Set(demoUsers.filter(user => user.role === 'owner').map(user => String(user._id)));
  const targets = data.users.filter(user => normalizeEmail(user.email) === email);
  if (targets.length > 1) throw new Error('Multiple accounts match the inventor email. Resolve duplicates first.');
  const target = targets[0];
  if (target && target.role !== 'owner') throw new Error('The destination account must have the owner role.');
  const transfers = Object.fromEntries(OWNER_COLLECTIONS.map(key => [
    key, (data[key] || []).filter(record => owners.has(String(record.ownerId))),
  ]));
  return { demoUsers, target, transfers };
}

function backup(data, store) {
  const directory = path.join(__dirname, 'data', 'backups');
  fs.mkdirSync(directory, { recursive: true });
  const filename = path.join(directory, `demo-retirement-${store}-${Date.now()}.json`);
  const serialized = store === 'mongo'
    ? mongoose.mongo.BSON.EJSON.stringify(data, { relaxed: false })
    : JSON.stringify(data, null, 2);
  fs.writeFileSync(filename, serialized, { flag: 'wx' });
  console.log(`Backup saved: ${filename}`);
}

function ownerRecord(email, passwordHash, id) {
  return {
    _id: id, email, passwordHash, name: 'Prof. Ankur Gupta', organization: 'MIET',
    role: 'owner', interests: [], domains: [], savedPatents: [],
    createdAt: new Date(), updatedAt: new Date(),
  };
}

async function retireDemoAccounts({ store, email, apply, jsonPath, password }) {
  let data;
  if (store === 'mongo') {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required. No fallback database will be modified.');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 });
    console.log(`Database: MongoDB / ${mongoose.connection.db.databaseName}`);
    data = Object.fromEntries(await Promise.all(Object.entries(COLLECTIONS).map(async ([key, collection]) => [
      key, await mongoose.connection.db.collection(collection).find({}).toArray(),
    ])));
  } else {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`Database: JSON / ${jsonPath}`);
  }
  const plan = planRetirement(data, email);
  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'preview', destination: email,
    destinationAccount: plan.target ? 'existing inventor' : 'create inventor',
    destinationListings: plan.target ? (data.patents || []).filter(record => String(record.ownerId) === String(plan.target._id)).length : 0,
    passwordVerified: !apply && password && plan.target ? await bcrypt.compare(password, plan.target.passwordHash) : undefined,
    demoAccounts: plan.demoUsers.map(user => ({ id: String(user._id), email: user.email, role: user.role })),
    ownershipTransfers: Object.fromEntries(Object.entries(plan.transfers).map(([key, records]) => [key, records.length])),
    remainingRealAccounts: data.users.length - plan.demoUsers.length + (plan.target ? 0 : 1),
  }, null, 2));
  if (!apply || plan.demoUsers.length === 0) return;
  if (!plan.target && !password) throw new Error('Set OWNER_PASSWORD to create the inventor account.');
  if (password && password.length < 8) throw new Error('OWNER_PASSWORD must have at least eight characters.');
  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
  const ownerId = plan.target?._id || (store === 'mongo' ? new mongoose.Types.ObjectId() : require('crypto').randomUUID());
  backup(data, store);

  if (store === 'json') {
    const demoIds = new Set(plan.demoUsers.map(user => String(user._id)));
    data.users = data.users.filter(user => !demoIds.has(String(user._id)));
    if (!plan.target) data.users.push(ownerRecord(email, passwordHash, ownerId));
    else if (passwordHash) {
      const user = data.users.find(user => String(user._id) === String(ownerId));
      user.passwordHash = passwordHash;
      user.updatedAt = new Date();
    }
    for (const records of Object.values(plan.transfers)) {
      for (const record of records) record.ownerId = String(ownerId);
    }
    const temporaryPath = `${jsonPath}.retirement.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), { flag: 'wx' });
    fs.renameSync(temporaryPath, jsonPath);
  } else {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const db = mongoose.connection.db;
        if (!plan.target) await db.collection('users').insertOne(ownerRecord(email, passwordHash, ownerId), { session });
        else if (passwordHash) await db.collection('users').updateOne(
          { _id: ownerId }, { $set: { passwordHash, updatedAt: new Date() } }, { session },
        );
        for (const [key, records] of Object.entries(plan.transfers)) {
          if (records.length) await db.collection(COLLECTIONS[key]).updateMany(
            { _id: { $in: records.map(record => record._id) } },
            { $set: { ownerId: String(ownerId), updatedAt: new Date() } }, { session },
          );
        }
        await db.collection('users').deleteMany(
          { _id: { $in: plan.demoUsers.map(user => user._id) } }, { session },
        );
      });
    } finally {
      await session.endSession();
    }
  }
  console.log(`Transferred ownership and removed ${plan.demoUsers.length} demo account(s).`);
}

async function main() {
  const args = process.argv.slice(2);
  const value = name => args[args.indexOf(name) + 1];
  const allowed = new Set(['--store', '--owner', '--json-path', '--apply', '--prompt-password']);
  for (let index = 0; index < args.length; index++) {
    if (!allowed.has(args[index])) throw new Error(`Unknown option: ${args[index]}`);
    if (!['--apply', '--prompt-password'].includes(args[index])) {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing value for ${args[index]}`);
      index++;
    }
  }
  const store = args.includes('--store') ? value('--store') : undefined;
  if (!['json', 'mongo'].includes(store)) throw new Error('Choose --store json or --store mongo explicitly.');
  const email = normalizeEmail(args.includes('--owner') ? value('--owner') : '');
  const password = args.includes('--prompt-password') ? await readPassword() : process.env.OWNER_PASSWORD;
  await retireDemoAccounts({
    store, email, apply: args.includes('--apply'), password,
    jsonPath: args.includes('--json-path') ? path.resolve(value('--json-path')) : path.join(__dirname, 'data', 'db.json'),
  });
}

function readPassword(label = 'Inventor password (hidden): ') {
  if (!process.stdin.isTTY) throw new Error('--prompt-password requires an interactive terminal.');
  return new Promise((resolve, reject) => {
    let password = '';
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const finish = error => {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      if (error) reject(error); else resolve(password);
    };
    const onData = chunk => {
      for (const character of chunk.toString()) {
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u0003') return finish(new Error('Password input cancelled.'));
        if (character === '\u007f' || character === '\b') password = password.slice(0, -1);
        else password += character;
      }
    };
    process.stdin.on('data', onData);
  });
}

module.exports = { planRetirement, retireDemoAccounts, backup, readPassword };
if (require.main === module) main().catch(error => {
  // Never print connection strings or passwords from driver errors.
  console.error(`Cleanup failed: ${String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[MongoDB connection]')}`);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
