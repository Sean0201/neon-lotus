/**
 * main.js — NEON LOTUS
 * ─────────────────────────────────────────────────────────────────
 *  ⚠️  IMPORTANT: must be served over HTTP — NOT opened via file://
 *     Quick start:
 *       npx serve .          (requires Node.js)
 *       python3 -m http.server 8080
 *     Then open: http://localhost:8080
 * ────────────────────────────────────────────────────────────────
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   § 0.  CONFIG & CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

/** Price formula constants — edit here to update all prices */
const RATE = 0.0014;          // 1 VND → THB

const SHIP_VND = {            // Estimated shipping per category (VND) — Thailand version
  Top:          100_000,
  Outerwear:    150_000,
  Bottom:       120_000,
  Accessories:   80_000,
  Set:          150_000,
  _default:     120_000,
};

const TIERS = [               // Price multiplier tiers — Thailand version
  { max:   500_000, mult: 1.6 },   // ≤500k VND  → x1.6
  { max: 1_300_000, mult: 1.5 },   // 500k–1.3M  → x1.5
  { max: 2_500_000, mult: 1.4 },   // 1.3M–2.5M  → x1.4
  { max: Infinity,  mult: 1.3 },   // >2.5M      → x1.3
];

/**
 * Brand-specific theme overrides.
 * accent    → replaces --accent for the entire brand page (borders, labels, active states …)
 * infoBar   → background tint for the brand info bar section
 */
const BRAND_THEME = {
  blish:            { accent: '#29b6f6', infoBar: '#040810' }, // Cyberpunk / electric blue
  hades:            { accent: '#e53935', infoBar: '#0a0404' }, // Dark Avantgarde / blood red
  stressmama:       { accent: '#ce93d8', infoBar: '#0e0812' }, // 90s retro / vivid purple
  swe:              { accent: '#26c6da', infoBar: '#060c10' }, // Casual street / sky cyan
  sly:              { accent: '#a5d6a7', infoBar: '#080e08' }, // Clean Fit / sage green
  tredx:            { accent: '#ff7043', infoBar: '#100604' }, // Workwear / rust orange
  dirtycoins:       { accent: '#ffc107', infoBar: '#100e04' }, // Y2K commercial / gold
  gamble:           { accent: '#ff1744', infoBar: '#060e0e' }, // Racing / speed red
  'cozy-worldwise': { accent: '#ba68c8', infoBar: '#0e080e' }, // Opium Avant-garde / mauve
  dirmior:          { accent: '#7e57c2', infoBar: '#0a0810' }, // Street / violet
  badrabbit:        { accent: '#f48fb1', infoBar: '#12060a' }, // Kawaii / bubble pink
  badhabits:        { accent: '#ffee58', infoBar: '#0a0a08' }, // Hip-hop graffiti / neon yellow
  badchoice:        { accent: '#b0bec5', infoBar: '#0e0e08' }, // Futurism / chrome silver
  mbi:              { accent: '#ffa726', infoBar: '#100806' }, // Vintage oversized / warm amber
  popop:            { accent: '#4db6ac', infoBar: '#061210' }, // Street / mint teal
  'uniz-world':     { accent: '#78909c', infoBar: '#0c0a10' }, // Apocalyptic / steel grey
  rich:             { accent: '#ffd54f', infoBar: '#121212' }, // Street / gold
  bwstu:            { accent: '#c6ef00', infoBar: '#0a0c04' }, // Street / lime
  devotus:          { accent: '#ff5722', infoBar: '#120804' }, // Street / deep coral
  lizardman:        { accent: '#00e676', infoBar: '#041208' }, // Street / toxic green
  spoiled:          { accent: '#f06292', infoBar: '#120610' }, // Street / hot pink
  fragile:          { accent: '#4fc3f7', infoBar: '#060c12' }, // Urban Essentials / ice blue
  levents:          { accent: '#66bb6a', infoBar: '#060e08' }, // Clean Streetwear / leaf green
  goldie:           { accent: '#ffd740', infoBar: '#12100a' }, // Cyberpunk / neon gold
  'offonoff-club':  { accent: '#ab47bc', infoBar: '#0e0812' }, // Subculture / electric purple
  aastu:            { accent: '#7c4dff', infoBar: '#080612' }, // Visual Experimental / vivid violet
  '23september':    { accent: '#ef5350', infoBar: '#120608' }, // Art / crimson
  'niyu-archive':   { accent: '#90a4ae', infoBar: '#0a0c10' }, // Archive / cool grey
  'whenever-atelier':{ accent: '#d4a574', infoBar: '#120e08' }, // Vintage Americana / warm tan
  bunnyhillconcept: { accent: '#f8bbd0', infoBar: '#120a0e' }, // Women's / blush
  'poison-fang':    { accent: '#00e676', infoBar: '#041208' }, // Ethereal / toxic green
  '2idiots-label':  { accent: '#8d6e63', infoBar: '#0e0a08' }, // Fabric Craft / earthy brown
  tryst:            { accent: '#ec407a', infoBar: '#12060c' }, // Women's / hot pink
  aesirstudio:      { accent: '#5c6bc0', infoBar: '#080812' }, // Premium / indigo
  helios:           { accent: '#ffc107', infoBar: '#100e06' }, // Silver Jewelry / amber
  'latui-atelier':  { accent: '#c9a96e', infoBar: '#0e0c0a' }, // Avant-garde / warm bronze
};

/** Category display labels — used by dynamic filter buttons */
const CAT_LABELS = {
  ALL:         { th: 'ทั้งหมด',     en: 'ALL' },
  TOPS:        { th: 'เสื้อ',        en: 'TOPS' },
  TEES:        { th: 'เสื้อยืด',      en: 'TEES' },
  LONGSLEEVES: { th: 'แขนยาว',      en: 'LONG SLEEVES' },
  SHIRTS:      { th: 'เชิ้ต',         en: 'SHIRTS' },
  POLOS:       { th: 'โปโล',         en: 'POLOS' },
  TANKS:       { th: 'แทงค์ท็อป',    en: 'TANKS' },
  SWEATERS:    { th: 'สเวตเตอร์',    en: 'SWEATERS' },
  JERSEYS:     { th: 'เจอร์ซีย์',     en: 'JERSEYS' },
  OUTERWEAR:   { th: 'เสื้อคลุม',     en: 'OUTERWEAR' },
  JACKETS:     { th: 'แจ็คเก็ต',     en: 'JACKETS' },
  HOODIES:     { th: 'ฮู้ด',          en: 'HOODIES' },
  BOTTOMS:     { th: 'กางเกง',       en: 'BOTTOMS' },
  PANTS:       { th: 'กางเกงขายาว', en: 'PANTS' },
  SHORTS:      { th: 'กางเกงขาสั้น', en: 'SHORTS' },
  SKIRTS:      { th: 'กระโปรง',     en: 'SKIRTS' },
  DRESSES:     { th: 'เดรส',         en: 'DRESSES' },
  SETS:        { th: 'เซ็ต',          en: 'SETS' },
  BAGS:        { th: 'กระเป๋า',       en: 'BAGS' },
  CAPS:        { th: 'หมวก',         en: 'CAPS' },
  ACCESSORIES: { th: 'แอคเซสซอรี่', en: 'ACCESSORIES' },
  FOOTWEAR:    { th: 'รองเท้า',      en: 'FOOTWEAR' },
  UNDERWEAR:   { th: 'ชุดชั้นใน',     en: 'UNDERWEAR' },
};
const CAT_ORDER = ['TOPS','TEES','LONGSLEEVES','SHIRTS','POLOS','TANKS','SWEATERS','JERSEYS','OUTERWEAR','JACKETS','HOODIES','BOTTOMS','PANTS','SHORTS','SKIRTS','DRESSES','SETS','BAGS','CAPS','ACCESSORIES','FOOTWEAR','UNDERWEAR'];

/* ═══════════════════════════════════════════════════════════════
   § 1.  APP STATE
   ═══════════════════════════════════════════════════════════════ */

let BRANDS      = [];       // populated by loadData()
let currentLang = 'en';     // 'en' | 'th'

/* ═══════════════════════════════════════════════════════════════
   § 2.  PRICE UTILITIES  (mirrors price_calc.js)
   ═══════════════════════════════════════════════════════════════ */

function getMultiplier(vnd) {
  for (const { max, mult } of TIERS) if (vnd <= max) return mult;
  return TIERS.at(-1).mult;
}

function roundTo50(n) { return Math.round(n / 50) * 50; }

/**
 * Psychological pricing: round to nearest 10, then force tail to 50 or 80.
 *   tail 00–49  →  xx50   (e.g. 2213 → 2210 → 2250)
 *   tail 50     →  unchanged
 *   tail 51–99  →  xx80   (e.g. 2265 → 2270 → 2280)
 */
