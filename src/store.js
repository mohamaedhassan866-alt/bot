const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'data', 'tickets.json');
const pvpFile = path.join(__dirname, '..', 'data', 'pvp-points.json');
function read() { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } }
function write(data) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function getOpenTicket(userId, type) { const d = read(); return Object.values(d).find(x => x.userId === userId && x.type === type && !x.closed); }
function addTicket(channelId, item) { const d = read(); d[channelId] = item; write(d); }
function getTicket(channelId) { return read()[channelId]; }
function closeTicket(channelId) { const d = read(); if (d[channelId]) { d[channelId].closed = true; write(d); } }
function setClaim(channelId, userId) { const d = read(); if (d[channelId]) { d[channelId].claimedBy = userId; write(d); } }
function readPvp() { try { return JSON.parse(fs.readFileSync(pvpFile, 'utf8')); } catch { return {}; } }
function writePvp(data) { fs.mkdirSync(path.dirname(pvpFile), { recursive: true }); fs.writeFileSync(pvpFile, JSON.stringify(data, null, 2)); }
function getPvpPoints(userId) { return Number(readPvp()[userId]?.points || 0); }
function changePvpPoints(userId, amount, reason, moderatorId) {
  const data = readPvp();
  const entry = data[userId] || { points: 0, history: [] };
  entry.points = Math.max(0, Number(entry.points || 0) + amount);
  entry.history = Array.isArray(entry.history) ? entry.history : [];
  entry.history.push({ amount, reason, moderatorId, at: new Date().toISOString() });
  if (entry.history.length > 100) entry.history = entry.history.slice(-100);
  data[userId] = entry; writePvp(data); return entry.points;
}
function getPvpTop(limit = 10) { return Object.entries(readPvp()).map(([userId, entry]) => ({ userId, points: Number(entry.points || 0) })).sort((a,b) => b.points - a.points).slice(0, limit); }
module.exports = { getOpenTicket, addTicket, getTicket, closeTicket, setClaim, getPvpPoints, changePvpPoints, getPvpTop };
