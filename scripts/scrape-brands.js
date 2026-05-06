#!/usr/bin/env node
/**
 * scrape-brands.js
 * --------------------------------------------------------------------
 * 從越南獨立品牌官網把產品 (含越南文尺寸) 抓回來，翻譯成中文後
 * upsert 進 data.js (window.BRANDS_DATA).
 *
 * 目前支援的平台:
 *   - haravan : *.vn / *.com 用 Haravan 的店 (cdn.hstatic.net)
 *               端點: /collections/<handle>/products.json?page=N
 *               (Shopify-相容 JSON)
 *   - shopify : 真正的 Shopify (cdn.shopify.com), 端點同上
 *   - woocommerce : WordPress + WooCommerce (尚未實作, 留 stub)
 *
 * 設定: scripts/brands-config.json (本檔自動建立預設值)
 *
 * 用法:
 *   node scripts/scrape-brands.js                 # 跑 config 內所有 enabled 品牌
 *   node scripts/scrape-brands.js --only 23sptmbr # 只跑單一品牌
 *   node scripts/scrape-brands.js --dry-run       # 不寫檔
 *   node scripts/scrape-brands.js --limit 5       # 每個品牌只抓前 5 件 (測試)
 *
 * 抓回的欄位 (對應 data.js 的 product schema):
 *   id, brand_id, name, tag, category, price.vnd, sizes[], images, size_chart
 *
 * --------------------------------------------------------------------
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translate } from './translate-vn-sizes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const DATA_FILE  = path.join(ROOT, 'data.js');
const CONFIG     = path.join(__dirname, 'brands-config.json');

// ─────────────────────────────────────────────────────────────────
// 0. 預設設定 (第一次執行時會自動寫出 brands-config.json)
// ─────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  brands: [
    {
      id: '23sptmbr',
      name: "23'SPTMBR",
      style: 'Vietnamese Streetwear',
      color_hex: '#0a0a0f',
      meta: { website: 'https://23sptmbr.vn', location: 'Vietnam' },
      platform: 'haravan',
      collection_url: 'https://23sptmbr.vn/collections/all',
      enabled: true
    },
    {
      id: 'aastu',
      name: 'AASTU',
      style: 'Vietnamese Streetwear',
      color_hex: '#1a1a2e',
      meta: { website: 'https://aastu.vn', location: 'Vietnam' },
      platform: 'haravan',
      collection_url: 'https://aastu.vn/collections/all-products',
      enabled: true
    },
    {
      id: 'aesir',
      name: 'AESIR STUDIOS',
      style: 'Streetwear',
      color_hex: '#15151f',
      meta: { website: 'https://aesir-studios.com', location: 'Vietnam' },
      platform: 'woocommerce',
      collection_url: 'https://aesir-studios.com/product-category/men/',
      enabled: false   // Woo 模組尚未完成
    }
  ]
};

function loadConfig() {
  if (!fs.existsSync(CONFIG)) {
    fs.writeFileSync(CONFIG, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    console.log('✔ 已建立預設設定: ' + path.relative(ROOT, CONFIG));
  }
  return JSON.parse(fs.readFileSync(CONFIG, 'utf-8'));
}

// ─────────────────────────────────────────────────────────────────
// 1. data.js 讀寫
// ─────────────────────────────────────────────────────────────────
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { brands: [], products: [] };
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const m = raw.match(/^window\.BRANDS_DATA\s*=\s*([\s\S]+?);?\s*$/);
  if (!m) throw new Error('data.js 格式錯誤');
  return JSON.parse(m[1]);
}

function saveData(data) {
  const out = 'window.BRANDS_DATA = ' + JSON.stringify(data) + ';';
  fs.writeFileSync(DATA_FILE, out, 'utf-8');
  const mb = (Buffer.byteLength(out) / 1024 / 1024).toFixed(2);
  console.log(`✔ data.js 已更新 (${mb} MB)`);
}

// ─────────────────────────────────────────────────────────────────
// 2. HTTP fetch (Node 18+ 內建)
// ─────────────────────────────────────────────────────────────────
async function getJson(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NeonLotusBot/1.0)',
      'Accept': 'application/json,*/*;q=0.8',
      'Accept-Language': 'vi,en;q=0.8'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('json')) {
    const t = await res.text();
    try { return JSON.parse(t); }
    catch { throw new Error(`Non-JSON for ${url}: ${t.slice(0, 120)}`); }
  }
  return await res.json();
}

