const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STATUSES = ['unknown', 'available', 'unavailable'];

let dbCollection = null;

async function initDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('No MONGODB_URI provided. Falling back to local data.json storage.');
    return;
  }
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const database = client.db('schedulingApp');
    dbCollection = database.collection('weeks');
    console.log('Connected to MongoDB Atlas!');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
  }
}

function readLocalDb() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeLocalDb(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function defaultDays(weekStart) {
  return DAY_NAMES.map((name, i) => ({
    date: addDays(weekStart, i),
    dayName: name,
    status: 'unknown',
    note: '',
  }));
}

async function getWeek(weekStart) {
  if (dbCollection) {
    const doc = await dbCollection.findOne({ weekStart });
    if (!doc) {
      return { weekStart, days: defaultDays(weekStart) };
    }
    return { weekStart, days: JSON.parse(doc.days_json) };
  } else {
    const db = readLocalDb();
    if (!db[weekStart]) {
      return { weekStart, days: defaultDays(weekStart) };
    }
    return { weekStart, days: JSON.parse(db[weekStart].days_json) };
  }
}

async function saveWeek(weekStart, days) {
  const daysJson = JSON.stringify(days);
  const now = new Date().toISOString();
  
  if (dbCollection) {
    await dbCollection.updateOne(
      { weekStart },
      { $set: { days_json: daysJson, updated_at: now } },
      { upsert: true }
    );
  } else {
    const db = readLocalDb();
    db[weekStart] = { days_json: daysJson, updated_at: now };
    writeLocalDb(db);
  }
  return { weekStart, days };
}

module.exports = { initDb, getWeek, saveWeek, defaultDays, DAY_NAMES, STATUSES };
