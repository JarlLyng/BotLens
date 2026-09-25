#!/usr/bin/env node
// Chrome Web Store API V2 client for the publish workflow.
//
//   node scripts/cws.js check             print the item's status, change nothing
//   node scripts/cws.js draft <zip>       upload without submitting
//   node scripts/cws.js publish <zip>     upload, then submit for review
//
// Reads ACCESS_TOKEN, PUBLISHER_ID and EXTENSION_ID from the environment. The
// workflow gets the access token from Google through GitHub's OIDC token
// (Workload Identity Federation), so there is no refresh token to expire (#43).
// API guide: https://developer.chrome.com/docs/webstore/using-api

const fs = require('node:fs');
const path = require('node:path');

const ROOT = 'https://chromewebstore.googleapis.com';
const POLL_SECONDS = 2;
const MAX_WAIT_SECONDS = 300;

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function call(method, url, token, { body, headers = {} } = {}) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...headers },
    body,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    const message = (json.error && json.error.message) || text || res.statusText;
    throw new Error(`${method} ${url.replace(ROOT, '')} failed with ${res.status}: ${message}`);
  }
  return json;
}

async function main() {
  const [mode, zip] = process.argv.slice(2);
  if (!['check', 'draft', 'publish'].includes(mode)) {
    throw new Error('Usage: cws.js check | draft <zip> | publish <zip>');
  }
  const token = env('ACCESS_TOKEN');
  const item = `publishers/${env('PUBLISHER_ID')}/items/${env('EXTENSION_ID')}`;
  const status = () => call('GET', `${ROOT}/v2/${item}:fetchStatus`, token);

  if (mode === 'check') {
    const s = await status();
    delete s.publicKey; // long and not useful in a log
    console.log(JSON.stringify(s, null, 2));
    console.log('Authentication OK. Nothing was uploaded.');
    return;
  }

  if (!zip || !fs.existsSync(zip)) throw new Error(`Zip not found: ${zip}`);
  console.log(`Uploading ${path.basename(zip)}`);
  const upload = await call('POST', `${ROOT}/upload/v2/${item}:upload`, token, {
    body: fs.readFileSync(zip),
    headers: { 'X-Goog-Upload-Protocol': 'raw', 'X-Goog-Upload-File-Name': 'extension.zip' },
  });

  // An upload can finish asynchronously; fetchStatus reports when it has.
  let state = upload.uploadState;
  for (let waited = 0; state === 'IN_PROGRESS' && waited < MAX_WAIT_SECONDS; waited += POLL_SECONDS) {
    await new Promise(resolve => setTimeout(resolve, POLL_SECONDS * 1000));
    state = (await status()).lastAsyncUploadState;
  }
  if (state !== 'SUCCEEDED') {
    throw new Error(`Upload did not succeed (state ${state}): ${JSON.stringify(upload)}`);
  }
  console.log(`Uploaded version ${upload.crxVersion || '(unknown)'}`);

  if (mode === 'draft') {
    console.log('Uploaded as draft (not submitted for publishing).');
    return;
  }

  const published = await call('POST', `${ROOT}/v2/${item}:publish`, token, {
    body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH' }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (published.state === 'REJECTED') throw new Error('Publish rejected');
  console.log(`Submitted. State: ${published.state}`);
}

main().catch(error => {
  console.error(`::error::${error.message}`);
  process.exit(1);
});
