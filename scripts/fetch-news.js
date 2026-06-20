// scripts/fetch-news.js
// 各メディアの公式RSSを取得し、暗号資産に関係する記事のみをnews.jsonにまとめる。
// 著作権配慮: 見出しと元記事へのリンクのみを扱い、本文の全文転載はしない。
const fs = require('fs');

const FEEDS = [
  { source: 'CoinPost', url: 'https://coinpost.jp/?feed=rss2' },
  { source: 'BITTIMES', url: 'https://bittimes.net/feed' },
  { source: 'CRYPTO TIMES', url: 'https://crypto-times.jp/feed/' },
];

const PER_FEED = 12; // 各社から取得する最大件数（フィルター前）
const MAX_TOTAL = 30; // 最終的に表示する最大件数

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// 暗号資産に関係すると判定するキーワード（見出しに含まれていれば対象）
const KEYWORDS = [
  '暗号資産', '仮想通貨', 'ビットコイン', 'イーサリアム', 'ブロックチェーン',
  'BTC', 'ETH', 'XRP', 'リップル', 'ソラナ', 'SOL', 'ドージ', 'DOGE',
  'ステーブルコイン', 'USDT', 'USDC', 'テザー', 'アルトコイン', 'トークン',
  'DeFi', 'NFT', 'Web3', 'メタバース', 'マイニング', 'ウォレット',
  '取引所', 'ETF', 'SEC', '金融庁', '規制', 'オンチェーン', 'L2', 'レイヤー2',
  'ステーキング', 'エアドロップ', 'DAO', 'スマートコントラクト', 'コイン',
  'バイナンス', 'Binance', 'Coinbase', 'crypto', 'Crypto', 'blockchain', 'bitcoin', 'Bitcoin',
];

function isCrypto(title) {
  if (!title) return false;
  return KEYWORDS.some((kw) => title.includes(kw));
}

function decode(s) {
  if (!s) return '';
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .trim();
}

function pick(block, tag) {
  const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'));
  return m ? m[1] : '';
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      redirect: 'follow',
    });
    if (!res.ok) {
      console.error('HTTP ' + res.status + ' for ' + feed.source);
      return [];
    }
    const xml = await res.text();
    const items = xml.split(/<item[ >]/i).slice(1).slice(0, PER_FEED);
    return items.map((raw) => {
      const block = '<item ' + raw;
      const title = decode(pick(block, 'title'));
      let link = decode(pick(block, 'link'));
      if (!link) {
        const m = block.match(/<link[^>]*href="([^"]+)"/i);
        if (m) link = m[1];
      }
      const pubDate = decode(pick(block, 'pubDate')) || decode(pick(block, 'dc:date'));
      return { title, link, pubDate, source: feed.source };
    }).filter((x) => x.title && x.link && isCrypto(x.title));
  } catch (e) {
    console.error('Failed:', feed.source, e.message);
    return [];
  }
}

(async () => {
  let all = [];
  for (const feed of FEEDS) {
    const items = await fetchFeed(feed);
    console.log(feed.source + ': ' + items.length + ' crypto items');
    all = all.concat(items);
  }
  all.sort((a, b) => {
    const ta = Date.parse(a.pubDate) || 0;
    const tb = Date.parse(b.pubDate) || 0;
    return tb - ta;
  });
  all = all.slice(0, MAX_TOTAL);
  const out = {
    updatedAt: new Date().toISOString(),
    count: all.length,
    items: all,
  };
  fs.writeFileSync('news.json', JSON.stringify(out, null, 2));
  console.log('Wrote news.json with ' + all.length + ' items');
})();