async function getText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NeonLotusBot/1.0)',
      'Accept-Language': 'vi,en;q=0.8'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

// ─────────────────────────────────────────────────────────────────
// 3. Haravan / Shopify-相容: /collections/{handle}/products.json
// ─────────────────────────────────────────────────────────────────
function collectionHandleFromUrl(url) {
  // https://shop.com/collections/all -> "all"
  // https://shop.com/collections/all-products -> "all-products"
  const m = url.match(/\/collections\/([^\/?#]+)/);
  if (!m) throw new Error('無法解析 collection handle: ' + url);
  return m[1];
}

async function fetchHaravanProducts(brandCfg, opts = {}) {
  const { limit = Infinity, perPage = 50, deepImages = true } = opts;
  const handle = collectionHandleFromUrl(brandCfg.collection_url);
  const origin = new URL(brandCfg.collection_url).origin;
  const all = [];
  let page = 1;
  while (all.length < limit) {
    const url = `${origin}/collections/${handle}/products.json?page=${page}&limit=${perPage}`;
    process.stdout.write(`  page ${page} ... `);
    let data;
    try { data = await getJson(url); }
    catch (e) { console.log('失敗 ' + e.message); break; }
    const list = data.products || [];
    console.log(`${list.length} 件`);
    if (!list.length) break;
    all.push(...list);
    if (list.length < perPage) break;
    page++;
    if (page > 60) break; // 安全閥
  }
  const sliced = all.slice(0, limit);

  // 深度抓圖: 用 /products/<handle>.json 拿單品完整資料 (gallery 通常會比批次多)
  if (deepImages) {
    console.log(`  深度抓圖: 共 ${sliced.length} 件 ...`);
    let deepFail = 0;
    for (let i = 0; i < sliced.length; i++) {
      const h = sliced[i].handle;
      if (!h) continue;
      try {
        const detail = await getJson(`${origin}/products/${h}.json`);
        const dp = detail.product;
        if (dp && Array.isArray(dp.images) && dp.images.length > (sliced[i].images || []).length) {
          sliced[i].images = dp.images;
        }
      } catch (e) {
        deepFail++;
      }
      if ((i + 1) % 25 === 0) process.stdout.write(`    ${i+1}/${sliced.length}\r`);
    }
    console.log(`  深度抓圖完成 (失敗 ${deepFail} 件)`);
  }

  return sliced;
}

// ─────────────────────────────────────────────────────────────────
// 4. body_html 內的「越南文尺寸文字」解析
//   範例:
//     "-Size S: Eo: 76cm - Đáy: 48cm -Đùi 36cm - Dài quần: 64cm"
//     "Size M: Ngực 102 - Vai 45 - Dài 70"
// ─────────────────────────────────────────────────────────────────
function stripHtml(html) {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+/g, ' ');
}

function parseSizeChartFromText(text) {
  if (!text) return null;
  // 抓出 "Size XXX:" 開頭到下一個 "Size XXX:" 為止
  // 先強制在每個 "Size <label>:" 前面斷行 (越南文段落常常被擠在同一行)
  const normalized = text
    .replace(/[ \t]*-?\s*(Size\s+[A-Z0-9XL/]+\s*[:：])/gi, '\n$1')
    .replace(/&nbsp;/gi, ' ');
  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);
  const sizeRe = /^[-•·\s]*Size\s+([A-Z0-9XL/]+)\s*[:：]?\s*(.*)$/i;
  const rows = [];
  const headerSet = new Set();
  for (const ln of lines) {
    const m = ln.match(sizeRe);
    if (!m) continue;
    const sizeLabel = m[1].toUpperCase();
    const rest = m[2];
    // rest 內以 "-" 或 "," 切成段
    const segments = rest.split(/\s*[-–,;]\s*/).map(s => s.trim()).filter(Boolean);
    const values = {};
    for (const seg of segments) {
      // "Eo: 76cm"  /  "Đùi 36cm"  /  "Vai 43"
      const sm = seg.match(/^([A-Za-zÀ-ỹĐđ\s]+?)\s*[:：]?\s*(\d+(?:[.,]\d+)?)\s*(cm|kg)?\s*$/);
      if (!sm) continue;
      const labelVn = sm[1].trim();
      const num     = sm[2];
      const unit    = (sm[3] || 'cm').toLowerCase();
      const labelZh = translate(labelVn) || labelVn;
      headerSet.add(labelZh);
      values[labelZh] = `${num}${unit === 'cm' ? '' : ' ' + unit}`;
    }
    if (Object.keys(values).length) rows.push({ size: sizeLabel, values });
  }
  if (!rows.length) return null;
  return {
    headers: Array.from(headerSet),
    rows,
    source: 'body_html'
  };
}

// 嘗試從產品圖片裡找尺寸示意圖 (檔名/alt 含 size)
function findSizeImageFromProduct(p) {
  const imgs = (p.images || []).map(i => ({ src: i.src, alt: i.alt || '' }));
  const hit = imgs.find(i => /(size|kich.?thuoc|bang.?size|sizing|size.?chart|sizeguide|size.?guide)/i.test(i.src + ' ' + i.alt));
  return hit ? hit.src : null;
}

// 從 body_html 內的 <img> 找尺寸圖
function findSizeImageFromBodyHtml(html) {
  if (!html) return null;
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const src = m[1];
    const alt = m[2] || '';
    if (/(size|kich.?thuoc|bang.?size)/i.test(src + ' ' + alt)) return src;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// 5. 把 Haravan 商品物件 -> data.js product 物件
// ─────────────────────────────────────────────────────────────────
function toLocalProduct(brandCfg, raw) {
  const id = `${brandCfg.id}-${raw.handle}`;
  const variants = raw.variants || [];
  // sizes: 取 option1 (Haravan/Shopify 慣例: 第一個 option 通常是 size)
  const sizeSet = new Map(); // label -> available
  for (const v of variants) {
    const label = (v.option1 || v.title || '').trim();
    if (!label || label.toLowerCase() === 'default title') continue;
    const avail = v.available !== false && (v.inventory_quantity == null || v.inventory_quantity > 0);
    if (!sizeSet.has(label)) sizeSet.set(label, avail);
    else if (avail) sizeSet.set(label, true);
  }
  const sizes = Array.from(sizeSet.entries()).map(([label, available]) => ({ label, available }));

  // price.vnd: 取最低價的 variant
  let priceVnd = null;
  for (const v of variants) {
    const n = parseFloat(String(v.price).replace(/[^\d.]/g, ''));
    if (!isFinite(n) || n <= 0) continue;
    if (priceVnd == null || n < priceVnd) priceVnd = n;
  }

  // images
  const imgs = (raw.images || []).map((i, idx) => ({
    type: idx === 0 ? 'source' : 'detail',
    url: i.src,
    original_url: i.src
  }));
  const cover = imgs[0]?.url || '';

  // size_chart (text 優先, 沒有就嘗試圖片)
  const cleanText = stripHtml(raw.body_html);
  const textChart = parseSizeChartFromText(cleanText);
  const imgFromBody = findSizeImageFromBodyHtml(raw.body_html);
  const imgFromGallery = findSizeImageFromProduct(raw);
  const sizeChartImg = imgFromBody || imgFromGallery;
  const sizeChart = (textChart || sizeChartImg) ? {
    image_url: sizeChartImg,
    source_url: `${new URL(brandCfg.collection_url).origin}/products/${raw.handle}`,
    headers: textChart?.headers || [],
    rows: textChart?.rows || [],
    raw_vn: textChart ? cleanText.slice(0, 600) : ''
  } : null;

  const product = {
    id,
    brand_id: brandCfg.id,
    name: raw.title,
    tag: raw.product_type || (raw.tags ? String(raw.tags).split(',')[0].trim() : ''),
    category: (raw.product_type || '').toUpperCase() || 'OTHER',
    price: priceVnd != null ? { vnd: priceVnd } : {},
    sizes,
    images: { cover, gallery: imgs },
    sold_out: !raw.available,
    needs_review: false,
    original_cover_url: cover,
    product_url: `${new URL(brandCfg.collection_url).origin}/products/${raw.handle}`,
  };
  if (sizeChart) product.size_chart = sizeChart;
  return product;
}

function toLocalBrand(brandCfg) {
  return {
    id: brandCfg.id,
    name: brandCfg.name,
    style: brandCfg.style || '',
    color_hex: brandCfg.color_hex || '#0a0a0f',
    description: brandCfg.description || { en: '', th: '', zh: '' },
    meta: brandCfg.meta || {}
  };
}

// ─────────────────────────────────────────────────────────────────
// 6. Upsert 進 data.js (依 brand_id 取代該品牌的全部商品)
// ─────────────────────────────────────────────────────────────────
function upsertBrand(data, brand, products) {
  const bIdx = data.brands.findIndex(b => b.id === brand.id);
  if (bIdx >= 0) data.brands[bIdx] = { ...data.brands[bIdx], ...brand };
  else data.brands.push(brand);

  // 移除該品牌舊商品
  data.products = data.products.filter(p => p.brand_id !== brand.id);
  // 加新商品
  data.products.push(...products);
}

// ─────────────────────────────────────────────────────────────────
// 7. WooCommerce stub (尚未實作)
// ─────────────────────────────────────────────────────────────────
async function fetchWooProducts(brandCfg, opts = {}) {
  console.log('  (WooCommerce 模組尚未完成, 跳過)');
  return [];
}

// ─────────────────────────────────────────────────────────────────
// 8. CLI
// ─────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = { only: null, dryRun: false, limit: Infinity };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--only')    o.only = argv[++i];
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--limit')   o.limit = parseInt(argv[++i], 10) || Infinity;
  }
  return o;
}

