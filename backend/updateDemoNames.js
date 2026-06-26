const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const UPDATES = [
  {
    email: 'admin@patentbridge.com',
    name: 'Rajesh Sharma (Admin)',
    organization: 'PatentBridge India',
  },
  {
    email: 'buyer@patentbridge.com',
    name: 'Vikram Malhotra (Corporate Acquirer)',
    organization: 'Tata Innovation Labs',
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
  });

  const dbNames = ['test', 'patentbridge'];
  for (const dbName of dbNames) {
    const db = mongoose.connection.client.db(dbName);
    const cols = await db.listCollections().toArray();
    if (!cols.some((c) => c.name === 'users')) continue;

    for (const update of UPDATES) {
      const result = await db.collection('users').updateMany(
        { email: update.email },
        { $set: { name: update.name, organization: update.organization } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Updated ${result.modifiedCount} user(s) in ${dbName}: ${update.email}`);
      }
    }
  }

  const users = await mongoose.connection.client
    .db('test')
    .collection('users')
    .find({}, { projection: { name: 1, email: 1, organization: 1, role: 1 } })
    .toArray();
  console.log(JSON.stringify(users, null, 2));

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
