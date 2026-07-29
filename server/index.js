require('dotenv').config();

const path = require('path');
const express = require('express');
const { getWeek, saveWeek, DAY_NAMES, STATUSES } = require('./db');
const { issueToken, requireEditToken, verifyPasscode } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const DISPLAY_NAME = process.env.DISPLAY_NAME || "Aidan's Availability";

if (!process.env.EDIT_PASSCODE_HASH || !process.env.EDIT_PASSCODE_SALT) {
  console.warn(
    'No passcode configured — editing is disabled until you run `npm run set-passcode`.'
  );
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NOTE_LENGTH = 200;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LOGIN_MAX_ATTEMPTS;
}

app.get('/api/config', (req, res) => {
  res.json({ displayName: DISPLAY_NAME });
});

app.post('/api/login', (req, res) => {
  if (isRateLimited(req.ip)) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }
  const { passcode } = req.body || {};
  if (!verifyPasscode(passcode)) {
    return res.status(401).json({ error: 'Incorrect passcode.' });
  }
  res.json({ token: issueToken() });
});

app.get('/api/week', (req, res) => {
  const { start } = req.query;
  if (typeof start !== 'string' || !DATE_RE.test(start)) {
    return res.status(400).json({ error: 'Invalid or missing "start" date (expected YYYY-MM-DD).' });
  }
  res.json(getWeek(start));
});

app.post('/api/week', requireEditToken, (req, res) => {
  const { weekStart, days } = req.body || {};
  if (typeof weekStart !== 'string' || !DATE_RE.test(weekStart)) {
    return res.status(400).json({ error: 'Invalid or missing "weekStart" date (expected YYYY-MM-DD).' });
  }
  if (!Array.isArray(days) || days.length !== 7) {
    return res.status(400).json({ error: 'Expected an array of 7 days.' });
  }

  const cleanDays = [];
  for (let i = 0; i < 7; i++) {
    const d = days[i];
    if (!d || !STATUSES.includes(d.status)) {
      return res.status(400).json({ error: `Day ${i + 1} is missing a valid "status".` });
    }
    const note = typeof d.note === 'string' ? d.note.slice(0, MAX_NOTE_LENGTH) : '';
    const date = typeof d.date === 'string' && DATE_RE.test(d.date) ? d.date : null;
    if (!date) {
      return res.status(400).json({ error: `Day ${i + 1} is missing a valid "date".` });
    }
    cleanDays.push({ date, dayName: DAY_NAMES[i], status: d.status, note });
  }

  const saved = saveWeek(weekStart, cleanDays);
  res.json(saved);
});

app.post('/api/bug-report', async (req, res) => {
  const { issue } = req.body;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!issue || typeof issue !== 'string') {
    return res.status(400).json({ error: 'Invalid issue description' });
  }

  if (!webhookUrl) {
    console.warn('Bug report received, but DISCORD_WEBHOOK_URL is not set.');
    console.log(`Issue: ${issue}`);
    return res.json({ success: true, warning: 'Webhook not configured' });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🚨 **New Bug Report for Aidan's Availability!**\n\n**Issue:**\n> ${issue.replace(/\n/g, '\n> ')}`
      })
    });

    if (response.ok) {
      res.json({ success: true });
    } else {
      console.error('Failed to send to Discord webhook:', response.statusText);
      res.status(500).json({ error: 'Failed to send bug report' });
    }
  } catch (err) {
    console.error('Error sending bug report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Availability app running at http://localhost:${PORT}`);
});
