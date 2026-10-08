// Fetches a URL a stranger typed into the web demo (#28) without letting it
// reach anything but the public web.
//
// - http and https only, on ports 80 and 443, no credentials in the URL.
// - Every address the hostname resolves to is checked at connect time, in the
//   DNS lookup the connection itself uses. A hostname that resolves to a private,
//   loopback, link-local or otherwise reserved address is refused, and so is a
//   name that changes its answer between check and connect (DNS rebinding).
// - IP literals never reach DNS, so they are checked before the request.
// - Redirects are followed by hand, at most MAX_REDIRECTS, and each target is
//   checked again.
// - A time limit and a byte limit on every response.

const dns = require('dns');
const net = require('net');
const { Agent, fetch } = require('undici');

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 8000;
const USER_AGENT = 'BotLensDemo/1.0 (+https://botlens.iamjarl.com/; IAMJARL)';

// Addresses that are not the public internet (IANA special-purpose registries).
const blocked = new net.BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
]) blocked.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of [
  ['::', 128], ['::1', 128], ['100::', 64], ['2001::', 23], ['2001:db8::', 32],
  ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
]) blocked.addSubnet(address, prefix, 'ipv6');

// IPv6 forms that carry an IPv4 address: mapped (::ffff:a.b.c.d) and NAT64
// (64:ff9b::/96). They are judged by the IPv4 address inside.
function embeddedIPv4(address) {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];
  const groups = address.toLowerCase().match(/^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!groups) return null;
  const hi = parseInt(groups[1], 16), lo = parseInt(groups[2], 16);
  return [hi >> 8, hi & 255, lo >> 8, lo & 255].join('.');
}

function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return !blocked.check(address, 'ipv4');
  if (family === 6) {
    const v4 = embeddedIPv4(address);
    if (v4) return !blocked.check(v4, 'ipv4');
    return !blocked.check(address, 'ipv6');
  }
  return false;
}

class DemoFetchError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// Throws unless the URL is one the demo may fetch. Returns it as a URL.
function checkUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch (e) {
    throw new DemoFetchError('bad-url', 'That is not a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new DemoFetchError('bad-url', 'Only http and https addresses can be checked.');
  }
  if (url.username || url.password) {
    throw new DemoFetchError('bad-url', 'Addresses with a username or password cannot be checked.');
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new DemoFetchError('bad-url', 'Only the standard ports 80 and 443 can be checked.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && !isPublicAddress(host)) {
    throw new DemoFetchError('blocked', 'That address is not on the public internet.');
  }
  if (!net.isIP(host) && (!host.includes('.') || /\.(local|localhost|internal|lan|home\.arpa)$/i.test(host))) {
    throw new DemoFetchError('blocked', 'That address is not on the public internet.');
  }
  return url;
}

// The lookup every connection uses. Refuses the whole name if any answer is
// not public, so a mixed answer cannot be used to pick a private one.
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) {
      return callback(new DemoFetchError('blocked', 'That address is not on the public internet.'));
    }
    if (options && options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
}

const agent = new Agent({ connect: { lookup: safeLookup, timeout: TIMEOUT_MS } });

async function readLimited(res, maxBytes) {
  if (!res.body) return { text: '', truncated: false };
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
    if (size >= maxBytes) { truncated = true; break; }
  }
  reader.cancel().catch(() => {});
  return { text: Buffer.concat(chunks).subarray(0, maxBytes).toString('utf8'), truncated };
}

// Returns { url, status, contentType, text, truncated } for the final response.
async function safeFetch(input, { maxBytes, fetchImpl = fetch } = {}) {
  let url = checkUrl(input);
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let hop = 0; ; hop++) {
    let res;
    try {
      res = await fetchImpl(url.href, {
        dispatcher: agent, redirect: 'manual', signal,
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,text/plain;q=0.9,*/*;q=0.5' },
      });
    } catch (e) {
      const cause = e.cause || e;
      if (cause instanceof DemoFetchError) throw cause;
      if (e.name === 'TimeoutError' || cause.name === 'TimeoutError') {
        throw new DemoFetchError('timeout', 'The site took too long to answer.');
      }
      throw new DemoFetchError('unreachable', 'The site could not be reached.');
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      if (hop >= MAX_REDIRECTS) throw new DemoFetchError('redirects', 'The site redirects too many times.');
      url = checkUrl(new URL(res.headers.get('location'), url).href);
      if (res.body) res.body.cancel().catch(() => {});
      continue;
    }
    const { text, truncated } = await readLimited(res, maxBytes);
    return { url: url.href, status: res.status, contentType: (res.headers.get('content-type') || '').toLowerCase(), text, truncated };
  }
}

module.exports = { safeFetch, checkUrl, isPublicAddress, safeLookup, DemoFetchError, USER_AGENT };
