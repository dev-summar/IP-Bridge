const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const mongoURI = process.env.MONGODB_URI;
const jsonDbPath = path.join(__dirname, 'data/db.json');

async function clearMongo() {
  if (!mongoURI) {
    console.log('[Clear] No MONGODB_URI found, skipping Atlas collection clear.');
    return;
  }

  console.log(`[Clear] Attempting connection to MongoDB Atlas at: ${mongoURI}`);
  try {
    await mongoose.connect(mongoURI);
    console.log('[Clear] Connected successfully to Atlas. Clearing collections...');

    const db = mongoose.connection.db;
    
    // Clear collections if they exist
    const collections = await db.listCollections().toArray();
    const names = collections.map(c => c.name);

    const targetCollections = ['patents', 'patentanalyses', 'interestrequests', 'meetingrequests', 'auditlogs'];
    
    for (const coll of targetCollections) {
      if (names.includes(coll)) {
        await db.collection(coll).deleteMany({});
        console.log(`  - Cleared all documents from collection: "${coll}"`);
      }
    }
    console.log('[Clear] MongoDB Atlas cleared successfully.');
  } catch (err) {
    console.error('[Clear] Error cleaning MongoDB Atlas database:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

function clearJSON() {
  if (!fs.existsSync(jsonDbPath)) {
    console.log('[Clear] No local JSON fallback file found, skipping.');
    return;
  }

  try {
    console.log('[Clear] Clearing local JSON fallback database contents...');
    const data = JSON.parse(fs.readFileSync(jsonDbPath, 'utf8'));
    
    // Empty all arrays except users
    data.patents = [];
    data.patentAnalysis = [];
    data.interestRequests = [];
    data.meetingRequests = [];
    data.auditLogs = [];

    fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('[Clear] JSON file databases cleared successfully (retaining seeded accounts).');
  } catch (err) {
    console.error('[Clear] Error cleaning JSON fallback file:', err.message);
  }
}

async function run() {
  console.log('======================================================');
  console.log('🧹 Starting Database Reset: Removing Demo Data...');
  console.log('======================================================');
  
  await clearMongo();
  clearJSON();
  
  console.log('======================================================');
  console.log('✅ Reset Complete! Pre-seeded accounts retained.');
  console.log('======================================================');
}

run();
