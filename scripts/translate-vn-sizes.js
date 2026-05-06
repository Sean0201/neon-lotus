#!/usr/bin/env node
/**
 * translate-vn-sizes.js
 * --------------------------------------------------------------------
 * 從產品頁面 URL 抓取越南文尺寸表，翻譯成中文並寫入 data.js。
 *
 * 用法:
 *   node scripts/translate-vn-sizes.js                # 跑全部 (依 product_url)
 *   node scripts/translate-vn-sizes.js --map url-map.json
 *   node scripts/translate-vn-sizes.js --product blish-001 --url https://...
 *   node scripts/translate-vn-sizes.js --dry-run     # 只列印不寫檔
 *
 * 來源 URL 取得順序:
 *   1) CLI 旗標 --url 搭配 --product
 *   2) --map 指定的 JSON 檔，格式 { "<product_id>": "<url>", ... }
 *   3) data.js 內每個 product 的 product_url 欄位 (若存在)
 *
 * 輸出:
 *   每個有抓到尺寸的 product 會新增/覆寫 size_chart 欄位:
 *     {
 *       image_url: "https://...jpg" | null,
 *       source_url: "https://...",
 *       headers: ["尺碼", "胸圍", "衣長", "肩寬", "袖長"],
 *       rows: [
 *         { size: "S", values: { "胸圍": "98", "衣長": "68", ... } },
 *         ...
 *       ],
 *       raw_vn: "<原始越南文文字，方便人工校對>"
 *     }
 *
 * --------------------------------------------------------------------
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const DATA_FILE  = path.join(ROOT, 'data.js');

// ─────────────────────────────────────────────────────────────────
// 1. 越南文 ↔ 中文 對照詞庫 (尺寸相關)
//   - 已小寫並去除常見聲調符號，比對時兩邊都正規化
// ─────────────────────────────────────────────────────────────────
const VN_TO_ZH = {
  // 標題類
  'bang size'                : '尺碼表',
  'kich thuoc'               : '尺寸',
  'huong dan chon size'      : '選尺指南',
  'size chart'               : '尺碼表',
  'thong so'                 : '規格',

  // 部位
  'kich thuoc nguc'          : '胸圍',
  'vong nguc'                : '胸圍',
  'nguc'                     : '胸圍',
  'ngang nguc'               : '胸寬',
  'ngang vai'                : '肩寬',
  'ngang'                    : '胸寬',
  'chest'                    : '胸圍',
  'bust'                     : '胸圍',

  'vong eo'                  : '腰圍',
  'eo'                       : '腰圍',
  'waist'                    : '腰圍',

  'vong mong'                : '臀圍',
  'mong'                     : '臀圍',
  'hip'                      : '臀圍',

  'vai'                      : '肩寬',
  'rong vai'                 : '肩寬',
  'shoulder'                 : '肩寬',

  'tay'                      : '袖長',
  'tay ao'                   : '袖長',
  'dai tay'                  : '袖長',
  'sleeve'                   : '袖長',

  'dai'                      : '衣長',
  'dai ao'                   : '衣長',
  'chieu dai'                : '長度',
  'length'                   : '衣長',
  'dai truoc'                : '前衣長',
  'dai sau'                  : '後衣長',
  'dai vat truoc'            : '前衣長',
  'dai vat sau'              : '後衣長',
  'vat truoc'                : '前襬',
  'vat sau'                  : '後襬',
  'vat'                      : '衣襬',

  'dai quan'                 : '褲長',
  'ong quan'                 : '褲口',
  'ong'                      : '褲口',
  'duoi ron'                 : '低腰',
  'duoi'                     : '下',
  'tren'                     : '上',
  'ron'                      : '臍',
  'fit'                      : '適合',
  'fit eo'                   : '適合腰圍',
  'fits waist'               : '適合腰圍',
  'gom'                      : '共',
  'gom 2 size'               : '共2尺碼',
  'mau'                      : '顏色',
  'chat lieu'                : '材質',
  'mo ta'                    : '描述',
  'phom'                     : '版型',
  'rong'                     : '寬鬆',
  'om'                       : '合身',
  'lung thap'                : '低腰',
  'lung cao'                 : '高腰',
  'v1'                       : '胸圍',
  'v2'                       : '腰圍',
  'v3'                       : '臀圍',
  'dui'                      : '大腿圍',
  'thigh'                    : '大腿圍',
  'rise'                     : '股上',
  'day'                      : '褲底',
  'day quan'                 : '褲底',
  'cap'                      : '腰頭',
  'cao'                      : '身高',
  'can nang'                 : '體重',
  'height'                   : '身高',
  'weight'                   : '體重',

  // 尺碼欄位字
  'size'                     : '尺碼',
  'co'                       : '尺碼',

  // 單位 / 通用
  'cm'                       : 'cm',
  'kg'                       : 'kg',
  'inch'                     : '英吋',
};

// 把同一中文意義的多個越南詞合併，建立排序好的查詢表 (長字優先比對)
const VN_KEYS_SORTED = Object.keys(VN_TO_ZH).sort((a, b) => b.length - a.length);

/** 將文字標準化: 小寫 + 去聲調 + 去多餘空白 */
function normalize(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // 去除聲調
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 把一段越南文字翻成中文 (詞典代換 + 數字保留) */
function translate(textVn) {
  if (!textVn) return '';
  const norm = normalize(textVn);
  if (!norm) return textVn;

  // 數字 + 單位優先抽出 (例如 "98cm", "68 cm", "5'7\"")
  // 非純文字欄 (純數字) 直接回傳
  if (/^\s*\d[\d\s.,/-]*\s*(cm|kg|inch|in|"|\')?\s*$/i.test(textVn)) {
    return textVn.trim();
  }

  let out = norm;
  for (const key of VN_KEYS_SORTED) {
    if (out.includes(key)) {
      // 用全字界比對 (確保 "vai" 不會誤切 "vain")
      const re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      out = out.replace(re, VN_TO_ZH[key]);
    }
  }
  // 殘餘的英文/越南文如果還在，就保留原始字串以利人工校對
  if (/[a-z]/.test(out)) {
    return textVn.trim();
  }
  return out.trim();
}

// ─────────────────────────────────────────────────────────────────
// 2. HTML 解析: 找出尺寸表 (table) 與尺寸圖
//   - 不引入額外 npm 套件，僅用 regex/字串比對
// ─────────────────────────────────────────────────────────────────

/** 從 HTML 取出所有 <table>...</table> 區段 */
function extractTables(html) {
  const out = [];
  const re = /<table[\s\S]*?<\/table>/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[0]);
  return out;
}

/** 把單一 <table> 拆成 rows -> cells (純文字) */
function parseTable(tableHtml) {
  const rows = [];
  const trRe = /<tr[\s\S]*?<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRe.exec(tableHtml))) {
    const tr = trMatch[0];
    const cells = [];
    const cellRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let cm;
    while ((cm = cellRe.exec(tr))) {
      const txt = cm[1]
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(txt);
    }
    if (cells.length) rows.push(cells);
  }
  return rows;
}