function psychPrice(n) {
  if (n == null) return n;
  const r    = Math.round(n / 10) * 10;   // round to nearest 10
  const tail = r % 100;
  if (tail === 50) return r;              // already x50 → leave it
  if (tail <= 49)  return r - tail + 50;  // 00–49 → force to x50
  return r - tail + 80;                   // 51–99 → force to x80
}

/**
 * Recalculate THB prices for a product.
 * Useful if you edit vnd in JSON and want the page to show updated values.
 */
function calcPrice(vnd, tag) {
  const est  = SHIP_VND[tag] ?? SHIP_VND._default;
  const mult = getMultiplier(vnd);
  return {
    thb_shipping:  psychPrice((vnd + est) * mult * RATE),
    thb_carryback: psychPrice(vnd * mult * RATE),
  };
}

/* ═══════════════════════════════════════════════════════════════
   § 3.  DATA LOADING
   ═══════════════════════════════════════════════════════════════ */

async function loadData() {
  _showLoadingState();

  // ── Priority 1: window.BRANDS_DATA set by supabase-client.js (or legacy data.js) ──
  // supabase-client.js fetches data async; wait up to 15s for it.
  if (window.BRANDS_DATA) {
    _parseData(window.BRANDS_DATA);
    return;
  }

  // Poll for BRANDS_DATA (supabase-client.js loads async)
  const MAX_WAIT = 15000;   // 15 seconds
  const POLL     = 100;     // check every 100ms
  let waited     = 0;

  while (!window.BRANDS_DATA && waited < MAX_WAIT) {
    await new Promise(r => setTimeout(r, POLL));
    waited += POLL;
  }

  if (window.BRANDS_DATA) {
    _parseData(window.BRANDS_DATA);
    return;
  }

  // ── Fallback: fetch brands_products.json (legacy) ──────────
  if (location.protocol === 'file:') {
    _showFatalError(
      '⚠️ 無法載入資料',
      'Supabase 連線失敗，且本地沒有 data.js。',
      ['請確認網路連線正常，或使用本地伺服器: <code>npx serve .</code>']
    );
    return;
  }

  try {
    const res = await fetch('brands_products.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _parseData(await res.json());
  } catch (err) {
    console.error('loadData() failed:', err);
    _showFatalError(
      '⚠️ 無法載入資料',
      '無法從 Supabase 或備援來源取得資料。',
      ['請重新整理頁面，或稍後再試。']
    );
  }
}

/**
 * Fix lsoul image URLs — Magento /cache/<hash>/ thumbnails are expired,
 * stripping that prefix loads the original full-size image successfully.
 */
function _fixLsoulUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('lsoul.com/media/catalog/product/cache/')) return url;
  return url.replace(/\/cache\/[a-f0-9]+\//, '/');
}
function _fixLsoulImages(p) {
  if (p.brand_id !== 'lsoul') return;
  if (p.images?.cover) p.images.cover = _fixLsoulUrl(p.images.cover);
  if (p.original_cover_url) p.original_cover_url = _fixLsoulUrl(p.original_cover_url);
  if (Array.isArray(p.images?.gallery)) {
    p.images.gallery = p.images.gallery.map(g => ({
      ...g,
      url: _fixLsoulUrl(g.url),
      original_url: _fixLsoulUrl(g.original_url || g.url),
    }));
  }
}

/** Shared parse logic — called whether data came from data.js or fetch() */
function _parseData(data) {
  // Group products by brand_id & recalculate THB prices with current TIERS
  const byBrand = {};
  for (const p of data.products) {
    _fixLsoulImages(p);   // 修補 lsoul 過期 cache URL

    const vnd = p.price?.vnd;
    if (vnd) {
      const tag = p.tag || p.category || '_default';
      const recalc = calcPrice(vnd, tag);
      p.price.thb_shipping  = recalc.thb_shipping;
      p.price.thb_carryback = recalc.thb_carryback;
      // price_note override: e.g. "thb_carryback:750"
      var note = p.price?.note || '';
      if (note) {
        note.split(';').forEach(function(part) {
          var kv = part.trim().split(':');
          if (kv.length === 2) {
            var k = kv[0].trim(), v = parseInt(kv[1].trim());
            if (k === 'thb_carryback' && v > 0) p.price.thb_carryback = v;
            if (k === 'thb_shipping' && v > 0)  p.price.thb_shipping  = v;
          }
        });
      }
    }
    if (!byBrand[p.brand_id]) byBrand[p.brand_id] = [];
    byBrand[p.brand_id].push(p);
  }

  // Map JSON brands → internal BRANDS array
  BRANDS = data.brands.map(b => ({
    id:            b.id,
    name:          b.name,
    origin:        b.style || '',
    style:         b.style,
    color:         b.color_hex,
    logo_url:      b.logo_url || '',
    cover_url:     b.cover_url || '',
    desc_en:       b.description.en,
    desc_th:       b.description.th || b.description.en,
    meta_founded:  (b.meta && b.meta.founded) || '',
    meta_category: (b.meta && b.meta.category) || '',
    meta_location: (b.meta && b.meta.location) || '',
    products:      byBrand[b.id] || [],
  }));
}

/* ── Loading / error helpers ────────────────────────────────── */
function _showLoadingState() {
  const grid = document.getElementById('brands-grid');
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 8 }, () => `
    <div class="brand-card" style="pointer-events:none">
      <div class="skeleton-pulse" style="position:absolute;inset:0;background:rgba(255,255,255,0.04);border-radius:inherit"></div>
      <div class="brand-card-info" style="opacity:0.3">
        <div style="height:0.7rem;width:40%;background:currentColor;border-radius:4px;margin-bottom:8px"></div>
        <div style="height:1.4rem;width:65%;background:currentColor;border-radius:4px"></div>
      </div>
    </div>`).join('');
}

function _hideLoadingState() {
  // renderBrandsGrid() will overwrite the grid — nothing extra needed
}

function _showFatalError(title, subtitle, bullets = []) {
  const el = document.getElementById('brands-grid') || document.body;
  el.innerHTML = `
    <div style="
      grid-column:1/-1; padding:60px 32px; text-align:center;
      font-family:'Inter',sans-serif; color:#f5f4f0;
    ">
      <div style="font-size:2rem;margin-bottom:12px">${title}</div>
      <div style="color:#c084fc;margin-bottom:20px">${subtitle}</div>
      <ul style="list-style:none;display:inline-flex;flex-direction:column;gap:10px;text-align:left">
        ${bullets.map(b => `<li style="background:rgba(255,255,255,0.05);padding:10px 20px;border-radius:6px;border:1px solid rgba(168,85,247,0.2)">${b}</li>`).join('')}
      </ul>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   § 4.  PAGE NAVIGATION
   ═══════════════════════════════════════════════════════════════ */

function showPage(page, brandId, skipPush, restoreScrollY) {
  // 試衣間暫時關閉 (審核金流期間), 任何嘗試訪問都導回首頁
  if (page === 'tryon') { page = 'home'; brandId = null; }

  // 在進新頁面之前, 把目前頁的 scrollY 寫入「現有」history state,
  // 這樣使用者按瀏覽器返回鍵時會知道之前停在哪
  if (!skipPush) {
    const curState = history.state || {};
    history.replaceState({ ...curState, scrollY: window.scrollY }, '', location.pathname + location.hash);
  }

  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.remove('hidden');

  // 滑動策略:
  //   restoreScrollY 有值 → 從返回鍵 / 「返回首頁」按鈕回來, 還原原位置
  //   沒有值 → 新導航, 滑到頂端
  if (typeof restoreScrollY === 'number') {
    // 等下一個 frame + 50ms (確保 DOM 已 render) 再還原 scroll
    requestAnimationFrame(() => {
      setTimeout(() => window.scrollTo({ top: restoreScrollY, behavior: 'auto' }), 50);
    });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (page === 'brand' && brandId) renderBrandPage(brandId);
  if (page === 'home') setTimeout(observeFadeIns, 80);
  updateTexts();

  // ── Browser history support (back/forward buttons) ──────────
  if (!skipPush) {
    let url;
    if (page === 'policy-purchase') url = '/policy/purchase';
    else if (page === 'policy-shipping') url = '/policy/shipping';
    else if (page === 'policy-returns') url = '/policy/returns';
    else if (page === 'policy-privacy') url = '/policy/privacy';
    else if (page === 'home') url = '/';
    else url = brandId ? `#${page}/${brandId}` : `#${page}`;
    history.pushState({ page, brandId: brandId || null, scrollY: 0 }, '', url);
  }
}

// 「返回上一頁」helper — 一律用瀏覽器歷史, 才能還原 scroll 位置
function goBack(fallbackPage) {
  // 如果有上一頁就走 history.back, 沒有就 fallback (e.g. 直接打 /policy/* 進來的)
  if (window.history.length > 1 && history.state && history.state.page) {
    window.history.back();
  } else {
    showPage(fallbackPage || 'home');
  }
}
window.goBack = goBack;

