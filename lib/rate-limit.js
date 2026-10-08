// Abuse limits for the web demo (#28), kept in Turso.
//
// The only thing stored: a counter per visitor per hour, and one counter for the
// whole demo per day. A visitor's key is a SHA-256 of their IP address with a
// salt derived from a secret and the date, so it changes every day and the IP
// itself is never stored. Rows expire after two days and are deleted as they go.
// No URL, score or anything else about a request is kept.

const crypto = require('crypto');

const PER_VISITOR_PER_HOUR = 10;
const ALL_VISITORS_PER_DAY = 1000;
const KEEP_MS = 2 * 24 * 60 * 60 * 1000;

const SCHEMA = `CREATE TABLE IF NOT EXISTS demo_rate (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires INTEGER NOT NULL
)`;

function visitorKey(ip, secret, now) {
  const day = new Date(now).toISOString().slice(0, 10);
  const salt = crypto.createHmac('sha256', secret).update(day).digest();
  return crypto.createHmac('sha256', salt).update(ip || 'unknown').digest('hex');
}

async function bump(db, bucket, now) {
  const result = await db.execute({
    sql: `INSERT INTO demo_rate (bucket, count, expires) VALUES (?, 1, ?)
          ON CONFLICT(bucket) DO UPDATE SET count = count + 1
          RETURNING count`,
    args: [bucket, now + KEEP_MS],
  });
  return Number(result.rows[0].count);
}

// Returns { allowed, reason }. Counts the request either way.
async function checkRateLimit(db, { ip, secret, now = Date.now() }) {
  await db.execute(SCHEMA);
  await db.execute({ sql: 'DELETE FROM demo_rate WHERE expires < ?', args: [now] });
  const hour = Math.floor(now / 3600000);
  const day = new Date(now).toISOString().slice(0, 10);
  const visitor = await bump(db, `v:${visitorKey(ip, secret, now)}:${hour}`, now);
  if (visitor > PER_VISITOR_PER_HOUR) return { allowed: false, reason: 'visitor' };
  const all = await bump(db, `all:${day}`, now);
  if (all > ALL_VISITORS_PER_DAY) return { allowed: false, reason: 'global' };
  return { allowed: true };
}

module.exports = { checkRateLimit, visitorKey, PER_VISITOR_PER_HOUR, ALL_VISITORS_PER_DAY };
