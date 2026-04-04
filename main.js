/**
 * main.js — NEON LOTUS
 * ─────────────────────────────────────────────────────────────────
 *  ⚠️  IMPORTANT: must be served over HTTP — NOT opened via file://
 *     Quick start:
 *       npx serve .          (requires Node.js)
 *       python3 -m http.server 8080
 *     Then open: http://localhost:8080
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   § 0.  CONFIG & CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

/** Price formula constants — edit here to update all prices */
const RATE = 0.0014;          // 1 VND → THB

const SHIP_VND = {            // Estimated shipping per category (VND)
  Top:          100_000,
  Outerwear:    150_000,
  Bottom:       120_000,
  Accessories:   80_000,
  Set:          150_000,
  _default:     120_000,
};

const TIERS = [               // Price multiplier tiers
  { max: 1_000_000, mult: 1.6 },
  { max: 1_400_000, mult: 1.5 },
  { max: 2_500_000, mult: 1.4 },
  { max: Infinity,  mult: 1.3 },
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
  bunnyhillconcept: { accent: '#f8bbd0', infoBar: '#120a0e' }, // Soft Minimalist / blush
  'poison-fang':    { accent: '#00e676', infoBar: '#041208' }, // Ethereal / toxic green
  '2idiots-label':  { accent: '#8d6e63', infoBar: '#0e0a08' }, // Fabric Craft / earthy brown
  tryst:            { accent: '#ec407a', infoBar: '#12060c' }, // Women's / hot pink
  aesirstudio:      { accent: '#5c6bc0', infoBar: '#080812' }, // Premium / indigo
  helios:           { accent: '#ffc107', infoBar: '#100e06' }, // Silver Jewelry / amber
};

/** Category display meta (tag → display label + icon) */
const CAT = {
  ALL:         { label: '全部',    icon: '◻' },
  Top:         { label: '上衣',    icon: '👕' },
  Outerwear:   { label: '外套',    icon: '🧥' },
  Bottom:      { label: '褲子',    icon: '👖' },
  Accessories: { label: '飾品',   icon: '💍' },
  Bag:         { label: '包包',    icon: '👜' },
  Headwear:    { label: '帽子',    icon: '🧢' },
  Set:         { label: 'SETS',    icon: '🩴' },
};

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

  // ── Priority 1: window.BRANDS_DATA injected by data.js ──────
  // Works with file://, no server required.
  if (window.BRANDS_DATA) {
    _parseData(window.BRANDS_DATA);
    return;
  }

  // ── Priority 2: fetch() over HTTP  ──────────────────────────
  if (location.protocol === 'file:') {
    _showFatalError(
      '⚠️ data.js not found',
      'Make sure <code>data.js</code> is in the same folder as <code>index.html</code>.',
      [
        'Run <code>node generate_data_js.js</code> to regenerate <code>data.js</code> from <code>brands_products.json</code>.',
        'Or start a local server: <code>npx serve .</code> → <code>http://localhost:3000</code>',
      ]
    );
    return;
  }

  try {
    const res = await fetch('brands_products.json');
    if (!res.ok) throw new Error(`HTTP ${res.status} — could not load brands_products.json`);
    _parseData(await res.json());
  } catch (err) {
    console.error('loadData() failed:', err);
    _showFatalError(
      '⚠️ Failed to load data',
      err.message,
      ['Make sure <code>brands_products.json</code> and <code>data.js</code> are in the same folder as <code>index.html</code>.']
    );
  }
}