async function main() {
  const args   = parseArgs(process.argv);
  const config = loadConfig();
  const data   = loadData();

  const targets = config.brands.filter(b => {
    if (args.only) return b.id === args.only;
    return b.enabled !== false;
  });
  if (!targets.length) {
    console.error('沒有要抓的品牌 (檢查 brands-config.json 的 enabled / --only)');
    process.exit(1);
  }

  for (const brandCfg of targets) {
    console.log(`\n━━ ${brandCfg.id} (${brandCfg.platform}) ${brandCfg.collection_url}`);
    let raws = [];
    try {
      if (brandCfg.platform === 'haravan' || brandCfg.platform === 'shopify') {
        raws = await fetchHaravanProducts(brandCfg, { limit: args.limit });
      } else if (brandCfg.platform === 'woocommerce') {
        raws = await fetchWooProducts(brandCfg, { limit: args.limit });
      } else {
        console.warn('  未知 platform: ' + brandCfg.platform); continue;
      }
    } catch (e) { console.error('  抓取失敗:', e.message); continue; }

    if (!raws.length) { console.log('  無商品'); continue; }
    console.log(`  共 ${raws.length} 件，轉換中...`);
    const products = raws.map(r => toLocalProduct(brandCfg, r));
    const withChart = products.filter(p => p.size_chart).length;
    console.log(`  尺寸表命中: ${withChart} / ${products.length}`);

    upsertBrand(data, toLocalBrand(brandCfg), products);
  }

  if (args.dryRun) {
    console.log('\n--dry-run 模式: 不寫入 data.js');
  } else {
    saveData(data);
  }
  console.log('完成。');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