/** 在 HTML 內尋找尺寸表圖片 (檔名含 size 或 alt 含 size/kich thuoc/bang size) */
function findSizeImage(html) {
  const imgs = [];
  const re = /<img[^>]+>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const srcM = tag.match(/\bsrc=["']([^"']+)["']/i);
    const altM = tag.match(/\balt=["']([^"']+)["']/i);
    const src = srcM ? srcM[1] : '';
    const alt = altM ? altM[1] : '';
    if (!src) continue;
    const blob = (src + ' ' + alt).toLowerCase();
    if (blob.includes('size') || blob.includes('kich thuoc') ||
        blob.includes('bang-size') || blob.includes('bangsize')) {
      imgs.push(src);
    }
  }
  return imgs[0] || null;
}

/** 判斷一張表是不是「尺寸表」: 任何 cell 命中尺寸關鍵字即算 */
const SIZE_HINT_KEYWORDS = [
  'size','kich thuoc','bang size','nguc','vai','dai','eo','mong','tay','co','rong','chieu',
  'chest','waist','hip','shoulder','sleeve','length',
];
function looksLikeSizeTable(rows) {
  const flat = rows.flat().map(normalize).join(' ');
  return SIZE_HINT_KEYWORDS.some(k => flat.includes(k));
}

/** 把整段尺寸表 rows 翻譯成中文，輸出 {headers, rows} 結構 */
function buildSizeChart(rows) {
  if (!rows.length) return null;
  // 假設第一列是表頭
  const headers = rows[0].map(translate);
  const dataRows = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    if (!cells.length) continue;
    const sizeLabel = cells[0] || '';
    const values = {};
    for (let j = 1; j < cells.length; j++) {
      const headerKey = headers[j] || `欄${j}`;
      values[headerKey] = cells[j];
    }
    dataRows.push({ size: sizeLabel, values });
  }
  return { headers, rows: dataRows };
}