/** Shared parse logic — called whether data came from data.js or fetch() */
function _parseData(data) {
  // Group products by brand_id
  const byBrand = {};
  for (const p of data.products) {
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
    desc_en:       b.description.en,
    desc_th:       b.description.zh || b.description.th || b.description.en,
    meta_founded:  b.meta.founded,
    meta_category: b.meta.category,
    meta_location: b.meta.location,
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

function showPage(page, brandId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.remove('hidden');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (page === 'brand' && brandId) renderBrandPage(brandId);
  if (page === 'home') setTimeout(observeFadeIns, 80);
  updateTexts();
}

/* ═══════════════════════════════════════════════════════════════
   § 4.1  核心修復：顯示品牌與品項
   ═══════════════════════════════════════════════════════════════ */
function renderBrandPage(brandId) {
  const allData = window.BRANDS_DATA || { brands: [], products: [] };
  const brand = allData.brands.find(b => b.id === brandId);
  if (!brand) return;

  // ── Apply brand-specific colour theme ────────────────────────
  const theme  = BRAND_THEME[brandId] || {};
  const pageEl = document.getElementById('page-brand');
  pageEl.style.setProperty('--accent',        theme.accent  || '#c084fc');
  pageEl.style.setProperty('--accent2',       theme.accent  || '#a855f7');
  pageEl.style.setProperty('--brand-info-bg', theme.infoBar || '#16141e');
  // Derive a subtle glow / border tint for filter chips
  pageEl.style.setProperty('--border',
    `color-mix(in srgb, ${theme.accent || '#c084fc'} 18%, transparent)`
  );

  // Store current brand products for filter use
  window.CURRENT_BRAND_PRODUCTS = allData.products.filter(p => p.brand_id === brandId);

  // Hero name
  const nameEl = document.getElementById('brand-hero-name');
  if (nameEl) nameEl.innerText = brand.name;

  // Hero background — use first product image
  const heroBg = document.getElementById('brand-hero-bg');
  if (heroBg) {
    const firstProd = window.CURRENT_BRAND_PRODUCTS[0];
    const bgUrl = firstProd?.images?.gallery?.find(g => g.type === 'source')?.url
      || firstProd?.images?.cover
      || firstProd?.original_cover_url;
    if (bgUrl) {
      heroBg.style.cssText = `background-image:url('${bgUrl}');background-size:cover;background-position:center top;`;
    } else {
      heroBg.style.cssText = `background:${brand.color_hex || '#1a1a1a'};`;
    }
  }

  // Info bar — description + meta
  const infoBar = document.getElementById('brand-info-bar');
  if (infoBar) {
    const desc = currentLang === 'th'
      ? (brand.description?.th || brand.description?.zh || brand.description?.en || '')
      : (brand.description?.en || '');
    const meta = brand.meta || {};
    infoBar.innerHTML = `
      <div class="brand-desc-full">${desc}</div>
      ${meta.category ? `<div class="brand-meta-item"><div class="brand-meta-label">CATEGORY</div><div class="brand-meta-value">${meta.category}</div></div>` : ''}
      ${brand.style   ? `<div class="brand-meta-item"><div class="brand-meta-label">STYLE</div><div class="brand-meta-value">${brand.style}</div></div>`       : ''}
      ${brand.city    ? `<div class="brand-meta-item"><div class="brand-meta-label">ORIGIN</div><div class="brand-meta-value">${brand.city}</div></div>`        : ''}
    `;
  }

  renderFilters();
  renderProducts('all');
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

  // 3. Update switch button text
  const sw = document.getElementById('lang-switch');
  if (sw) sw.textContent = lang === 'en' ? 'TH' : 'EN';

  // 4. Re-render brand grid (language-neutral — only uses b.name, never TH text)
  if (BRANDS.length) {
    console.log('[setLang] Re-rendering brands grid for:', lang);
    renderBrandsGrid();
    initImgLazy();
    // Re-observe fade-in elements so new cards become visible
    setTimeout(observeFadeIns, 50);
  }
}

/* ── Lang-switch button click ─────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const sw = document.getElementById('lang-switch');
  if (sw) sw.addEventListener('click', () => {
    setLang(currentLang === 'en' ? 'th' : 'en');
  });

  /* ── Dropdown hover-delay system ─────────────────────────────
     Uses JS to add/remove .dropdown-open class with a 300ms
     leave-delay, preventing accidental menu closure.
     ──────────────────────────────────────────────────────────── */
  const navItems = document.querySelectorAll('.nav-item');
  const HOVER_DELAY = 300; // ms delay before hiding

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
   § 6.  RENDER — HOME: BRANDS GRID
   ═══════════════════════════════════════════════════════════════ */

function renderBrandsGrid() {
  const grid = document.getElementById('brands-grid');
  if (!grid) return;

  console.log('[renderBrandsGrid] Rendering brands for:', currentLang, '| total BRANDS:', BRANDS.length);

  // Neon gradient fallback when no cover image exists
  const FALLBACK_BG = 'linear-gradient(135deg, #1a0520 0%, #0d0820 40%, #070a18 70%, #16141e 100%)';

  const activeBrands = BRANDS.filter(b => b.products.length > 0);
  console.log('[renderBrandsGrid] Active brands (with products):', activeBrands.length);

  grid.innerHTML = activeBrands.map(b => {
    // Brand name: always use b.name (English brand name) — never language-dependent
    const displayName = b.name || b.id || 'UNKNOWN';
    const safeName    = displayName.replace(/'/g, "\\'");

    // Image paths: purely based on brand ID — never affected by currentLang
    const brandCover = `images/brands/${b.id}-cover.jpg`;
    const brandLogo  = `images/brands/${b.id}-logo.png`;
    const cdnCover   = _getBrandCoverSrc(b);
    const itemCount  = b.products.length;
    const cityLabel  = b.meta_location || b.origin || '';
    const cardId     = `bc-${b.id}`;

    return `
      <div class="brand-card fade-in" id="${cardId}" onclick="showPage('brand','${b.id}')">
        <div class="brand-card-img"
             style="background-image:url('${brandCover}')">
        </div>
        <img src="${brandCover}" alt="" style="display:none"
             onerror="(function(){
               var card=document.getElementById('${cardId}');
               if(!card)return;
               var bg=card.querySelector('.brand-card-img');
               var cdn='${(cdnCover || '').replace(/'/g, "\\'")}';
               if(cdn){bg.style.backgroundImage='url(\\''+cdn+'\\')'}
               else{bg.style.backgroundImage='none';bg.style.background='${FALLBACK_BG}'}
             })()">
        <img class="brand-card-logo" src="${brandLogo}" alt="${displayName}"
             onerror="this.style.display='none';
                      if(!this.parentNode.querySelector('.brand-card-logo-text')){
                        var t=document.createElement('div');
                        t.className='brand-card-logo-text';
                        t.textContent='${safeName}';
                        this.parentNode.appendChild(t);
                      }">
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
  // Pass 1: CDN 'detail' image (model/lifestyle — usually darker)
  for (const p of brand.products) {
    if (!p.images) continue;
    const gallery = p.images.gallery || [];
    const detail = gallery.find(g => g.type === 'detail' && g.url?.startsWith('http'));
    if (detail) return detail.url;
  }
  // Pass 2: CDN 'source' image
  for (const p of brand.products) {
    if (!p.images) continue;
    const gallery = p.images.gallery || [];
    const src = gallery.find(g => g.type === 'source' && g.url?.startsWith('http'));
    if (src) return src.url;
    if (p.images.cover?.startsWith('http')) return p.images.cover;
  }
  // Pass 3: original_cover_url (always CDN)
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
  // CDN gallery first
  const cdnImg = gallery.find(g => g.url?.startsWith('http'));
  if (cdnImg) return cdnImg.url;
  // CDN cover
  if (imgs.cover?.startsWith('http')) return imgs.cover;
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
  const buttons  = container.querySelectorAll('.filter-btn');

  // Count products per tag and show/hide buttons + count badges
  buttons.forEach(btn => {
    const tag = btn.getAttribute('data-tag');
    const count = tag === 'all'
      ? products.length
      : products.filter(p => p.tag === tag).length;

    // Show/hide button (always keep 'all')
    btn.style.display = (tag === 'all' || count > 0) ? '' : 'none';

    // Update or add count badge
    let badge = btn.querySelector('.filter-count');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'filter-count';
      btn.appendChild(badge);
    }
    badge.textContent = count;

    btn.onclick = () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(tag);
    };
  });

  // Reset active to 'all'
  buttons.forEach(b => b.classList.remove('active'));
  const allBtn = container.querySelector('.filter-btn[data-tag="all"]');
  if (allBtn) allBtn.classList.add('active');
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

  // Prefer CDN URLs (http), fall back to original_cover_url, then any local path
  const allUrls  = gallery.map(g => g.url).filter(Boolean);
  const cdnUrls  = allUrls.filter(u => u.startsWith('http'));
  const coverUrl = cdnUrls.find(u => u) // first CDN gallery url
    || (p.images?.cover?.startsWith('http') ? p.images.cover : null)
    || (p.original_cover_url?.startsWith('http') ? p.original_cover_url : null)
    || allUrls[0]  // local path as last resort
    || '';
  const imgUrls  = cdnUrls.length ? cdnUrls : (coverUrl ? [coverUrl] : []);

  const sizes     = p.sizes || [];
  const allOut    = sizes.length > 0 && sizes.every(s => !s.available);
  const isSoldOut = p.sold_out || allOut;

  const thbShip  = p.price?.thb_shipping;
  const thbCarry = p.price?.thb_carryback;
  const vnd      = p.price?.vnd;

  const imgsAttr = JSON.stringify(imgUrls).replace(/"/g, '&quot;');

  const mainImg = coverUrl
    ? `<img class="card-main-img lazy-img" data-src="${coverUrl}" src="" alt="${p.name}">`
    : `<div class="product-img-placeholder">
         <div class="placeholder-icon">👕</div>
         <div class="placeholder-text">NO IMAGE</div>
       </div>`;

  const soldOverlay = isSoldOut
    ? `<div class="sold-out-overlay"><span>SOLD OUT</span></div>` : '';

  const countBadge = imgUrls.length > 1
    ? `<div class="photo-count-badge">📷 ${imgUrls.length}</div>` : '';

  const thumbsHtml = imgUrls.length > 1
    ? `<div class="gallery-thumbs">
        ${imgUrls.slice(0, 5).map((url, i) => `
          <img class="gallery-thumb lazy-img${i === 0 ? ' active' : ''}"
               data-src="${url}" src="" alt=""
               onclick="switchThumb(this,'${url}',event)">
        `).join('')}
       </div>` : '';

  const sizesHtml = sizes.length
    ? `<div class="product-sizes-label">SIZE</div>
       <div class="product-sizes">
         ${sizes.map(s => `<span class="size-chip${s.available ? '' : ' sold-out'}">${s.label}</span>`).join('')}
       </div>` : '';

  const reviewBadge = p.needs_review
    ? `<div class="needs-review-badge">NEEDS REVIEW</div>` : '';

  const priceHtml = `
    <div class="product-price-wrap">
      ${thbShip  != null ? `<div class="price-row"><span class="price-main">฿${thbShip.toLocaleString()}</span><span class="price-tag-pill">SHIP<span class="pill-sub">INC.</span></span></div>` : ''}
      ${thbCarry != null ? `<div class="price-row"><span class="price-carry">฿${thbCarry.toLocaleString()}</span><span class="price-tag-pill carry">CARRY<span class="pill-sub">BACK</span></span></div>` : ''}
      ${vnd      != null ? `<div class="price-sub ${p.price?.note ? 'vnd-est' : 'vnd-real'}">₫${vnd.toLocaleString()}${p.price?.note ? '<span class="vnd-q"> (?)</span>' : ''}</div>` : ''}
    </div>`;

  return `
    <div class="product-card${isSoldOut ? ' is-sold-out' : ''}">
      <div class="product-img-box" data-imgs="${imgsAttr}" data-pname="${p.name}" onclick="lbOpen(this)">
        ${mainImg}${soldOverlay}${countBadge}
      </div>
      ${thumbsHtml}
      <div class="product-info">
        ${reviewBadge}
        <div class="product-season">${p.tag || ''}</div>
        <div class="product-name">${p.name}</div>
        ${priceHtml}
        ${sizesHtml}
        <span class="product-tag">${p.tag || ''}</span>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   § 10.  RENDER — PRODUCT CARDS (修正過濾版)
   ═══════════════════════════════════════════════════════════════ */
function renderProducts(tag = 'all') {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  // 從我們剛剛在上面 renderBrandPage 存好的暫存區拿資料
  const allProducts = window.CURRENT_BRAND_PRODUCTS || [];

  // 根據標籤過濾 (對齊你 index.html 寫的大寫開頭標籤)
  const filtered = allProducts.filter(p => {
    if (tag === 'all') return true;
    return p.tag === tag; 
  });

  // 印出卡片
  if (filtered.length === 0) {
    grid.innerHTML = '<p style="text-align:center; padding:50px;">No items found.</p>';
  } else {
    grid.innerHTML = filtered.map(p => _buildProductCard(p)).join('');
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
    const cards = grid.querySelectorAll('.brand-card');
    cards.forEach((card, i) => {
      const brand = BRANDS[i];
      if (!brand) return;
      const style = (brand.style || '').toLowerCase();
      if (!keyword || style.includes(keyword.toLowerCase())) {
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
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();

  if (!BRANDS.length) return;   // error was already shown inside loadData()

  renderBrandsGrid();
  renderDropdown();
  observeFadeIns();
  updateTexts();
  initImgLazy();
});
