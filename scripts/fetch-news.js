// scripts/fetch-news.js
// 各メディアの公式RSSを取得し、暗号資産に関係する記事のみをnews.jsonにまとめる。
// 著作権配慮: 見出しと元記事へのリンクのみを扱い、本文の全文転載はしない。
const fs = require('fs');

const FEEDS = [
  { source: 'CoinPost', url: 'https://coinpost.jp/?feed=rss2' },
  { source: 'BITTIMES', url: 'https://bittimes.net/feed' },
  { source: 'CRYPTO TIMES', url: 'https://crypto-times.jp/feed/' },
  { source: 'CoinTelegraph', url: 'https://cointelegraph.com/rss' },];

const PER_FEED = 12;
const MAX_TOTAL = 40;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const KEYWORDS = [
  '暗号資産','仮想通貨','ビットコイン','イーサリアム','ブロックチェーン','BTC','ETH','XRP','リップル',
  'ソラナ','SOL','ドージ','DOGE','ステーブルコイン','USDT','USDC','テザー','アルトコイン','トークン',
  'DeFi','NFT','Web3','メタバース','マイニング','ウォレット','取引所','ETF','SEC','金融庁','規制',
  'オンチェーン','L2','レイヤー2','ステーキング','エアドロップ','DAO','スマートコントラクト','コイン',
  'バイナンス','Binance','Coinbase','crypto','Crypto','blockchain','Blockchain','bitcoin','Bitcoin',
  'Ethereum','ethereum','stablecoin','altcoin','token','wallet','mining','DeFi','Web3'
];

function isCrypto(title) {
  return KEYWORDS.some(function (k) { return title.indexOf(k) !== -1; });
}

function decode(s) {
  return s
    .replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .trim();
}

function pick(block, tag) {
  const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'));
  return m ? decode(m[1]) : '';
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
    });
    if (!res.ok) {
      console.log('HTTP ' + res.status + ' for ' + feed.source);
      return [];
    }
    const xml = await res.text();
    const items = xml.split(/<item[ >]/i).slice(1).slice(0, PER_FEED);
    return items.map(function (block) {
      return {
        title: pick(block, 'title'),
        link: pick(block, 'link'),
        pubDate: pick(block, 'pubDate'),
        source: feed.source,
      };
    }).filter(function (it) { return it.title && it.link && isCrypto(it.title); });
  } catch (e) {
    console.log('ERROR for ' + feed.source + ': ' + e.message);
    return [];
  }
}

(async function () {
  let all = [];
  for (const feed of FEEDS) {
    const items = await fetchFeed(feed);
    console.log(feed.source + ': ' + items.length + ' items');
    all = all.concat(items);
  }
  all.sort(function (a, b) {
    return (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0);
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
