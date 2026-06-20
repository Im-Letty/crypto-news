// scripts/fetch-news.js
// 各メディアの公式RSSを取得し、暗号資産に関係する記事の中から
// 注目度の高そうなものを上位3件選んでnews.jsonにまとめる。
// 著作権配慮: 見出しと元記事へのリンクのみを扱い、本文の全文転載はしない。
const fs = require('fs');

const FEEDS = [
  { source: 'CoinPost', url: 'https://coinpost.jp/?feed=rss2' },
  { source: 'BITTIMES', url: 'https://bittimes.net/feed' },
  { source: 'CRYPTO TIMES', url: 'https://crypto-times.jp/feed/' },
  { source: 'CoinTelegraph', url: 'https://cointelegraph.com/rss' },
];

const PER_FEED = 20;   // 各媒体から取る候補数（多めに集めて後で絞る）
const TOP_N = 3;       // 最終的にサイトに出す件数

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// 暗号資産に関係するかの判定キーワード
const CRYPTO_KEYWORDS = [
  '暗号資産','仮想通貨','ビットコイン','イーサリアム','ブロックチェーン','BTC','ETH','XRP','リップル',
  'ソラナ','SOL','ドージ','DOGE','ステーブルコイン','USDT','USDC','テザー','アルトコイン','トークン',
  'DeFi','NFT','Web3','メタバース','マイニング','ウォレット','取引所','ETF','SEC','金融庁','規制',
  'オンチェーン','L2','レイヤー2','ステーキング','エアドロップ','DAO','スマートコントラクト','コイン',
  'バイナンス','Binance','Coinbase','crypto','Crypto','blockchain','Blockchain','bitcoin','Bitcoin',
  'Ethereum','ethereum','stablecoin','altcoin','token','wallet','mining','XRP','Solana'
];

// 注目度スコア用の重み付けキーワード（みんなが興味を持ちそうなもの）
const HOT_KEYWORDS = [
  { words: ['ビットコイン','BTC','Bitcoin','bitcoin'], weight: 5 },
  { words: ['イーサリアム','ETH','Ethereum','ethereum'], weight: 4 },
  { words: ['XRP','リップル','Ripple'], weight: 4 },
  { words: ['ETF'], weight: 5 },
  { words: ['規制','金融庁','SEC','法律','違法','裁判','提訴'], weight: 4 },
  { words: ['最高値','史上最高','急騰','高騰','暴騰','過去最高'], weight: 5 },
  { words: ['急落','暴落','下落','クラッシュ'], weight: 4 },
  { words: ['ハッキング','ハッカー','流出','不正','詐欺'], weight: 4 },
  { words: ['半減期','アップデート','上場','承認','解禁'], weight: 3 },
  { words: ['ソラナ','SOL','Solana','ドージ','DOGE'], weight: 2 },
  { words: ['ステーブルコイン','USDT','USDC','テザー'], weight: 2 },
  { words: ['バイナンス','Binance','Coinbase','取引所'], weight: 2 },
];

function isCrypto(title) {
  return CRYPTO_KEYWORDS.some(function (k) { return title.indexOf(k) !== -1; });
}

// 注目キーワードの重み合計
function topicScore(title) {
  let s = 0;
  for (const group of HOT_KEYWORDS) {
    if (group.words.some(function (w) { return title.indexOf(w) !== -1; })) {
      s += group.weight;
    }
  }
  return s;
}

// 新しさのスコア（24時間以内=満点、古くなるほど減少、最大7日でほぼ0）
function recencyScore(pubDate) {
  const t = Date.parse(pubDate);
  if (!t) return 0;
  const hours = (Date.now() - t) / (1000 * 60 * 60);
  if (hours <= 0) return 6;
  const score = 6 - (hours / 28); // 約7日でほぼ0
  return score > 0 ? score : 0;
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
    console.log(feed.source + ': ' + items.length + ' candidates');
    all = all.concat(items);
  }

  // スコア付け（注目度 + 新しさ）
  all.forEach(function (it) {
    it.score = topicScore(it.title) + recencyScore(it.pubDate);
  });

  // スコア降順、同点なら新しい順
  all.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0);
  });

  const top = all.slice(0, TOP_N).map(function (it) {
    return { title: it.title, link: it.link, pubDate: it.pubDate, source: it.source };
  });

  const out = {
    updatedAt: new Date().toISOString(),
    count: top.length,
    items: top,
  };
  fs.writeFileSync('news.json', JSON.stringify(out, null, 2));
  console.log('Wrote news.json with ' + top.length + ' items (from ' + all.length + ' candidates)');
})();
