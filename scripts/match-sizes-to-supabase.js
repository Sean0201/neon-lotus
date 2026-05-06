#!/usr/bin/env node
/**
 * match-sizes-to-supabase.js
 * --------------------------------------------------------------------
 * 多品牌版: 把 scrape 來的 size_chart / images 透過「商品名稱」 patch 到
 * Supabase 既有商品上，輸出 multi-brand overlay。
 *
 * 設定: 一個品牌一筆對應, 預設讀 scripts/match-config.json
 *   { "pairs": [
 *       { "source": "scripts/data/sptmbr_scrape.json", "target_brand_id": "23september" },
 *       { "source": "scripts/data/aastu_scrape.json",  "target_brand_id": "aastu" }
 *   ]}
 *
 * 用法:
 *   node scripts/match-sizes-to-supabase.js
 *   node scripts/match-sizes-to-supabase.js --config <file>
 *
 * 輸出 (data-overlay.js → window.DATA_OVERLAY):
 *   {
 *     brands: [], products: [],            // 不再 push 新品牌/商品
 *     size_charts: { <product_id>: chart },              // by id (legacy)
 *     image_overlay: { <product_id>: gallery },          // by id
 *     by_name: {                                          // 按品牌分桶
 *       <brand_id>: {
 *         size_charts: { <name_base>: chart },
 *         image_overlay: { <name_base>: gallery }
 *       }, ...
 *     }
 *   }
 *
 * 為什麼 by_name 也按品牌分桶: 商品名稱 "tee" / "shirt" 在不同品牌會撞名。
 * --------------------------------------------------------------------
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translate } from './translate-vn-sizes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const DATA_FILE    = path.join(ROOT, 'data.js');
const OVERLAY_FILE = path.join(ROOT, 'data-overlay.js');
const CONFIG_FILE  = path.join(__dirname, 'match-config.json');

const DEFAULT_CONFIG = {
  pairs: [
    { source: 'scripts/data/sptmbr_scrape.json', target_brand_id: '23september' },
    { source: 'scripts/data/aastu_scrape.json',  target_brand_id: 'aastu' },
  ]
};

function parseArgs(argv) {
  const o = { config: CONFIG_FILE };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--config') o.config = argv[++i];
  }
  return o;
}

function readJsAssign(file, varName) {
  const raw = fs.readFileSync(file, 'utf-8');
  const re = new RegExp('window\\.' + varName + '\\s*=\\s*([\\s\\S]+?);?\\s*$');
  const m = raw.match(re);
  if (!m) throw new Error(`Cannot parse ${file}: ${varName} assignment not found`);
  return JSON.parse(m[1]);
}

/** 名稱標準化 → 主 base + 多個寬鬆 base (依序嘗試匹配) */
function baseKeys(name) {
  if (!name) return [];
  let s = String(name).toLowerCase();
  s = s.replace(/[\u2018\u2019\u02bc'`"]/g, '');
  s = s.replace(/^\s*23\s*/, '');                     // 23' 前綴 (僅針對 23sptmbr)
  if (s.includes('/')) s = s.split('/')[0];
  s = s.replace(/\([^)]*\)/g, ' ');
  // aastu 用 "//" 分顏色
  if (s.includes('//')) s = s.split('//')[0];
  const tokens = s.split(/[^a-z0-9]+/i).filter(Boolean);
  const ROMAN_OR_NUM = /^(i{1,3}|iv|v|vi{0,3}|ix|x|0?\d{1,2})$/;
  const trimmed = tokens.slice();
  while (trimmed.length > 1 && ROMAN_OR_NUM.test(trimmed[trimmed.length - 1])) trimmed.pop();
  const stem = (t) => t.replace(/(ed|es|s|d)$/, '');
  const stemmed = trimmed.map(stem);
  const out = new Set();
  out.add(tokens.join(''));
  out.add(trimmed.join(''));
  out.add(stemmed.join(''));
  return Array.from(out).filter(Boolean);
}

/**
 * 從商品名稱抽出「品類」(tee / hoodie / pants / jacket / dress 等)
 * 用於同品牌內「同品類 fallback」: 沒有自己的尺寸圖時抓同品類其他商品的圖
 * 同義詞會 normalise 成同一個 key (tee/tshirt/t-shirt → tee)
 * 回傳 null 代表無法判斷品類 (e.g. 配件)
 */
const CATEGORY_MAP = (() => {
  const groups = {
    tee:        ['tee','tees','tshirt','tshirts','t-shirt','tee shirt','aotee','aothun','baby tee','crop tee'],
    tank:       ['tank','tanktop','tank top','singlet','sleeveless'],
    shirt:      ['shirt','shirts','aosomi','somi','button up','button-up','flannel'],
    polo:       ['polo'],
    longsleeve: ['longsleeve','long sleeve','long-sleeve'],
    hoodie:     ['hoodie','hoodies','hooded','hood','aohoodie'],
    sweater:    ['sweater','sweatshirt','sweat','jumper','knit','cardigan','crewneck'],
    jacket:     ['jacket','jackets','blazer','coat','parka','windbreaker','outer','outerwear','varsity','bomber'],
    pants:      ['pants','pant','trouser','trousers','jean','jeans','denim','aoquan','quan'],
    shorts:     ['short','shorts'],
    legging:    ['legging','leggings','tights'],
    skirt:      ['skirt','skirts','vay'],
    dress:      ['dress','dresses','maxi','midi','onepiece','one-piece','dam'],
    bodysuit:   ['bodysuit','onesie'],
    set:        ['set','setbo','setup','combo'],
    cap:        ['cap','snapback','trucker','baseball cap'],
    beanie:     ['beanie','knit hat'],
    hat:        ['hat','bucket'],
    bag:        ['bag','tote','crossbody','sling','backpack','handbag'],
    belt:       ['belt'],
    accessory:  ['pin','pins','keychain','sticker','patch','wallet','cardholder','sock','socks','glove','scarf','glasses','sunglass','jewelry','necklace','ring','bracelet','watch']
  };
  const map = {};
  for (const [cat, syns] of Object.entries(groups)) {
    for (const s of syns) {
      map[s.toLowerCase().replace(/[^a-z0-9]/g,'')] = cat;
    }
  }
  return map;
})();

function categoryOf(name) {
  if (!name) return null;
  let s = String(name).toLowerCase();
  s = s.replace(/[\u2018\u2019\u02bc'`"]/g, '');
  s = s.replace(/^\s*23\s*/, '');
  if (s.includes('/')) s = s.split('/')[0];
  if (s.includes('//')) s = s.split('//')[0];
  s = s.replace(/\([^)]*\)/g, ' ');
  const tokens = s.split(/[^a-z0-9]+/i).map(t => t.toLowerCase()).filter(Boolean);
  // 從尾端往前找 (品類關鍵字通常在末尾)
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (i + 1 < tokens.length) {
      const two = tokens[i] + tokens[i+1];
      if (CATEGORY_MAP[two]) return CATEGORY_MAP[two];
    }
    if (CATEGORY_MAP[tokens[i]]) return CATEGORY_MAP[tokens[i]];
    const stem = tokens[i].replace(/(es|s)$/, '');
    if (CATEGORY_MAP[stem]) return CATEGORY_MAP[stem];
  }
  return null;
}

/** 配件類別 (絕對不該套尺寸圖, 即使 fallback 也不要) */
const NO_SIZE_CATEGORIES = new Set(['cap','beanie','hat','bag','belt','accessory']);

/** 防禦性: 重新翻譯一張 size_chart, 確保所有 headers/keys 都是中文 */
function ensureTranslatedChart(sc) {
  if (!sc || !Array.isArray(sc.headers)) return sc;
  const newHeaders = sc.headers.map(h => translate(h) || h);
  const headerMap = {};
  sc.headers.forEach((h, i) => headerMap[h] = newHeaders[i]);
  return {
    ...sc,
    headers: newHeaders,
    rows: (sc.rows || []).map(r => {
      const newValues = {};
      for (const [k, v] of Object.entries(r.values || {})) {
        const nk = headerMap[k] || translate(k) || k;
        newValues[nk] = v;
      }
      return { ...r, values: newValues };
    })
  };
}

function processPair(supaProducts, scrapeProducts, brandId) {
  // 從 scrape 端建立:
  //   1) chartByBase: 完全名稱比對 (主)
  //   2) chartByCategory: 品類 fallback (e.g. xx tee 沒圖時用 yy tee 的圖)
  // 兩者都按品牌分桶 (caller 已分好). 避免跨品牌污染.
  const chartByBase = {};
  const galleryByBase = {};
  const chartByCategory = {};      // { tee: chart, hoodie: chart, ... }
  const galleryByCategory = {};
  for (const p of scrapeProducts) {
    if (p.size_chart) {
      const fixed = ensureTranslatedChart(p.size_chart);
      for (const b of baseKeys(p.name)) {
        if (!chartByBase[b]) chartByBase[b] = fixed;
      }
      // 同品類 fallback: 第一個出現的當代表
      const cat = categoryOf(p.name);
      if (cat && !NO_SIZE_CATEGORIES.has(cat) && !chartByCategory[cat]) {
        chartByCategory[cat] = fixed;
      }
    }
    const g = (p.images && p.images.gallery) || [];
    if (g.length) {
      for (const b of baseKeys(p.name)) {
        if (!galleryByBase[b] || galleryByBase[b].length < g.length) galleryByBase[b] = g;
      }
      const cat = categoryOf(p.name);
      if (cat && (!galleryByCategory[cat] || galleryByCategory[cat].length < g.length)) {
        galleryByCategory[cat] = g;
      }
    }
  }

  // 統計: 對「目前 data.js 的 Supabase product 名稱」做一次模擬
  let matchedExact = 0, matchedCat = 0, unmatched = 0, imgPatched = 0;
  const unmatchedExamples = [];
  const catMatchExamples = [];
  for (const p of supaProducts) {
    let ch = null, gal = null;
    // 1) 嘗試精確名稱
    for (const b of baseKeys(p.name)) {
      if (!ch && chartByBase[b]) ch = chartByBase[b];
      if (!gal && galleryByBase[b]) gal = galleryByBase[b];
      if (ch && gal) break;
    }
    if (ch) matchedExact++;
    else {
      // 2) fallback: 同品類
      const cat = categoryOf(p.name);
      if (cat && !NO_SIZE_CATEGORIES.has(cat) && chartByCategory[cat]) {
        matchedCat++;
        if (catMatchExamples.length < 5) catMatchExamples.push(p.id + ' | ' + p.name + '  ←  [' + cat + ']');
      } else {
        unmatched++;
        if (unmatchedExamples.length < 8) unmatchedExamples.push(p.id + ' | ' + p.name);
      }
    }
    if (gal && gal.length > ((p.images||{}).gallery||[]).length) imgPatched++;
  }

  return {
    by_name: {
      size_charts:           chartByBase,
      image_overlay:         galleryByBase,
      size_charts_by_category:   chartByCategory,
      image_overlay_by_category: galleryByCategory
    },
    stats: {
      matchedExact, matchedCat, unmatched, imgPatched,
      total: supaProducts.length, unmatchedExamples, catMatchExamples,
      categoriesAvailable: Object.keys(chartByCategory)
    }
  };
}

function loadConfig(file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    console.log('✔ 建立預設 match-config.json');
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function main() {
  const args = parseArgs(process.argv);
  const cfg = loadConfig(args.config);
  const data = readJsAssign(DATA_FILE, 'BRANDS_DATA');

  // overlay 結構: 只保留 by_name (Supabase ID 不可靠) + 品牌欄位覆寫 + 公版尺寸表
  const overlay = {
    brands: [], products: [],
    by_name: {},              // { brand_id: { size_charts, image_overlay } }
    brand_overrides: cfg.brand_overrides || {},  // { brand_id: { name?, color_hex?, ... } }
    brand_defaults: cfg.brand_defaults || {}     // { brand_id: { image_url, headers, rows, ... } } 公版尺寸表
  };

  for (const pair of cfg.pairs) {
    const sourceFile = path.isAbsolute(pair.source) ? pair.source : path.join(ROOT, pair.source);
    if (!fs.existsSync(sourceFile)) {
      console.warn(`⚠ skip: source 不存在 ${sourceFile}`);
      continue;
    }
    const raw = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
    const scrapeProducts = raw.products || [];
    const supaProducts = data.products.filter(p => p.brand_id === pair.target_brand_id);

    console.log(`\n━━ ${pair.target_brand_id}`);
    console.log(`  source: ${path.relative(ROOT, sourceFile)} (${scrapeProducts.length} 件, ${scrapeProducts.filter(p => p.size_chart).length} 張表)`);
    console.log(`  Supabase: ${supaProducts.length} 件 (僅供統計; 實際 patch 在 loader 用 live data 跑 by-name)`);

    const result = processPair(supaProducts, scrapeProducts, pair.target_brand_id);
    overlay.by_name[pair.target_brand_id] = result.by_name;

    const s = result.stats;
    console.log(`  by-name maps: ${Object.keys(result.by_name.size_charts).length} 張表 / ${Object.keys(result.by_name.image_overlay).length} 套圖`);
    console.log(`  by-category maps: ${Object.keys(result.by_name.size_charts_by_category).length} 品類 [${s.categoriesAvailable.join(', ')}]`);
    console.log(`  預期命中率: ${s.matchedExact}/${s.total} 精確 + ${s.matchedCat} 同品類 fallback (剩 ${s.unmatched} 件) | 圖片補強: ${s.imgPatched}`);
    if (s.catMatchExamples.length) {
      console.log('  同品類 fallback 示例:');
      s.catMatchExamples.forEach(x => console.log('    -', x));
    }
    if (s.unmatchedExamples.length) {
      console.log('  完全未命中示例 (含配件):');
      s.unmatchedExamples.forEach(x => console.log('    -', x));
    }
  }

  fs.writeFileSync(OVERLAY_FILE,
    '/* eslint-disable */\nwindow.DATA_OVERLAY = ' + JSON.stringify(overlay) + ';',
    'utf-8'
  );
  const kb = (Buffer.byteLength(JSON.stringify(overlay))/1024).toFixed(0);
  console.log(`\n✔ 寫回 data-overlay.js (${kb} KB)`);
  console.log(`  品牌數 (by_name buckets): ${Object.keys(overlay.by_name).length}`);
  if (Object.keys(overlay.brand_overrides).length) {
    console.log(`  品牌覆寫 (brand_overrides):`);
    for (const [bid, ov] of Object.entries(overlay.brand_overrides)) {
      console.log(`    ${bid}: ${JSON.stringify(ov)}`);
    }
  }
  if (Object.keys(overlay.brand_defaults).length) {
    console.log(`  公版尺寸表 (brand_defaults):`);
    for (const [bid, ov] of Object.entries(overlay.brand_defaults)) {
      console.log(`    ${bid}: ${ov.image_url || '(no image)'}`);
    }
  }
}

main();
