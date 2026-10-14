const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { backup, readPassword } = require('./retireDemoAccounts');

async function provisionAdmin({ store, email, password, apply, jsonPath = path.join(__dirname, 'data', 'db.json') }) {
  email = String(email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('Supply the admin email with --email.');
  if (!['mongo', 'json'].includes(store)) throw new Error('Choose --store mongo or --store json explicitly.');
  let data;
  if (store === 'mongo') {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required; no fallback will be modified.');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 });
    data = { users: await mongoose.connection.db.collection('users').find({}).toArray() };
    console.log(`Database: MongoDB / ${mongoose.connection.db.databaseName}`);
  } else {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`Database: JSON / ${jsonPath}`);
  }
  const matches = data.users.filter(user => String(user.email || '').toLowerCase() === email);
  if (matches.length > 1) throw new Error('Multiple accounts match this email; resolve duplicates first.');
  const existing = matches[0];
  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'preview', email,
    account: existing ? 'existing' : 'create', currentRole: existing?.role, targetRole: 'admin',
  }, null, 2));
  if (!apply) return;
  if (!password || password.length < 8) throw new Error('Supply an admin password with at least eight characters.');
  const updates = {
    email, role: 'admin', name: existing?.name || 'Summar', organization: existing?.organization || 'MIET',
    passwordHash: await bcrypt.hash(password, 10), updatedAt: new Date(),
  };
  backup(data, store);
  if (store === 'mongo') {
    await mongoose.connection.db.collection('users').updateOne(
      existing ? { _id: existing._id } : { email },
      { $set: updates, $setOnInsert: { interests: [], domains: [], savedPatents: [], createdAt: new Date() } },
      { upsert: true },
    );
  } else {
    if (existing) Object.assign(existing, updates);
    else data.users.push({
      _id: require('crypto').randomUUID(), interests: [], domains: [], savedPatents: [], createdAt: new Date(), ...updates,
    });
    const temporaryPath = `${jsonPath}.retirement.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), { flag: 'wx' });
    fs.renameSync(temporaryPath, jsonPath);
  }
  const user = store === 'mongo'
    ? await mongoose.connection.db.collection('users').findOne({ email })
    : JSON.parse(fs.readFileSync(jsonPath, 'utf8')).users.find(user => user.email === email);
  if (user?.role !== 'admin' || !await bcrypt.compare(password, user.passwordHash)) {
    throw new Error('Admin account verification failed.');
  }
  console.log(JSON.stringify({ email: user.email, role: user.role, passwordVerified: true }));
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (['--apply', '--prompt-password'].includes(arg)) options[arg] = true;
    else if (['--store', '--email'].includes(arg) && args[index + 1] && !args[index + 1].startsWith('--')) options[arg] = args[++index];
    else throw new Error(`Invalid argument: ${arg}`);
  }
  const password = options['--prompt-password'] ? await readPassword('Admin password (hidden): ') : process.env.ADMIN_PASSWORD;
  await provisionAdmin({ store: options['--store'], email: options['--email'], apply: options['--apply'], password });
}

module.exports = { provisionAdmin };
if (require.main === module) main().catch(error => {
  console.error(`Admin setup failed: ${String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[MongoDB connection]')}`);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
