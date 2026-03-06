/**
 * tweet-new-articles.mjs
 *
 * Run after a successful build/deploy to tweet any articles
 * that were published since the last run.
 *
 * Uses Twitter API v2 (OAuth 1.0a User Context) — free tier supports posting.
 *
 * Required env vars:
 *   TWITTER_API_KEY
 *   TWITTER_API_SECRET
 *   TWITTER_ACCESS_TOKEN
 *   TWITTER_ACCESS_TOKEN_SECRET
 *
 * State file: .tweet-state.json (tracks last-tweeted date, gitignored)
 *
 * Usage:
 *   node scripts/tweet-new-articles.mjs
 *   node scripts/tweet-new-articles.mjs --dry-run
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import crypto from 'crypto';

const CONTENT_DIR   = new URL('../src/content/learn/', import.meta.url).pathname;
const STATE_FILE    = new URL('../.tweet-state.json', import.meta.url).pathname;
const SITE_URL      = 'https://zro2.one';
const DRY_RUN       = process.argv.includes('--dry-run');

// ── Twitter OAuth 1.0a helper ─────────────────────────────────────────────────

function oauthSign({ method, url, params, apiKey, apiSecret, accessToken, accessTokenSecret }) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce     = crypto.randomBytes(16).toString('hex');

  const oauthParams = {
    oauth_consumer_key:     apiKey,
    oauth_nonce:            nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        timestamp,
    oauth_token:            accessToken,
    oauth_version:          '1.0',
  };

  const allParams = { ...params, ...oauthParams };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join('&');

  const sigBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString),
  ].join('&');

  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`;
  const signature  = crypto.createHmac('sha1', signingKey).update(sigBase).digest('base64');

  oauthParams.oauth_signature = signature;

  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');

  return authHeader;
}

async function postTweet(text) {
  const {
    TWITTER_API_KEY: apiKey,
    TWITTER_API_SECRET: apiSecret,
    TWITTER_ACCESS_TOKEN: accessToken,
    TWITTER_ACCESS_TOKEN_SECRET: accessTokenSecret,
  } = process.env;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error('Missing Twitter API credentials in environment variables.');
  }

  const url    = 'https://api.twitter.com/2/tweets';
  const body   = JSON.stringify({ text });
  const method = 'POST';

  const authHeader = oauthSign({
    method, url, params: {}, apiKey, apiSecret, accessToken, accessTokenSecret,
  });

  const res = await fetch(url, {
    method,
    headers: {
      Authorization:  authHeader,
      'Content-Type': 'application/json',
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Twitter API error: ${JSON.stringify(data)}`);
  return data;
}

// ── Frontmatter parser ────────────────────────────────────────────────────────

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (!kv) continue;
    let val = kv[2].trim().replace(/\s*#.*$/, '').replace(/^['"]|['"]$/g, '');
    data[kv[1]] = val;
  }
  return data;
}

// ── Tweet composer ────────────────────────────────────────────────────────────

const DEPTH_EMOJI = {
  essential:  '🟢',
  applied:    '🔵',
  technical:  '🟣',
  research:   '🔴',
};

function composeTweet(article) {
  const emoji   = DEPTH_EMOJI[article.depth] ?? '📖';
  const url     = `${SITE_URL}/learn/${article.slug}`;
  const tags    = (article.tags ?? []).slice(0, 2).map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
  // Stay well under 280 chars — URL is t.co-shortened to 23 chars by Twitter
  const title   = article.title.length > 100 ? article.title.slice(0, 97) + '…' : article.title;

  return `${emoji} New article: ${title}\n\n${article.description?.slice(0, 120) ?? ''}\n\n${url}\n\n${tags} #AI #LearnAI`.trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  // Load state
  let state = { lastTweetedDate: '1970-01-01', tweetedSlugs: [] };
  if (existsSync(STATE_FILE)) {
    try { state = JSON.parse(await readFile(STATE_FILE, 'utf-8')); } catch {}
  }

  const files = (await readdir(CONTENT_DIR)).filter(f => f.endsWith('.md'));
  const newArticles = [];

  for (const file of files) {
    const raw   = await readFile(join(CONTENT_DIR, file), 'utf-8');
    const data  = parseFrontmatter(raw);
    const slug  = basename(file, '.md');

    if (data.draft === 'true') continue;
    if (state.tweetedSlugs.includes(slug)) continue;

    // Only tweet articles published after lastTweetedDate
    const articleDate = data.date ?? '1970-01-01';
    if (articleDate <= state.lastTweetedDate) continue;

    newArticles.push({ slug, ...data });
  }

  // Sort oldest-first so tweets go out in publish order
  newArticles.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  if (newArticles.length === 0) {
    console.log('✅ No new articles to tweet.');
    return;
  }

  console.log(`📢 ${newArticles.length} new article(s) to tweet:`);

  for (const article of newArticles) {
    const tweet = composeTweet(article);
    console.log(`\n--- @${article.slug} ---`);
    console.log(tweet);
    console.log(`(${tweet.length} chars)`);

    if (!DRY_RUN) {
      try {
        const result = await postTweet(tweet);
        console.log(`✅ Tweeted: https://x.com/Zro2One/status/${result.data.id}`);
        state.tweetedSlugs.push(article.slug);
        if (article.date > state.lastTweetedDate) state.lastTweetedDate = article.date;
      } catch (err) {
        console.error(`❌ Failed to tweet "${article.title}":`, err.message);
      }

      // Respect rate limits — 1 tweet per 3s
      await new Promise(r => setTimeout(r, 3000));
    } else {
      state.tweetedSlugs.push(article.slug);
    }
  }

  // Save state
  if (!DRY_RUN || DRY_RUN) {
    // Always save slugs in dry-run so repeated dry runs don't re-list same articles
    // (comment this out if you want dry-run to be truly read-only)
  }
  if (!DRY_RUN) {
    await writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    console.log('\n✅ State saved.');
  } else {
    console.log('\n[DRY RUN] State not saved. Re-run without --dry-run to post.');
  }
}

run().catch(err => {
  console.error('❌ tweet-new-articles failed:', err);
  process.exit(1);
});