// ─────────────────────────────────────────────────────────────────
// 3. 讀寫 data.js
// ─────────────────────────────────────────────────────────────────
function loadData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const m = raw.match(/^window\.BRANDS_DATA\s*=\s*([\s\S]+?);?\s*$/);
  if (!m) throw new Error('data.js 格式不符 (缺少 window.BRANDS_DATA = ...)');
  return JSON.parse(m[1]);
}

function saveData(data) {
  const out = 'window.BRANDS_DATA = ' + JSON.stringify(data) + ';';
  fs.writeFileSync(DATA_FILE, out, 'utf-8');
  const mb = (Buffer.byteLength(out) / 1024 / 1024).toFixed(2);
  console.log(`✔ data.js 已更新 (${mb} MB)`);
}

// ─────────────────────────────────────────────────────────────────
// 4. 抓網頁
// ─────────────────────────────────────────────────────────────────
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SizeChartBot/1.0)',
      'Accept-Language': 'vi,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.text();
}

// ─────────────────────────────────────────────────────────────────
// 5. 主流程
// ─────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { dryRun: false, only: null, url: null, mapFile: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--product') out.only = argv[++i];
    else if (a === '--url')     out.url  = argv[++i];
    else if (a === '--map')     out.mapFile = argv[++i];
  }
  return out;
}

async function processOne(productUrl) {
  const html = await fetchHtml(productUrl);
  const tables = extractTables(html);
  let chart = null;
  for (const t of tables) {
    const rows = parseTable(t);
    if (looksLikeSizeTable(rows)) {
      chart = buildSizeChart(rows);
      // 也保留原始越南文字串方便人工校對
      chart.raw_vn = rows.map(r => r.join(' | ')).join('\n');
      break;
    }
  }
  const image = findSizeImage(html);
  if (!chart && !image) return null;
  return {
    image_url: image,
    source_url: productUrl,
    headers: chart ? chart.headers : [],
    rows: chart ? chart.rows : [],
    raw_vn: chart ? chart.raw_vn : '',
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const data = loadData();

  // 收集要處理的 (product_id, url)
  const targets = [];
  if (args.only && args.url) {
    targets.push([args.only, args.url]);
  } else {
    let urlMap = {};
    if (args.mapFile) {
      urlMap = JSON.parse(fs.readFileSync(path.resolve(args.mapFile), 'utf-8'));
    }
    for (const p of data.products) {
      const url = urlMap[p.id] || p.product_url;
      if (!url) continue;
      if (args.only && p.id !== args.only) continue;
      targets.push([p.id, url]);
    }
  }

  if (!targets.length) {
    console.error('沒有可處理的目標。請在 product 上加 product_url，或使用 --map / --product+--url。');
    process.exit(1);
  }
  console.log(`即將抓取 ${targets.length} 筆商品...`);

  let okCount = 0, failCount = 0;
  const idToProduct = new Map(data.products.map(p => [p.id, p]));

  for (const [pid, url] of targets) {
    try {
      process.stdout.write(`  ${pid}  ←  ${url}  ... `);
      const sc = await processOne(url);
      if (!sc) { console.log('找不到尺寸資料'); failCount++; continue; }
      const product = idToProduct.get(pid);
      if (!product) { console.log('product_id 不存在'); failCount++; continue; }
      product.size_chart = sc;
      console.log(`OK (${sc.rows.length} 列${sc.image_url ? ' + 圖' : ''})`);
      okCount++;
    } catch (err) {
      console.log(`失敗: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n完成: 成功 ${okCount} / 失敗 ${failCount}`);
  if (args.dryRun) {
    console.log('--dry-run 模式: 不寫入 data.js');
  } else if (okCount > 0) {
    saveData(data);
  }
}

// 也輸出翻譯函式供其他工具引用
export { translate, VN_TO_ZH, parseTable, buildSizeChart, extractTables, findSizeImage, looksLikeSizeTable };

// 只有「直接執行」此檔時才跑 main()，被當模組 import 時不會自動執行
const isDirect = (() => {
  try { return import.meta.url === `file://${process.argv[1]}`; }
  catch { return false; }
})();
if (isDirect) {
  main().catch(err => { console.error('Fatal:', err); process.exit(1); });
}
