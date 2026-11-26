/**
 * Create a rich demo buyer linked to Ankur Gupta's patents:
 * bookmarks, domains/interests, NDA + approved access, accepted offer, completed transaction.
 *
 *   node scripts/seedDemoBuyer.cjs
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

const BUYER = {
  email: 'vikram.malhotra@tatainnovationlabs.com',
  password: 'Vikram@2026',
  name: 'Vikram Malhotra',
  organization: 'Tata Innovation Labs',
  // Keep focus narrow so Discover match % varies by patent (not flat 88% on everything)
  domains: ['Healthcare', 'AI'],
  interests: ['Medical devices', 'Wearables', 'Edge AI', 'Biomechanics'],
};
const LEGACY_EMAILS = ['buyer.demo@mietjammu.in', 'buyer@patentbridge.com'];

function oid() {
  return new ObjectId().toString();
}

function idStr(value) {
  return value && value._id ? String(value._id) : String(value);
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
  });
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const patents = db.collection('patents');
  const ndas = db.collection('ndasignatures');
  const access = db.collection('accessrequests');
  const interests = db.collection('interestrequests');
  const meetings = db.collection('meetingrequests');
  const offers = db.collection('offers');
  const transactions = db.collection('transactions');
  const matchEvents = db.collection('matchevents');

  const owner =
    (await users.findOne({ email: /ankur/i })) ||
    (await users.findOne({ name: /ankur\s*gupta/i })) ||
    (await users.findOne({ email: 'ankurgupta@mietjammu.in' }));

  if (!owner) {
    throw new Error('Ankur Gupta owner account not found in MongoDB.');
  }
  const ownerId = idStr(owner);
  console.log(`[seed] Owner: ${owner.name} <${owner.email}> (${ownerId})`);

  const approved = await patents
    .find({ ownerId: { $in: [ownerId, owner._id] }, status: 'approved' })
    .project({ title: 1, patentNumber: 1, askingPrice: 1, isForSale: 1, isForLicense: 1, ownerId: 1 })
    .toArray();

  // ownerId may be stored as string or ObjectId depending on inserts
  let listing = approved;
  if (listing.length === 0) {
    listing = await patents
      .find({ status: 'approved' })
      .project({ title: 1, patentNumber: 1, askingPrice: 1, isForSale: 1, isForLicense: 1, ownerId: 1 })
      .toArray();
    listing = listing.filter((p) => String(p.ownerId) === ownerId);
  }

  if (listing.length === 0) {
    throw new Error('No approved patents found for Ankur Gupta.');
  }

  console.log(`[seed] Approved patents for owner: ${listing.length}`);

  const dealPatent =
    listing.find((p) => p.isForSale) ||
    listing.find((p) => p.isForLicense) ||
    listing[0];
  const bookmarkPatents = listing.slice(0, Math.min(6, listing.length));
  const unlockedPatents = listing.slice(0, Math.min(3, listing.length));

  const passwordHash = await bcrypt.hash(BUYER.password, 10);
  const now = new Date();

  // Remove earlier placeholder demo buyers so only the real identity remains
  for (const legacy of LEGACY_EMAILS) {
    const old = await users.findOne({ email: legacy });
    if (old) {
      const oldId = idStr(old);
      await Promise.all([
        ndas.deleteMany({ buyerId: oldId }),
        access.deleteMany({ buyerId: oldId }),
        interests.deleteMany({ buyerId: oldId }),
        meetings.deleteMany({ buyerId: oldId }),
        offers.deleteMany({ buyerId: oldId }),
        transactions.deleteMany({ buyerId: oldId }),
        matchEvents.deleteMany({ userId: oldId }),
        users.deleteOne({ _id: old._id }),
      ]);
      console.log(`[seed] Removed placeholder buyer ${legacy}`);
    }
  }

  let buyer = await users.findOne({ email: BUYER.email });
  if (buyer) {
    await users.updateOne(
      { _id: buyer._id },
      {
        $set: {
          name: BUYER.name,
          organization: BUYER.organization,
          role: 'buyer',
          passwordHash,
          domains: BUYER.domains,
          interests: BUYER.interests,
          savedPatents: bookmarkPatents.map((p) => idStr(p)),
          updatedAt: now,
        },
      }
    );
    buyer = await users.findOne({ _id: buyer._id });
    console.log(`[seed] Updated buyer ${BUYER.email}`);
  } else {
    const insert = {
      name: BUYER.name,
      email: BUYER.email,
      organization: BUYER.organization,
      role: 'buyer',
      passwordHash,
      domains: BUYER.domains,
      interests: BUYER.interests,
      savedPatents: bookmarkPatents.map((p) => idStr(p)),
      createdAt: now,
      updatedAt: now,
    };
    const result = await users.insertOne(insert);
    buyer = await users.findOne({ _id: result.insertedId });
    console.log(`[seed] Created buyer ${BUYER.email}`);
  }

  const buyerId = idStr(buyer);

  // Clean prior demo artefacts for this buyer on these patents (idempotent re-run)
  const patentIds = unlockedPatents.map((p) => idStr(p));
  await Promise.all([
    ndas.deleteMany({ buyerId }),
    access.deleteMany({ buyerId }),
    interests.deleteMany({ buyerId }),
    meetings.deleteMany({ buyerId }),
    offers.deleteMany({ buyerId }),
    transactions.deleteMany({ buyerId }),
    matchEvents.deleteMany({ userId: buyerId }),
  ]);

  for (const patent of unlockedPatents) {
    const patentId = idStr(patent);
    await ndas.insertOne({
      patentId,
      buyerId,
      fullName: BUYER.name,
      acceptanceMethod: 'typed_name_consent',
      ipAddress: '127.0.0.1',
      signedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await access.insertOne({
      patentId,
      buyerId,
      ownerId,
      status: 'approved',
      createdAt: now,
      updatedAt: now,
    });
    await interests.insertOne({
      patentId,
      buyerId,
      ownerId,
      name: BUYER.name,
      organization: BUYER.organization,
      email: BUYER.email,
      purpose: 'Licensing',
      message: 'Evaluating fit for our healthcare and edge-AI product roadmap at Tata Innovation Labs.',
      status: 'contacted',
      createdAt: now,
      updatedAt: now,
    });
    await matchEvents.insertOne({
      userId: buyerId,
      patentId,
      event: 'save',
      createdAt: now,
      updatedAt: now,
    });
  }

  // Meeting accepted on deal patent
  const dealPatentId = idStr(dealPatent);
  await meetings.insertOne({
    patentId: dealPatentId,
    buyerId,
    ownerId,
    preferredDate: '2026-11-20',
    preferredTime: '15:00',
    notes: 'Commercial diligence call on the MIET footwear monitoring patent.',
    status: 'accepted',
    videoCallLink: `https://meet.jit.si/PatentBridge-Meeting-${dealPatentId.slice(-8)}`,
    createdAt: now,
    updatedAt: now,
  });

  const price =
    Number(dealPatent.askingPrice) > 0
      ? Number(dealPatent.askingPrice)
      : 2500000;
  const offerType = dealPatent.isForSale ? 'sale' : 'license';
  const offerId = oid();
  await offers.insertOne({
    _id: new ObjectId(offerId),
    patentId: dealPatentId,
    buyerId,
    ownerId,
    price,
    type: offerType,
    status: 'accepted',
    milestones: ['Due diligence complete', 'Assignment / licence executed', 'Final payout'],
    notes: 'Acquisition interest following diligence on the MIET biomechanical footwear portfolio.',
    createdAt: now,
    updatedAt: now,
  });

  const commissionAmount = Math.round(price * 0.05);
  const netPayout = price - commissionAmount;
  const milestones = [
    { description: 'Due diligence complete', percentage: 30, amount: Math.round(price * 0.3), status: 'released', releasedAt: now },
    { description: 'Assignment / licence executed', percentage: 40, amount: Math.round(price * 0.4), status: 'released', releasedAt: now },
    { description: 'Final payout', percentage: 30, amount: Math.round(price * 0.3), status: 'released', releasedAt: now },
  ];

  await transactions.insertOne({
    offerId,
    patentId: dealPatentId,
    buyerId,
    ownerId,
    amount: price,
    commissionAmount,
    netPayout,
    status: 'completed',
    paymentId: `pay_${Date.now()}`,
    milestones,
    createdAt: now,
    updatedAt: now,
  });

  await matchEvents.insertOne({
    userId: buyerId,
    patentId: dealPatentId,
    event: 'enquire',
    createdAt: now,
    updatedAt: now,
  });

  console.log('======================================================');
  console.log('Demo buyer ready');
  console.log(`  Email:        ${BUYER.email}`);
  console.log(`  Password:     ${BUYER.password}`);
  console.log(`  Name:         ${BUYER.name} (${BUYER.organization})`);
  console.log(`  Domains:      ${BUYER.domains.join(', ')}`);
  console.log(`  Interests:    ${BUYER.interests.join(', ')}`);
  console.log(`  Bookmarks:    ${bookmarkPatents.length}`);
  console.log(`  Unlocked:     ${unlockedPatents.length} (NDA + approved)`);
  console.log(`  Completed deal on: ${dealPatent.title}`);
  console.log(`  Deal price:   ₹${price.toLocaleString('en-IN')} (${offerType})`);
  console.log('  Seller:       Ankur Gupta / MIET');
  console.log('======================================================');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[seed] Failed:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
