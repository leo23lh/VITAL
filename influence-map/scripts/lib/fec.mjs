// OpenFEC client for the import scripts: paced, cached requests through curl (which follows the
// machine's proxy settings). The API key is not handled here: the cloud environment's network
// proxy adds it to requests for api.open.fec.gov. Outside that environment, set FEC_API_KEY.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const API = 'https://api.open.fec.gov/v1';
/** Stay under the key's rate limit (60 a minute). */
const GAP_MS = 1100;
let last = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * GET an API path with query parameters; returns the parsed JSON. With `cacheDir`, a response is
 * reused for the rest of the run and for later runs (delete the folder to refetch).
 */
export async function fec(path, params = {}, cacheDir) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) for (const x of [].concat(v)) if (x !== undefined && x !== null) q.append(k, String(x));
  const url = `${API}${path}?${q}`;
  const file = cacheDir ? join(cacheDir, `${createHash('sha1').update(url).digest('hex')}.json`) : null;
  if (file && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));

  for (let attempt = 0; ; attempt++) {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const args = ['-sS', '-m', '60', '-w', '\n%{http_code}', '-H', `X-Api-Key: ${process.env.FEC_API_KEY ?? 'proxy-injected'}`, url];
    let out;
    try {
      out = execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 50e6, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      if (attempt >= 3) throw new Error(`FEC request failed: ${path} (${String(e.stderr ?? e.message).trim().split('\n').pop()})`);
      await sleep(5000 * (attempt + 1));
      continue;
    }
    const cut = out.lastIndexOf('\n');
    const code = Number(out.slice(cut + 1));
    if (code === 429 || code >= 500) {
      if (attempt >= 4) throw new Error(`FEC request failed: ${path} (HTTP ${code})`);
      await sleep(code === 429 ? 30000 : 5000 * (attempt + 1));
      continue;
    }
    if (code !== 200) throw new Error(`FEC request failed: ${path} (HTTP ${code}) ${out.slice(0, 200)}`);
    const body = out.slice(0, cut);
    if (file) {
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(file, body);
    }
    return JSON.parse(body);
  }
}

/** The public fec.gov page listing one contributor's itemized gifts in one cycle, to one committee or (with none given) to all. */
export function receiptsUrl(contributorName, committeeId, cycle) {
  const q = new URLSearchParams({ contributor_name: contributorName, ...(committeeId ? { committee_id: committeeId } : {}), two_year_transaction_period: String(cycle) });
  return `https://www.fec.gov/data/receipts/individual-contributions/?${q}`;
}