// Map clean URL pathname → page id
function _routeFromPath() {
  const path = location.pathname.replace(/\/+$/, '');  // strip trailing /
  if (path === '/policy/purchase') return { page: 'policy-purchase' };
  if (path === '/policy/shipping') return { page: 'policy-shipping' };
  if (path === '/policy/returns')  return { page: 'policy-returns' };
  if (path === '/policy/privacy')  return { page: 'policy-privacy' };
  // Fall through to hash-based routing
  const hash = location.hash.replace(/^#/, '');
  if (hash) {
    const [pg, bid] = hash.split('/');
    return { page: pg || 'home', brandId: bid || null };
  }
  return { page: 'home' };
}

// ── Listen for browser back/forward buttons ───────────────────
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.page) {
    // 還原到該 state 之前儲存的 scrollY
    showPage(e.state.page, e.state.brandId || null, true, e.state.scrollY);
  } else {
    // Use pathname/hash router (handles /policy/* and #anything)
    const r = _routeFromPath();
    showPage(r.page, r.brandId || null, true);
  }
});

/* ═══════════════════════════════════════════════════════════════
   § 4.1  核心修復：顯示品牌與品項
   ═══════════════════════════════════════════════════════════════ */
async function renderBrandPage(brandId) {
  // Use internal BRANDS array (already parsed by _parseData) — no longer depends on window.BRANDS_DATA
  const brand = BRANDS.find(b => b.id === brandId);
  if (!brand) return;

  // ── Apply brand-specific colour theme ────────────────────────
  const theme  = BRAND_THEME[brandId] || {};
  const pageEl = document.getElementById('page-brand');
  pageEl.style.setProperty('--accent',        theme.accent  || '#c084fc');
  pageEl.style.setProperty('--accent2',       theme.accent  || '#a855f7');
  pageEl.style.setProperty('--brand-info-bg', theme.infoBar || '#16141e');
  pageEl.style.setProperty('--border',
    `color-mix(in srgb, ${theme.accent || '#c084fc'} 18%, transparent)`
  );

  // ── Lazy-load gallery & sizes for this brand ────────────────
  //    loadBrandDetail() patches BRANDS_DATA.products in place,
  //    so brand.products will have gallery + sizes after this call.
  if (typeof window.loadBrandDetail === 'function') {
    // Show a quick loading state in the product grid
    const grid = document.getElementById('products-grid');
    if (grid) grid.innerHTML = '<p style="text-align:center;padding:60px;color:#c084fc;font-size:1.1rem">Loading products…</p>';
    try {
      await window.loadBrandDetail(brandId);
      // Re-read brand from BRANDS since _parseData built it from BRANDS_DATA
      // but loadBrandDetail patched BRANDS_DATA.products — we need to sync
      _syncBrandProducts(brandId);
    } catch (err) {
      console.error('[renderBrandPage] loadBrandDetail failed:', err);
    }
  }

  // Store current brand products for filter use
  window.CURRENT_BRAND_PRODUCTS = brand.products || [];

  // Hero name
  const nameEl = document.getElementById('brand-hero-name');
  if (nameEl) nameEl.innerText = brand.name;

  // Hero background — use first product image
  const heroBg = document.getElementById('brand-hero-bg');
  if (heroBg) {
    const firstProd = window.CURRENT_BRAND_PRODUCTS[0];
    const srcImg = firstProd?.images?.gallery?.find(g => g.type === 'source');
    const bgUrl = (srcImg?.original_url || srcImg?.url || '')
      || _getProductImageSrc(firstProd)
      || firstProd?.original_cover_url;
    if (bgUrl) {
      heroBg.style.cssText = `background-image:url('${bgUrl}');background-size:cover;background-position:center top;`;
    } else {
      heroBg.style.cssText = `background:${brand.color || '#1a1a1a'};`;
    }
  }

  // Info bar — description + meta
  const infoBar = document.getElementById('brand-info-bar');
  if (infoBar) {
    const desc = currentLang === 'th' ? (brand.desc_th || '') : (brand.desc_en || '');
    infoBar.innerHTML = `
      <div class="brand-desc-full">${desc}</div>
      ${brand.meta_category ? `<div class="brand-meta-item"><div class="brand-meta-label">CATEGORY</div><div class="brand-meta-value">${brand.meta_category}</div></div>` : ''}
      ${brand.style          ? `<div class="brand-meta-item"><div class="brand-meta-label">STYLE</div><div class="brand-meta-value">${brand.style}</div></div>`          : ''}
      ${brand.meta_location  ? `<div class="brand-meta-item"><div class="brand-meta-label">ORIGIN</div><div class="brand-meta-value">${brand.meta_location}</div></div>` : ''}
    `;
  }

  renderFilters();
  renderProducts('ALL');
}

/**
 * Sync BRANDS_DATA.products → internal BRANDS[].products
 * after loadBrandDetail() patches gallery/sizes onto BRANDS_DATA.products.
 */
function _syncBrandProducts(brandId) {
  const data = window.BRANDS_DATA;
  if (!data) return;
  const brand = BRANDS.find(b => b.id === brandId);
  if (!brand) return;
  // Replace the brand's product array with the patched versions from BRANDS_DATA
  const patched = data.products.filter(p => p.brand_id === brandId);
  brand.products = patched;
}

/* ═══════════════════════════════════════════════════════════════
   § 5.  LANGUAGE
   ═══════════════════════════════════════════════════════════════ */

function setLang(lang) {
  currentLang = lang;
  console.log('[setLang] Switching to:', lang);

  // 1. Update all data-en / data-th text nodes
  updateTexts();

  // 2. Toggle about-strip & about-page lang-content blocks ONLY
  //    (scoped to .lang-content class — never touches brand cards)
  document.querySelectorAll('.lang-content').forEach(el => el.classList.remove('active'));
  [`about-${lang}`, `page-about-${lang}`].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  });

  // 3. Update switch button text (desktop + mobile)
  const sw = document.getElementById('lang-switch');
  if (sw) sw.textContent = lang === 'th' ? 'EN' : 'TH';
  const msw = document.getElementById('mobile-lang-switch');
  if (msw) msw.textContent = lang === 'th' ? 'EN' : 'TH';

  // 3b. Update mobile overlay nav button text
  document.querySelectorAll('#mobile-overlay .mobile-nav-btn[data-th], #mobile-overlay .mobile-nav-btn[data-en]').forEach(el => {
    const txt = el.getAttribute('data-' + lang);
    if (txt) {
      const hasChevron = el.textContent.includes('▾');
      el.textContent = txt + (hasChevron ? ' ▾' : '');
    }
  });

  // 4. Re-render brand grid (language-neutral — only uses b.name, never TH text)
  if (BRANDS.length) {
    console.log('[setLang] Re-rendering brands grid for:', lang);
    renderBrandsGrid();
    initImgLazy();
    // Re-observe fade-in elements so new cards become visible
    setTimeout(observeFadeIns, 50);
  }

  // 5. Re-render filters + product cards if a brand page is open (update labels)
  if (window.CURRENT_BRAND_PRODUCTS && window.CURRENT_BRAND_PRODUCTS.length) {
    renderFilters();
    renderProducts('ALL');
  }

  // 6. Re-apply dynamic SEO & banners for current language
  applySeoMeta();
  renderBanners();
}

/* ── Lang-switch button click ─────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const sw = document.getElementById('lang-switch');
  if (sw) sw.addEventListener('click', () => {
    setLang(currentLang === 'th' ? 'en' : 'th');
  });

  /* ── Dropdown hover-delay system ─────────────────────────────
     Uses JS to add/remove .dropdown-open class with a 800ms
     leave-delay, preventing accidental menu closure.
     ──────────────────────────────────────────────────────────── */
  const navItems = document.querySelectorAll('.nav-item');
  const HOVER_DELAY = 800; // ms delay before hiding

  navItems.forEach(item => {
    let hideTimer = null;

    const showDropdown = () => {
      clearTimeout(hideTimer);
      // Close other dropdowns first
      navItems.forEach(other => {
        if (other !== item) other.classList.remove('dropdown-open');
      });
      item.classList.add('dropdown-open');
    };

    const hideDropdown = () => {
      hideTimer = setTimeout(() => {
        item.classList.remove('dropdown-open');
      }, HOVER_DELAY);
    };

    item.addEventListener('mouseenter', showDropdown);
    item.addEventListener('mouseleave', hideDropdown);

    // Keep dropdown open when hovering the dropdown itself
    const dropdown = item.querySelector('.brands-dropdown');
    if (dropdown) {
      dropdown.addEventListener('mouseenter', () => clearTimeout(hideTimer));
      dropdown.addEventListener('mouseleave', hideDropdown);
    }

    // Touch support: toggle on tap for mobile
    const btn = item.querySelector('.nav-btn');
    if (btn && dropdown) {
      btn.addEventListener('click', (e) => {
        if (window.innerWidth <= 900) {
          e.preventDefault();
          e.stopPropagation();
          const isOpen = item.classList.contains('dropdown-open');
          navItems.forEach(n => n.classList.remove('dropdown-open'));
          if (!isOpen) item.classList.add('dropdown-open');
        }
      });
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-item')) {
      navItems.forEach(n => n.classList.remove('dropdown-open'));
    }
  });

  // Close dropdowns on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      navItems.forEach(n => n.classList.remove('dropdown-open'));
    }
  });
});

