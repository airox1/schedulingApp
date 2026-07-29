const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

function readDb() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeDb(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STATUSES = ['unknown', 'available', 'unavailable'];

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

function getWeek(weekStart) {
  const db = readDb();
  if (!db[weekStart]) {
    return { weekStart, days: defaultDays(weekStart) };
  }
  return { weekStart, days: JSON.parse(db[weekStart].days_json) };
}

function saveWeek(weekStart, days) {
  const daysJson = JSON.stringify(days);
  const now = new Date().toISOString();
  const db = readDb();
  db[weekStart] = { days_json: daysJson, updated_at: now };
  writeDb(db);
  return { weekStart, days };
}

module.exports = { getWeek, saveWeek, defaultDays, DAY_NAMES, STATUSES };