function updateTexts() {
  document.querySelectorAll('[data-en], [data-th]').forEach(el => {
    const txt = el.getAttribute(`data-${currentLang}`);
    if (txt) el.textContent = txt;
  });
}

/* ═══════════════════════════════════════════════════════════════
   § 5b.  RENDER — HOME: FEATURED PRODUCTS (顯示具體商品+台幣售價)
   ═══════════════════════════════════════════════════════════════ */

function renderFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid || !BRANDS.length) return;

  // ── Tier 1: 後台設定的 featured_products(window.FEATURED_DATA) ──
  // 由 supabase-client.js 灌入,已過濾 is_active=true 並按 sort_order 排序
  const featured = Array.isArray(window.FEATURED_DATA) ? window.FEATURED_DATA : [];
  let picks = [];
  for (const f of featured) {
    const brand = BRANDS.find(b => b.id === f.brand_id);
    if (!brand) continue;
    const product = (brand.products || []).find(p => p.id === f.product_id);
    if (!product) continue;
    picks.push({ brand, product });
  }

  // ── Tier 2: fallback — 後台沒設或被刪光時,沿用舊的 PREFERRED_BRANDS 邏輯 ──
  if (!picks.length) {
    const PREFERRED_BRANDS = ['ceci','dirtycoins','levents','hades','swe','firefly','sly','badrabbit','stressmama','fragile','rich','poison-fang','aesirstudio','latui-atelier'];
    const seenBrands = new Set();
    const hasCover = (p) =>
      (p.images?.gallery?.[0]?.original_url) || p.original_cover_url || p.images?.cover;
    for (const bid of PREFERRED_BRANDS) {
      if (picks.length >= 8) break;
      const brand = BRANDS.find(b => b.id === bid);
      if (!brand || !brand.products?.length) continue;
      const product = brand.products.find(p => p.price?.thb_carryback && hasCover(p));
      if (product && !seenBrands.has(bid)) {
        picks.push({ brand, product });
        seenBrands.add(bid);
      }
    }
    if (picks.length < 8) {
      for (const brand of BRANDS) {
        if (picks.length >= 8) break;
        if (seenBrands.has(brand.id) || !brand.products?.length) continue;
        const product = brand.products.find(p => p.price?.thb_carryback && hasCover(p));
        if (product) {
          picks.push({ brand, product });
          seenBrands.add(brand.id);
        }
      }
    }
  }

  if (!picks.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:40px">尚未設定精選商品</p>';
    return;
  }

  grid.innerHTML = picks.map(({ brand, product: p }) => {
    const cover = (p.images?.gallery?.[0]?.original_url) || p.original_cover_url || p.images?.cover || '';
    const safeName = (p.name || '').replace(/'/g, "&#39;").replace(/"/g, "&quot;");
    const ship  = p.price?.thb_shipping;
    const carry = p.price?.thb_carryback;
    return `
      <div class="featured-card" onclick="showPage('brand','${brand.id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter')showPage('brand','${brand.id}')">
        <img class="featured-card-img" src="${cover}" alt="${safeName}" loading="lazy" onerror="this.style.background='linear-gradient(135deg,#1a0520,#16141e)';this.style.opacity=0.4">
        <div class="featured-card-info">
          <p class="featured-brand">${brand.name || brand.id}</p>
          <p class="featured-name">${safeName}</p>
          <div class="featured-price">
            ${ship  != null ? `<div class="featured-price-row"><span class="label" data-en="SHIPPING" data-th="ส่ง">ส่ง</span><span class="amount">฿ ${ship.toLocaleString()}</span></div>` : ''}
            ${carry != null ? `<div class="featured-price-row"><span class="label" data-en="CARRY-BACK" data-th="นำกลับเอง">นำกลับเอง</span><span class="amount carry">฿ ${carry.toLocaleString()}</span></div>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   § 6.  RENDER — HOME: BRANDS GRID
   ═══════════════════════════════════════════════════════════════ */

function renderBrandsGrid() {
  const grid = document.getElementById('brands-grid');
  if (!grid) return;

  console.log('[renderBrandsGrid] Rendering brands for:', currentLang, '| total BRANDS:', BRANDS.length);

  // Neon gradient fallback when no cover image exists
  const FALLBACK_BG = 'linear-gradient(135deg, #1a0520 0%, #0d0820 40%, #070a18 70%, #16141e 100%)';

  // 按英文字母 A→Z 排序
  const activeBrands = BRANDS.filter(b => b.products.length > 0)
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' }));
  console.log('[renderBrandsGrid] Active brands (with products):', activeBrands.length);

  grid.innerHTML = activeBrands.map(b => {
    // Brand name: always use b.name (English brand name) — never language-dependent
    const displayName = b.name || b.id || 'UNKNOWN';
    const safeName    = displayName.replace(/'/g, "\\'");

    // Image: use DB cover_url → CDN product image → neon gradient fallback
    const coverSrc   = b.cover_url || _getBrandCoverSrc(b) || '';
    const logoSrc    = b.logo_url || '';
    const itemCount  = b.products.length;
    const cityLabel  = b.meta_location || b.origin || '';
    const cardId     = `bc-${b.id}`;

    // Background style: CDN image or neon gradient
    const bgStyle = coverSrc
      ? `background-image:url('${coverSrc}')`
      : `background:${FALLBACK_BG}`;

    // Logo: show <img> if URL exists, otherwise text fallback
    const logoHtml = logoSrc
      ? `<img class="brand-card-logo" src="${logoSrc}" alt="${displayName}"
             onerror="this.style.display='none';
                      if(!this.parentNode.querySelector('.brand-card-logo-text')){
                        var t=document.createElement('div');
                        t.className='brand-card-logo-text';
                        t.textContent='${safeName}';
                        this.parentNode.appendChild(t);
                      }">`
      : `<div class="brand-card-logo-text">${displayName}</div>`;

    return `
      <div class="brand-card fade-in" id="${cardId}" onclick="showPage('brand','${b.id}')">
        <div class="brand-card-img" style="${bgStyle}"></div>
        ${logoHtml}
        <div class="brand-card-overlay"></div>
        <div class="brand-card-info">
          <div class="brand-card-origin">${cityLabel}</div>
          <div class="brand-card-name">${displayName}</div>
          <div class="brand-card-count">${itemCount} ITEMS</div>
        </div>
        <div class="brand-card-arrow">↗</div>
      </div>`;
  }).join('');
}

/** Find best displayable cover image from product data (CDN URLs).
 *  Priority: detail gallery (CDN) → source gallery (CDN) → original_cover_url → cover (CDN) */
function _getBrandCoverSrc(brand) {
  const _cdnUrl = (g) => (g.original_url || g.url || '').startsWith('http') ? (g.original_url || g.url) : null;
  // Pass 1: CDN 'detail' image (model/lifestyle — usually darker)
  for (const p of brand.products) {
    const gallery = p.images?.gallery || [];
    const detail = gallery.find(g => g.type === 'detail' && _cdnUrl(g));
    if (detail) return _cdnUrl(detail);
  }
  // Pass 2: CDN 'source' image
  for (const p of brand.products) {
    const gallery = p.images?.gallery || [];
    const src = gallery.find(g => g.type === 'source' && _cdnUrl(g));
    if (src) return _cdnUrl(src);
  }
  // Pass 3: original_cover_url
  for (const p of brand.products) {
    if (p.original_cover_url?.startsWith('http')) return p.original_cover_url;
  }
  return null;
}

/** Find the best product image URL for a single product (used by product cards) */
function _getProductImageSrc(product) {
  if (!product) return null;
  const imgs = product.images || {};
  const gallery = imgs.gallery || [];
  // CDN gallery: original_url first, then url
  for (const g of gallery) {
    const u = g.original_url || g.url || '';
    if (u.startsWith('http')) return u;
  }
  // original_cover_url
  if (product.original_cover_url?.startsWith('http')) return product.original_cover_url;
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   § 7.  RENDER — NAV: BRANDS DROPDOWN  (A → Z)
   ═══════════════════════════════════════════════════════════════ */

function renderDropdown() {
  const container = document.getElementById('dropdown-letters');
  if (!container) return;

  const sorted   = [...BRANDS].sort((a, b) => a.name.localeCompare(b.name));
  const byLetter = {};
  sorted.forEach(b => {
    const letter = b.name.charAt(0).toUpperCase();
    if (!byLetter[letter]) byLetter[letter] = [];
    byLetter[letter].push(b);
  });

  container.innerHTML = Object.entries(byLetter).sort().map(([letter, brands]) => `
    <div class="letter-group">
      <div class="letter-heading">${letter}</div>
      <div class="dropdown-brand-list">
        ${brands.map(b => `
          <button class="dropdown-brand-btn" onclick="showPage('brand','${b.id}')">${b.name}</button>
        `).join('')}
      </div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════════════════
   § 8.  RENDER FILTERS (對齊版)
   ═══════════════════════════════════════════════════════════════ */
function renderFilters() {
  const container = document.getElementById('products-filter');
  if (!container) return;
  const products = window.CURRENT_BRAND_PRODUCTS || [];
  const catCounts = {};
  products.forEach(p => {
    const cat = (p.category || '').toUpperCase();
    if (cat) catCounts[cat] = (catCounts[cat] || 0) + 1;
  });
  const sorted = Object.keys(catCounts).sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const getLabel = (cat) => {
    const m = CAT_LABELS[cat];
    return m ? (currentLang === 'th' ? m.th : m.en) : cat;
  };
  let html = '<button class="filter-btn active" data-cat="ALL"><span>' +
    (currentLang === 'th' ? 'ทั้งหมด' : 'ALL') +
    '</span><span class="filter-count">' + products.length + '</span></button>';
  sorted.forEach(cat => {
    html += '<button class="filter-btn" data-cat="' + cat + '"><span>' +
      getLabel(cat) + '</span><span class="filter-count">' + catCounts[cat] + '</span></button>';
  });
  container.innerHTML = html;
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(btn.getAttribute('data-cat'));
    };
  });
}

/* ═══════════════════════════════════════════════════════════════
   § 9.  FILTER PRODUCTS
   ═══════════════════════════════════════════════════════════════ */

function filterProducts(brandId, tag, btn) {
  const b = BRANDS.find(x => x.id === brandId);
  if (!b) return;

  document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
  btn.classList.add('active');

  const filtered = tag === 'ALL' ? b.products : b.products.filter(p => p.tag === tag);

  // Stagger animation
  const grid = document.getElementById('products-grid');
  grid.classList.remove('animating');
  void grid.offsetWidth;           // force reflow to re-trigger CSS animation
  grid.classList.add('animating');

  renderProducts(filtered);
  initImgLazy();
  setTimeout(() => grid.classList.remove('animating'), 700);
}

/* ═══════════════════════════════════════════════════════════════
   § 10a. BUILD A SINGLE PRODUCT CARD
   ═══════════════════════════════════════════════════════════════ */
function _buildProductCard(p) {
  const gallery  = p.images?.gallery || [];

  // === Image resolution: prefer CDN links, skip local paths on server ===
  // Priority: gallery[].original_url (CDN) → gallery[].url (if CDN) → original_cover_url
  const cdnGalleryUrls = gallery
    .map(g => g.original_url || g.url || '')
    .filter(u => u.startsWith('http'));
  const cdnCover = (p.original_cover_url?.startsWith('http') ? p.original_cover_url : '')
    || (p.images?.cover?.startsWith('http') ? p.images.cover : '');
  const imgUrls  = cdnGalleryUrls.length ? cdnGalleryUrls
    : (cdnCover ? [cdnCover] : []);
  const coverUrl = imgUrls[0] || '';

  const sizes     = p.sizes || [];

  const thbShip  = p.price?.thb_shipping;
  const thbCarry = p.price?.thb_carryback;

  const imgsAttr = JSON.stringify(imgUrls).replace(/"/g, '&quot;');

  const mainImg = coverUrl
    ? `<img class="card-main-img loaded" src="${coverUrl}" loading="lazy" alt="${p.name}"
           onerror="this.parentNode.innerHTML='<div class=\\'product-img-placeholder\\'><div class=\\'placeholder-icon\\'>👕</div><div class=\\'placeholder-text\\'>NO IMAGE</div></div>'">`
    : `<div class="product-img-placeholder">
         <div class="placeholder-icon">👕</div>
         <div class="placeholder-text">NO IMAGE</div>
       </div>`;

  const soldOverlay = '';

  const countBadge = imgUrls.length > 1
    ? `<div class="photo-count-badge">📷 ${imgUrls.length}</div>` : '';

  const thumbsHtml = imgUrls.length > 1
    ? `<div class="gallery-thumbs">
        ${imgUrls.slice(0, 5).map((url, i) => `
          <img class="gallery-thumb loaded${i === 0 ? ' active' : ''}"
               src="${url}" loading="lazy" alt=""
               onclick="switchThumb(this,'${url}',event)">
        `).join('')}
       </div>` : '';

  const sizesHtml = sizes.length
    ? `<div class="product-sizes-label">SIZE</div>
       <div class="product-sizes">
         ${sizes.map(s => `<span class="size-chip">${s.label}</span>`).join('')}
       </div>` : '';

  const reviewBadge = '';

  const priceHtml = `
    <div class="product-price-wrap">
      ${thbShip  != null ? `<div class="price-row"><span class="price-main">฿ ${thbShip.toLocaleString()}</span><span class="price-tag-pill">${currentLang === 'th' ? 'ส่ง<span class="pill-sub">กลับไทย</span>' : 'SHIP<span class="pill-sub">INC.</span>'}</span></div>` : ''}
      ${thbCarry != null ? `<div class="price-row"><span class="price-carry">฿ ${thbCarry.toLocaleString()}</span><span class="price-tag-pill carry">${currentLang === 'th' ? 'นำกลับ<span class="pill-sub">ด้วยตัวเอง</span>' : 'CARRY<span class="pill-sub">BACK</span>'}</span></div>` : ''}
    </div>`;

  return `
    <div class="product-card">
      <div class="product-img-box" data-imgs="${imgsAttr}" data-pname="${p.name}" onclick="lbOpen(this)">
        ${mainImg}${soldOverlay}${countBadge}
      </div>
      ${thumbsHtml}
      <div class="product-info">
        ${reviewBadge}
        <div class="product-season">${p.category || p.tag || ''}</div>
        <div class="product-name">${p.name}</div>
        ${priceHtml}
        ${sizesHtml}
        <span class="product-tag">${p.category || p.tag || ''}</span>
        ${typeof window.renderAddToCartButton === 'function' ? window.renderAddToCartButton(p) : ''}
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   § 10.  RENDER — PRODUCT CARDS (修正過濾版)
   ═══════════════════════════════════════════════════════════════ */
function renderProducts(cat) {
  cat = cat || 'ALL';
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  const allProducts = window.CURRENT_BRAND_PRODUCTS || [];
  const filtered = allProducts.filter(p => {
    if (cat === 'ALL' || cat === 'all') return true;
    return (p.category || '').toUpperCase() === cat.toUpperCase();
  });
  if (filtered.length === 0) {
    grid.innerHTML = '<p style="text-align:center; padding:50px;">No items found.</p>';
  } else {
    grid.innerHTML = filtered.map(p => _buildProductCard(p)).join('');
    // Attach add-to-cart handlers for all rendered products
    if (typeof window.attachAddToCartHandler === 'function') {
      filtered.forEach(p => window.attachAddToCartHandler(p));
    }
  }
  if (typeof initImgLazy === 'function') initImgLazy();
}

/* ═══════════════════════════════════════════════════════════════
   § 11.  GALLERY THUMBNAIL SWITCHER
   ═══════════════════════════════════════════════════════════════ */

function switchThumb(thumbEl, url, evt) {
  if (evt) evt.stopPropagation();
  const card    = thumbEl.closest('.product-card');
  const box     = card.querySelector('.product-img-box');
  const mainImg = box.querySelector('.card-main-img');

  if (mainImg) {
    const realUrl = thumbEl.dataset.src || url;
    // Load thumb if still lazy
    if (thumbEl.dataset.src) {
      thumbEl.src = realUrl;
      thumbEl.removeAttribute('data-src');
      thumbEl.classList.add('loaded');
    }
    // Swap main image
    mainImg.classList.remove('loaded');
    mainImg.removeAttribute('data-src');
    mainImg.src    = realUrl;
    mainImg.onload = () => mainImg.classList.add('loaded');
    if (mainImg.complete) mainImg.classList.add('loaded');
    // Rotate lightbox array so clicked image opens first
    const all = JSON.parse(box.dataset.imgs || '[]');
    const idx = all.indexOf(realUrl);
    if (idx > 0) box.dataset.imgs = JSON.stringify([...all.slice(idx), ...all.slice(0, idx)]);
  }

  card.querySelectorAll('.gallery-thumb')
    .forEach(t => t.classList.toggle('active', t === thumbEl));
}

/* ═══════════════════════════════════════════════════════════════
   § 12.  LAZY IMAGE LOADING  (IntersectionObserver)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  let _obs = null;

  window.initImgLazy = function () {
    const imgs = document.querySelectorAll('.lazy-img[data-src]');
    if (!imgs.length) return;

    // Fallback: no IntersectionObserver support
    if (!window.IntersectionObserver) {
      imgs.forEach(img => { img.src = img.dataset.src; img.classList.add('loaded'); });
      return;
    }

    if (!_obs) {
      _obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          img.onload  = () => img.classList.add('loaded');
          img.onerror = () => img.classList.add('loaded');   // don't block on error
          if (img.complete) img.classList.add('loaded');      // already cached
          _obs.unobserve(img);
        });
      }, { rootMargin: '300px 0px' });     // preload 300 px before entering viewport
    }

    imgs.forEach(img => _obs.observe(img));
  };
})();

/* ═══════════════════════════════════════════════════════════════
   § 13.  LIGHTBOX
   ═══════════════════════════════════════════════════════════════ */
(function () {
  let imgs = [], idx = 0;

  const el   = id => document.getElementById(id);
  const lb   = () => el('lightbox');
  const lbI  = () => el('lightbox-img');

  function renderLb() {
    const n = imgs.length;
    const img = lbI();
    img.classList.add('fading');
    setTimeout(() => {
      img.src    = imgs[idx];
      img.onload = () => img.classList.remove('fading');
      if (img.complete) img.classList.remove('fading');
    }, 80);
    el('lb-counter').textContent = n > 1 ? `${idx + 1} / ${n}` : '';
    el('lb-prev').classList.toggle('hidden', n <= 1 || idx === 0);
    el('lb-next').classList.toggle('hidden', n <= 1 || idx === n - 1);
    el('lb-dots').innerHTML = n > 1
      ? imgs.map((_, i) => `<span class="lb-dot${i === idx ? ' active' : ''}" data-i="${i}"></span>`).join('')
      : '';
  }

  window.lbOpen = function (triggerEl) {
    imgs = JSON.parse(triggerEl.dataset.imgs || '[]');
    idx  = 0;
    el('lb-name').textContent = triggerEl.dataset.pname || '';
    renderLb();
    lb().classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  function lbClose() {
    lb().classList.remove('open');
    document.body.style.overflow = '';
  }

  function lbGo(n) {
    if (n < 0 || n >= imgs.length) return;
    idx = n; renderLb();
  }

  document.addEventListener('DOMContentLoaded', () => {
    el('lb-close').addEventListener('click', lbClose);
    el('lb-prev').addEventListener('click', () => lbGo(idx - 1));
    el('lb-next').addEventListener('click', () => lbGo(idx + 1));
    lb().addEventListener('click', e => {
      if (e.target === lb() || e.target === el('lightbox-img-wrap')) lbClose();
    });
    el('lb-dots').addEventListener('click', e => {
      const dot = e.target.closest('.lb-dot');
      if (dot) lbGo(+dot.dataset.i);
    });
    document.addEventListener('keydown', e => {
      if (!lb().classList.contains('open')) return;
      if (e.key === 'Escape')     lbClose();
      if (e.key === 'ArrowLeft')  lbGo(idx - 1);
      if (e.key === 'ArrowRight') lbGo(idx + 1);
    });
  });
})();

/* ═══════════════════════════════════════════════════════════════
   § 14.  FADE-IN OBSERVER  (scroll animations)
   ═══════════════════════════════════════════════════════════════ */
function observeFadeIns() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.08 });
  document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
}

/* ═══════════════════════════════════════════════════════════════
   § 15b.  STYLE FILTER  (navbar dropdown)
   ═══════════════════════════════════════════════════════════════ */
function filterByStyle(keyword) {
  showPage('home');
  setTimeout(() => {
    const grid = document.getElementById('brands-grid');
    if (!grid) return;
    // BUGFIX: cards are rendered alphabetically (renderBrandsGrid 排序) 但 BRANDS
    // 不是. 不能用 index alignment, 改用 card.id (e.g. bc-laneci) 反查.
    const byId = Object.fromEntries(BRANDS.map(b => [b.id, b]));
    const cards = grid.querySelectorAll('.brand-card');
    const kw = (keyword || '').toLowerCase();
    cards.forEach(card => {
      const id    = (card.id || '').replace(/^bc-/, '');
      const brand = byId[id];
      if (!brand) return;
      const cat   = (brand.meta_category || '').toLowerCase();
      const style = (brand.style || '').toLowerCase();
      if (!kw || cat.includes(kw) || style.includes(kw)) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
    document.getElementById('brands-section').scrollIntoView({behavior:'smooth'});
  }, 50);
}

/* ═══════════════════════════════════════════════════════════════
   § 16.  INIT
   ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   § 16a. MOBILE MENU
   ═══════════════════════════════════════════════════════════════ */
function toggleMobileMenu() {
  const overlay = document.getElementById('mobile-overlay');
  const hamburger = document.getElementById('hamburger');
  if (!overlay || !hamburger) return;
  const isOpen = overlay.classList.contains('open');
  if (isOpen) {
    closeMobileMenu();
  } else {
    overlay.classList.add('open');
    hamburger.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Populate mobile brand list if empty
    const mbl = document.getElementById('mobile-brand-list');
    if (mbl && !mbl.children.length && BRANDS.length) {
      const active = BRANDS.filter(b => b.products.length > 0)
        .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
      mbl.innerHTML = active.map(b =>
        `<button class="mobile-brand-item" onclick="showPage('brand','${b.id}');closeMobileMenu()">${b.name || b.id}</button>`
      ).join('');
    }
  }
}

function closeMobileMenu() {
  const overlay = document.getElementById('mobile-overlay');
  const hamburger = document.getElementById('hamburger');
  if (overlay) overlay.classList.remove('open');
  if (hamburger) hamburger.classList.remove('active');
  document.body.style.overflow = '';
  // Collapse sub-lists
  const mbl = document.getElementById('mobile-brand-list');
  const msl = document.getElementById('mobile-style-list');
  if (mbl) mbl.style.display = 'none';
  if (msl) msl.style.display = 'none';
}

function toggleMobileBrands() {
  const mbl = document.getElementById('mobile-brand-list');
  if (!mbl) return;
  mbl.style.display = mbl.style.display === 'none' ? 'flex' : 'none';
}

function toggleMobileStyles() {
  const msl = document.getElementById('mobile-style-list');
  if (!msl) return;
  msl.style.display = msl.style.display === 'none' ? 'flex' : 'none';
}

function toggleMobileLang() {
  const next = currentLang === 'th' ? 'en' : 'th';
  setLang(next);
}

/* ═══════════════════════════════════════════════════════════════
   § 15a.  DYNAMIC BANNERS (from CMS)
   ═══════════════════════════════════════════════════════════════ */

function renderBanners() {
  const banners = window.BANNERS_DATA || [];
  if (!banners.length) return;   // no banners — keep static hero

  const container = document.getElementById('hero-banners');
  if (!container) return;

  // Show banner container, hide static hero content
  container.style.display = 'block';
  const staticHero = document.querySelector('.hero-content');
  if (staticHero) staticHero.style.display = 'none';

  let current = 0;

  function render() {
    const b = banners[current];
    const lang = currentLang || 'th';
    const title    = b.title || '';
    const subtitle = b.subtitle || '';

    // Determine click target: brand_id → brand page, link_url → external link
    const hasBrand = !!b.brand_id;
    const hasLink  = !!b.link_url;
    const clickable = hasBrand || hasLink;
    const cursorStyle = clickable ? 'cursor:pointer;' : '';
    const btnLabel = lang === 'th' ? 'ซื้อเลย' : 'SHOP NOW';
    const showBtn = clickable;

    const isMobile = window.innerWidth <= 768;
    const bgImg = (isMobile && b.mobile_image_url) ? b.mobile_image_url : b.image_url;

    container.innerHTML = `
      <div class="hero-banner-slide" style="background-image:url('${bgImg}');${cursorStyle}"
           ${clickable ? `data-brand-id="${b.brand_id || ''}" data-link-url="${b.link_url || ''}"` : ''}>
        <div class="hero-banner-overlay"></div>
        <div class="hero-banner-text">
          ${title ? `<h2 class="hero-banner-title">${title}</h2>` : ''}
          ${subtitle ? `<p class="hero-banner-subtitle">${subtitle}</p>` : ''}
          ${showBtn ? `<button type="button" class="btn-primary hero-banner-cta">${btnLabel}</button>` : ''}
        </div>
      </div>
      ${banners.length > 1 ? `<div class="hero-banner-dots">
        ${banners.map((_, i) => `<span class="hero-dot${i === current ? ' active' : ''}" onclick="window._bannerGo(${i})"></span>`).join('')}
      </div>` : ''}`;

    // Attach click handler for the whole slide area
    const slide = container.querySelector('.hero-banner-slide');
    if (slide && clickable) {
      slide.addEventListener('click', (e) => {
        // Don't trigger on dot clicks
        if (e.target.closest('.hero-banner-dots')) return;
        const brandId = slide.dataset.brandId;
        const linkUrl = slide.dataset.linkUrl;
        if (linkUrl) {
          window.open(linkUrl, '_blank');
        } else if (brandId) {
          showPage('brand', brandId);
        }
      });
    }
  }

  window._bannerGo = function(i) { current = i; render(); resetAutoRotate(); };

  // Auto-rotate every 5 seconds
  let autoTimer = null;
  function resetAutoRotate() {
    if (autoTimer) clearInterval(autoTimer);
    if (banners.length > 1) {
      autoTimer = setInterval(() => { current = (current + 1) % banners.length; render(); }, 5000);
    }
  }

  // ── Touch swipe support ──
  if (banners.length > 1) {
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    container.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isSwiping = true;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (!isSwiping) return;
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        e.preventDefault();
      }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
      if (!isSwiping) return;
      isSwiping = false;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
          current = (current + 1) % banners.length;
        } else {
          current = (current - 1 + banners.length) % banners.length;
        }
        render();
        resetAutoRotate();
      }
    }, { passive: true });
  }

  render();
  resetAutoRotate();
}

/* ═══════════════════════════════════════════════════════════════
   § 15b.  DYNAMIC SEO META (from CMS site_settings)
   ═══════════════════════════════════════════════════════════════ */

function applySeoMeta() {
  const settings = window.SITE_SETTINGS || {};
  const seo = settings.seo_homepage;
  if (!seo) return;

  const lang = currentLang || 'th';
  const title = lang === 'th' ? (seo.title_th || seo.title_en) : (seo.title_en || seo.title_th);
  const desc  = lang === 'th' ? (seo.description_th || seo.description_en) : (seo.description_en || seo.description_th);

  if (title) document.title = title;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && desc) metaDesc.setAttribute('content', desc);

  // Update Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc  = document.querySelector('meta[property="og:description"]');
  if (ogTitle && title) ogTitle.setAttribute('content', title);
  if (ogDesc && desc)   ogDesc.setAttribute('content', desc);
}

/* ═══════════════════════════════════════════════════════════════
   § 16.  INIT
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();

  if (!BRANDS.length) return;   // error was already shown inside loadData()

  renderFeatured();
  renderBrandsGrid();
  renderDropdown();
  renderBanners();
  applySeoMeta();
  observeFadeIns();
  setLang('en');        // default to English
  initImgLazy();

  // ── Cart icon in nav ──────────────────────────────────────────
  if (typeof window.renderCartIcon === 'function') {
    const cartSlot = document.getElementById('nav-cart-icon');
    if (cartSlot) {
      cartSlot.innerHTML = window.renderCartIcon();
      cartSlot.style.cursor = 'pointer';
      cartSlot.addEventListener('click', () => {
        if (window.CartSystem) window.CartSystem.openCart();
      });
    }
  }

  // ── Restore page from URL pathname/hash (supports direct links & refresh) ──
  // 支援 /policy/purchase 等 clean URL (透過 vercel.json rewrites 都導向 index.html)
  const initRoute = _routeFromPath();
  if (initRoute.page && initRoute.page !== 'home') {
    showPage(initRoute.page, initRoute.brandId || null, true);
  }
  // Set initial history state (preserve current URL)
  history.replaceState({ page: initRoute.page, brandId: initRoute.brandId || null }, '', location.pathname + location.hash);

  // ── Init Virtual Fitting Room ──────────────────────────────────
  initTryOnRoom();
});

/* ═══════════════════════════════════════════════════════════════
   § 17.  VIRTUAL FITTING ROOM (Nano Banana 2 / Gemini)
   ═══════════════════════════════════════════════════════════════ */
function initTryOnRoom() {
  let selfieBase64 = null;
  let selfieType = 'image/jpeg';
  let currentProduct = null;

  const uploadArea  = document.getElementById('tryon-upload-area');
  const fileInput   = document.getElementById('tryon-selfie-input');
  const preview     = document.getElementById('tryon-selfie-preview');
  const placeholder = document.getElementById('tryon-placeholder');
  const changeBtn   = document.getElementById('tryon-change-photo');
  const nextBtn     = document.getElementById('tryon-next-btn');
  const backBtn     = document.getElementById('tryon-back-btn');
  const selfieSmall = document.getElementById('tryon-selfie-small');
  const brandSelect = document.getElementById('tryon-brand-select');
  const clothesGrid = document.getElementById('tryon-clothes-grid');
  const tryAnother  = document.getElementById('tryon-try-another');
  const addCartBtn  = document.getElementById('tryon-add-cart');

  if (!uploadArea) return; // page not loaded

  // ── Step navigation ─────────────────────────────────────────
  function goStep(n) {
    document.querySelectorAll('.tryon-step').forEach(el => el.classList.remove('active'));
    const step = document.getElementById('tryon-step' + n);
    if (step) step.classList.add('active');
  }

  // ── Step 1: Upload selfie ───────────────────────────────────
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleSelfie(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', e => { if (e.target.files[0]) handleSelfie(e.target.files[0]); });

  function handleSelfie(file) {
    // Compress selfie to max 1024px & JPEG 0.8 to stay under Vercel body limits
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1024;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else       { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      selfieType = 'image/jpeg';
      selfieBase64 = dataUrl.split(',')[1];
      preview.src = dataUrl;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
      changeBtn.style.display = 'inline-flex';
    };
    img.src = url;
  }

  changeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.value = '';
    fileInput.click();
  });

  nextBtn.addEventListener('click', () => {
    if (selfieBase64) {
      selfieSmall.src = preview.src;
    }
    populateBrandFilter();
    renderClothes('all', 'ALL');
    goStep(2);
  });

  backBtn.addEventListener('click', () => goStep(1));

  // ── Step 2: Browse & select clothes ─────────────────────────
  function populateBrandFilter() {
    const sel = brandSelect;
    sel.innerHTML = '<option value="all">所有品牌</option>';
    BRANDS.filter(b => b.products.length > 0).forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      sel.appendChild(opt);
    });
  }

  brandSelect.addEventListener('change', () => { currentOutfitCat = 'ALL'; updateOutfitCatTabs(); renderClothes(brandSelect.value, 'ALL'); });

  // ── Category filter for outfit tabs ─────────────────────────
  let currentOutfitCat = 'ALL';

    /* ── Outfit multi-select slots ── */
    const outfitSlots = { top: null, bottom: null, outerwear: null, accessory: null };

    function getProductCategory(product) {
      const cat = (product.category || '').toUpperCase();
      if (OUTFIT_CAT_MAP.top.includes(cat)) return 'top';
      if (OUTFIT_CAT_MAP.bottom.includes(cat)) return 'bottom';
      if (OUTFIT_CAT_MAP.outerwear.includes(cat)) return 'outerwear';
      return 'accessory';
    }

    function addToOutfit(product) {
      const slot = getProductCategory(product);
      outfitSlots[slot] = product;
      renderOutfitPanel();
      updateTryOnButton();
    }

    function removeFromOutfit(slot) {
      outfitSlots[slot] = null;
      renderOutfitPanel();
      updateTryOnButton();
    }

    function updateTryOnButton() {
      const btn = document.getElementById('outfit-tryon-btn');
      const count = Object.values(outfitSlots).filter(v => v !== null).length;
      if (count > 0) {
        btn.disabled = false;
        const lang = document.documentElement.lang === 'th' ? 'th' : 'en';
        btn.textContent = lang === 'en' ? 'Try On ' + count + ' items' : '\u8A66\u7A7F ' + count + ' \u4EF6\u5546\u54C1';
      } else {
        btn.disabled = true;
        btn.textContent = btn.dataset.tw || '\u8ACB\u5148\u9078\u64C7\u5546\u54C1';
      }
    }

    function renderOutfitPanel() {
      const panel = document.getElementById('outfit-panel');
      const slotLabels = {
        top: { icon: '\uD83D\uDC55', tw: '\u4E0A\u8863', en: 'Top' },
        bottom: { icon: '\uD83D\uDC56', tw: '\u8932\u5B50', en: 'Pants' },
        outerwear: { icon: '\u{1F9E5}', tw: '\u5916\u5957', en: 'Outerwear' },
        accessory: { icon: '\uD83C\uDFA9', tw: '\u914D\u4EF6', en: 'Accessory' }
      };
      let html = '<div class="outfit-slots">';
      for (const [slot, prod] of Object.entries(outfitSlots)) {
        const label = slotLabels[slot];
        if (prod) {
          const imgSrc = _getProductImageSrc(prod) || '';
          html += '<div class="outfit-slot filled" data-slot="' + slot + '">'
            + '<img src="' + imgSrc + '" alt="' + (prod.name || '') + '">'
            + '<span class="slot-label">' + label.icon + ' ' + label.tw + '</span>'
            + '<button class="slot-remove" data-slot="' + slot + '">&times;</button>'
            + '</div>';
        } else {
          html += '<div class="outfit-slot empty" data-slot="' + slot + '">'
            + '<span class="slot-placeholder">' + label.icon + '</span>'
            + '<span class="slot-label">' + label.tw + '</span>'
            + '</div>';
        }
      }
      html += '</div>';
      panel.innerHTML = html;

      panel.querySelectorAll('.slot-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeFromOutfit(btn.dataset.slot);
        });
      });
    }

  const OUTFIT_CAT_MAP = {
    top:       ['TOP','TOPS','TEE','TEES','SHIRT','SHIRTS','POLO','POLOS','TANK','TANKS','LONGSLEEVES','SWEATERS','SWEATER','JERSEYS','JERSEY','HOODIE','HOODIES'],
    bottom:    ['BOTTOM','BOTTOMS','PANTS','PANT','SHORTS','SHORT','SKIRTS','SKIRT'],
    outerwear: ['OUTERWEAR','JACKET','JACKETS','COAT','COATS'],
    bag:       ['BAG','BAGS','BACKPACK','BACKPACKS','TOTE','TOTES'],
    hat:       ['CAP','CAPS','HAT','HATS','BEANIE','BEANIES','BUCKET','BUCKETS'],
  };

  function matchesOutfitCat(product, cat) {
    if (!cat || cat === 'ALL') return true;
    const pCat = (product.category || product.tag || '').toUpperCase();
    const allowed = OUTFIT_CAT_MAP[cat] || [];
    return allowed.some(c => pCat.includes(c));
  }

  function updateOutfitCatTabs() {
    document.querySelectorAll('.outfit-cat-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === currentOutfitCat);
    });
  }

  const outfitCatTabsEl = document.getElementById('outfit-cat-tabs');
  if (outfitCatTabsEl) {
    outfitCatTabsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.outfit-cat-tab');
      if (!btn) return;
      currentOutfitCat = btn.dataset.cat;
      updateOutfitCatTabs();
      renderClothes(brandSelect.value, currentOutfitCat);
    });
  }

  function renderClothes(brandFilter, catFilter) {
    let products = [];
    const activeBrands = BRANDS.filter(b => b.products.length > 0);

    if (brandFilter === 'all') {
      activeBrands.forEach(b => {
        b.products.slice(0, 8).forEach(p => products.push({ ...p, brandName: b.name }));
      });
    } else {
      const brand = activeBrands.find(b => b.id === brandFilter);
      if (brand) brand.products.forEach(p => products.push({ ...p, brandName: brand.name }));
    }

    // Filter to only products with any image (cover or gallery)
    products = products.filter(p => {
      return _getProductImageSrc(p);
    });

    // Filter by outfit category
    products = products.filter(p => matchesOutfitCat(p, catFilter));

    clothesGrid.innerHTML = products.map(p => {
      const imgUrl = _getProductImageSrc(p) || '';
      const name = p.name || 'Product';
      const price = p.price?.thb_shipping ? `฿ ${p.price.thb_shipping.toLocaleString()}` : '';
      return `
        <div class="tryon-cloth-card" data-product-id="${p.id}">
          <img src="${imgUrl}" alt="${name}" loading="lazy" />
          <div class="tryon-cloth-trybtn" data-en="TRY ON" data-th="ลองใส่">ลองใส่</div>
          <div class="tryon-cloth-info">
            <h4>${name}</h4>
            <span>${price}</span>
          </div>
        </div>`;
    }).join('');

    // Attach click handlers
    clothesGrid.querySelectorAll('.tryon-cloth-card').forEach(card => {
      card.addEventListener('click', () => {
        const pid = card.dataset.productId;
        const prod = products.find(p => p.id === pid);
        if (prod) addToOutfit(prod);
      });
    });

    updateTexts();
  }

  // ── Step 3: Try on with AI ──────────────────────────────────
  async function startMultiTryOn() {
      /* Sync selections to OutfitBuilder */
      if (!window.OutfitBuilder) { alert("OutfitBuilder not loaded"); return; }
      const OB = window.OutfitBuilder;
      OB.clearOutfit();
      /* Sync selfie */
      if (!selfieBase64) { alert("Please upload a selfie first"); return; }
      const rawB64 = selfieBase64.indexOf(",") !== -1 ? selfieBase64.split(",")[1] : selfieBase64;
      const selfieSmImg = document.getElementById("tryon-selfie-small");
      OB.setSelfie(rawB64, selfieType || "image/jpeg", selfieSmImg ? selfieSmImg.src : null);
      /* Sync outfit items */
      for (const [slot, prod] of Object.entries(outfitSlots)) {
        if (!prod) continue;
        const cat = OB.resolveCategory(prod);
        if (cat) OB.setItem(cat, prod);
      }
      if (OB.getItemCount() === 0) { alert("Please select items first"); return; }
      /* Switch to step 3 */
      goStep(3);
      const loadingEl  = document.getElementById("tryon-loading");
      const loadingMsg = document.getElementById("tryon-loading-msg");
      const progressEl = document.getElementById("tryon-layer-progress");
      const resultEl   = document.getElementById("tryon-result");
      const errorEl    = document.getElementById("tryon-error");
      const errorMsg   = document.getElementById("tryon-error-msg");
      loadingEl.style.display = "block";
      resultEl.style.display  = "none";
      errorEl.style.display   = "none";
      if (progressEl) progressEl.style.display = "block";
      /* Call OutfitBuilder API */
      OB.executeTryOn(
        function onProgress(i, total, stepLabel) {
          if (loadingMsg) loadingMsg.textContent = stepLabel;
          if (progressEl) {
            var pct = Math.round(((i + 0.5) / total) * 100);
            progressEl.innerHTML = '<div style="width:' + pct + '%;height:100%;background:#a855f7;border-radius:6px;transition:width .3s"></div>';
          }
        },
        function onComplete(results, origSrc) {
          loadingEl.style.display = "none";
          if (progressEl) progressEl.style.display = "none";
          if (!results || results.length === 0) {
            errorEl.style.display = "block";
            errorMsg.textContent  = "No result returned";
            return;
          }
          resultEl.style.display = "block";
          var last = results[results.length - 1];
          var afterImg = document.getElementById("tryon-result-after");
          var beforeImg = document.getElementById("tryon-result-before");
          if (afterImg) afterImg.src = "data:" + (last.mimeType || "image/png") + ";base64," + last.image;
          if (beforeImg && origSrc) beforeImg.src = origSrc;
          else if (beforeImg && selfieSmImg) beforeImg.src = selfieSmImg.src;
          /* Show layer badges */
          var layersEl = document.getElementById("tryon-result-layers");
          if (layersEl) {
            layersEl.innerHTML = results.map(function(r) {
              var lbl = OB.CATEGORY_LABELS[r.category];
              return '<span class="layer-badge">' + (lbl ? lbl.icon + " " + lbl.tw : r.category) + '</span>';
            }).join(" + ");
          }
          /* Show product info */
          var nameEl = document.getElementById("tryon-result-name");
          var priceEl = document.getElementById("tryon-result-price");
          if (nameEl) nameEl.textContent = results.map(function(r){ return r.product.name || ""; }).join(" + ");
          if (priceEl) {
            var total = results.reduce(function(s, r){ return s + (parseFloat(r.product.price) || 0); }, 0);
            priceEl.textContent = "฿ " + total.toLocaleString();
          }
        },
        function onError(msg) {
          loadingEl.style.display = "none";
          if (progressEl) progressEl.style.display = "none";
          errorEl.style.display = "block";
          errorMsg.textContent   = msg;
        }
      );
    }

    async function startTryOn(product) {
      // Legacy single-item - redirect to multi
      Object.keys(outfitSlots).forEach(k => outfitSlots[k] = null);
      addToOutfit(product);
      startMultiTryOn();
    }

    /* ── Outfit try-on button ── */
    document.getElementById('outfit-tryon-btn').addEventListener('click', () => {
      startMultiTryOn();
    });

    /* ── Initialize outfit panel ── */
    renderOutfitPanel();


  tryAnother.addEventListener('click', () => goStep(2));

  // ── Add outfit items to cart ──────────────────────────────────
  if (addCartBtn) {
    addCartBtn.addEventListener('click', function() {
      var CS = window.CartSystem;
      if (!CS) { alert("Cart not available"); return; }
      var added = 0;
      for (var key in outfitSlots) {
        var prod = outfitSlots[key];
        if (!prod) continue;
        var size = (prod.sizes && prod.sizes.length > 0) ? prod.sizes[0] : "FREE";
        CS.addToCart(prod, size, "shipping");
        added++;
      }
      if (added > 0) {
        CS.openCart();
      } else {
        alert("No items selected");
      }
    });
  }

 
}
