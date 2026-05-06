/**
 * supabase-client.js — NEON LOTUS TH
 * ─────────────────────────────────────────────────────────────────
 * PERFORMANCE-OPTIMISED architecture:
 *
 *   Initial load  → brands + products + banners + settings  (~9 requests)
 *   Brand page    → gallery + sizes for that brand only     (on demand)
 *
 * Gallery (37 000+ rows) and sizes (16 000+ rows) are NOT fetched
 * upfront. They are lazy-loaded per brand when the user navigates
 * into a brand page, then cached in memory so repeat visits are instant.
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

// 泰國 Supabase project (project ref: shwirwvnwzxtqsfkwiqj)
const SUPABASE_URL  = 'https://shwirwvnwzxtqsfkwiqj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNod2lyd3Zud3p4dHFzZmt3aXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MDUxNDAsImV4cCI6MjA5MzI4MTE0MH0.trO28s8px44CA9zEpeAygQ-XDVfgIfzlUKyyVBsoYdw';

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Constants ─────────────────────────────────────────────────
const CACHE_KEY     = 'NEON_LOTUS_TH_V4';
const CACHE_TS_KEY  = 'NEON_LOTUS_TH_V4_TS';
const CACHE_TTL     = 5 * 60 * 1000;   // 5 minutes
const PAGE_SIZE     = 1000;             // Supabase max rows per request

// ── In-memory cache for per-brand gallery + sizes ─────────────
const _brandDetailCache = {};           // { brandId: true } — already fetched

/**
 * Paginated fetch — retrieves ALL rows from a table, 1000 at a time.
 */
async function fetchAll(table, opts = {}) {
  const allRows = [];
  let from = 0;
  while (true) {
    let query = _supabase.from(table).select(opts.select || '*');
    if (opts.filter) query = opts.filter(query);
    if (opts.order)  query = query.order(opts.order);
    query = query.range(from, from + PAGE_SIZE - 1);
    const { data, error } = await query;
    if (error) throw new Error(table + ': ' + error.message);
    const rows = data || [];
    allRows.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 1 — Initial page load (fast)
   Fetches: brands, products, banners, site_settings
   Skips:   product_gallery, product_sizes  (lazy per brand)
   ═══════════════════════════════════════════════════════════════ */

async function loadSupabaseData() {
  // ── Try localStorage cache ──────────────────────────────────
  try {
    const cached   = localStorage.getItem(CACHE_KEY);
    const cachedTs = localStorage.getItem(CACHE_TS_KEY);
    if (cached && cachedTs && (Date.now() - Number(cachedTs)) < CACHE_TTL) {
      const data = JSON.parse(cached);
      if (data && data.brands && data.products) {
        console.log('[supabase-client] Using cached data (' +
          data.brands.length + ' brands, ' + data.products.length + ' products)');
        window.BRANDS_DATA   = data;
        window.BANNERS_DATA  = data.banners  || [];
        window.FEATURED_DATA = data.featured || [];
        window.SITE_SETTINGS = data.settings || {};
        // featured_products 是小表 (通常 <20 筆) 而且 admin 改完要立刻反映,
        // 所以即使 brands/products 走 5 分鐘快取,featured 還是每次拉新版。
        _refreshFeaturedFromServer();
        return;
      }
    }
  } catch (e) {
    console.warn('[supabase-client] Cache read failed:', e);
  }

  // ── Fetch core data (NO gallery, NO sizes) ──────────────────
  const t0 = performance.now();
  console.log('[supabase-client] Fetching core data from Supabase…');

  const [brands, products, banners, featured, settingsRows] = await Promise.all([
    fetchAll('brands'),
    fetchAll('products', {
      filter: q => q.eq('is_active', true),
      order: 'sort_order',
    }),
    fetchAll('banners', {
      filter: q => q.eq('is_active', true),
      order: 'sort_order',
    }),
    // featured_products may not exist yet on first deploy — swallow errors
    fetchAll('featured_products', {
      select: 'id, product_id, brand_id, is_active, sort_order',
      filter: q => q.eq('is_active', true),
      order: 'sort_order',
    }).catch(err => {
      console.warn('[supabase-client] featured_products not available:', err?.message || err);
      return [];
    }),
    fetchAll('site_settings'),
  ]);

  // ── Parse settings ──────────────────────────────────────────
  const settings = {};
  for (const row of settingsRows) settings[row.key] = row.value;

  // ── Transform brands ────────────────────────────────────────
  const brandsData = brands.map(b => ({
    id:          b.id,
    name:        b.name,
    style:       b.style || '',
    color_hex:   b.color_hex || '#0a0a1a',
    logo_url:    b.logo_url || '',
    cover_url:   b.cover_url || '',
    // 此站 (TH) 只用英文 + 泰文;中文留給 TW 站
    description: {
      en: b.description_en || '',
      th: b.description_th || '',
    },
    meta: {
      category: b.category || '',
      website:  b.website  || '',
      founded:  b.founded  || '',
      location: b.location || '',
    },
  }));

  // ── Transform products (gallery & sizes empty for now) ──────
  const productsData = products.map(p => ({
    id:       p.id,
    brand_id: p.brand_id,
    name:     p.name,
    tag:      p.tag || p.category || '',
    category: p.category || '',
    season:   p.season || '',
    price: {
      vnd:            p.price_vnd || p.price_vnd_estimated || 0,
      thb_shipping:   p.price_thb_shipping || 0,
      thb_carryback:  p.price_thb_carryback || 0,
      note:           p.price_note || '',
    },
    sizes:   [],          // lazy — filled by loadBrandDetail()
    images: {
      cover:   p.cover_image || '',
      gallery: [],        // lazy — filled by loadBrandDetail()
    },
    sold_out:           p.sold_out || false,
    needs_review:       p.needs_review || false,
    original_cover_url: p.original_cover_url || p.cover_image || '',
    // 多語描述 (migration 20260501);此站只用英文 + 泰文,中文 TW 站處理
    description: {
      en: p.description_en || '',
      th: p.description_th || '',
    },
  }));

  // ── Transform banners ───────────────────────────────────────
  const bannersData = banners.map(bn => ({
    id:        bn.id,
    title:     bn.title || '',
    subtitle:  bn.subtitle || '',
    image_url: bn.image_url || '',
    mobile_image_url: bn.mobile_image_url || '',
    brand_id:  bn.brand_id || '',
    link_url:  bn.link_url || '',
    sort_order: bn.sort_order || 0,
  }));

  // ── Transform featured products ─────────────────────────────
  const featuredData = (featured || []).map(f => ({
    id:         f.id,
    product_id: f.product_id,
    brand_id:   f.brand_id,
    is_active:  f.is_active,
    sort_order: f.sort_order || 0,
  }));

  const data = {
    brands:   brandsData,
    products: productsData,
    banners:  bannersData,
    featured: featuredData,
    settings: settings,
  };

  // ── Cache (products-only data fits in localStorage) ──────────
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch (e) {
    console.warn('[supabase-client] Cache write failed:', e);
    try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
  }

  const ms = Math.round(performance.now() - t0);
  console.log(`[supabase-client] Core load done in ${ms}ms — ` +
    `${brandsData.length} brands, ${productsData.length} products`);

  window.BRANDS_DATA   = data;
  window.BANNERS_DATA  = bannersData;
  window.FEATURED_DATA = featuredData;
  window.SITE_SETTINGS = settings;
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 2 — Lazy brand detail (gallery + sizes)
   Called by main.js when user enters a brand page.
   Fetches only the gallery & sizes for that brand's products,
   then patches window.BRANDS_DATA.products in place.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Load gallery + sizes for a specific brand.
 * Resolves immediately if already loaded.
 * @param {string} brandId
 * @returns {Promise<void>}
 */
async function loadBrandDetail(brandId) {
  if (_brandDetailCache[brandId]) return;  // already loaded

  const data = window.BRANDS_DATA;
  if (!data) return;

  // Collect product IDs for this brand
  const productIds = data.products
    .filter(p => p.brand_id === brandId)
    .map(p => p.id);

  if (!productIds.length) return;

  const t0 = performance.now();
  console.log(`[supabase-client] Loading detail for brand "${brandId}" (${productIds.length} products)…`);

  // Fetch gallery + sizes in parallel, using .in() filter on product_id
  // Supabase .in() has a URL length limit, so batch if needed
  const BATCH = 200;  // safe batch size for .in() filter
  const galleryAll = [];
  const sizesAll   = [];

  const batches = [];
  for (let i = 0; i < productIds.length; i += BATCH) {
    const chunk = productIds.slice(i, i + BATCH);
    batches.push(
      fetchAll('product_gallery', {
        filter: q => q.in('product_id', chunk),
        order: 'sort_order',
      }),
      fetchAll('product_sizes', {
        filter: q => q.in('product_id', chunk),
        order: 'sort_order',
      }),
    );
  }

  const results = await Promise.all(batches);

  // Interleaved: [gallery0, sizes0, gallery1, sizes1, ...]
  for (let i = 0; i < results.length; i += 2) {
    galleryAll.push(...results[i]);
    sizesAll.push(...results[i + 1]);
  }

  // ── lsoul URL 修補: 過期 /cache/<hash>/ thumbnail 路徑要剝掉才能載 ──
  const fixLsoul = (url) => {
    if (typeof url !== 'string' || !url.includes('lsoul.com/media/catalog/product/cache/')) return url;
    return url.replace(/\/cache\/[a-f0-9]+\//, '/');
  };

  // ── Index by product_id ─────────────────────────────────────
  const galleryByProduct = {};
  for (const g of galleryAll) {
    if (!galleryByProduct[g.product_id]) galleryByProduct[g.product_id] = [];
    galleryByProduct[g.product_id].push({
      type: g.type,
      url: brandId === 'lsoul' ? fixLsoul(g.url) : g.url,
      original_url: brandId === 'lsoul' ? fixLsoul(g.original_url || g.url) : (g.original_url || g.url),
    });
  }

  const sizesByProduct = {};
  for (const s of sizesAll) {
    if (!sizesByProduct[s.product_id]) sizesByProduct[s.product_id] = [];
    sizesByProduct[s.product_id].push({ label: s.label, available: s.available });
  }

  // ── Patch products in place ──────────────────────────────────
  for (const p of data.products) {
    if (p.brand_id !== brandId) continue;
    const g = galleryByProduct[p.id] || [];
    p.images.gallery = g;
    if (!p.images.cover && g.length) p.images.cover = g[0].url;
    p.sizes = sizesByProduct[p.id] || [];
  }

  _brandDetailCache[brandId] = true;

  const ms = Math.round(performance.now() - t0);
  console.log(`[supabase-client] Brand "${brandId}" detail loaded in ${ms}ms — ` +
    `${galleryAll.length} gallery images, ${sizesAll.length} sizes`);
}

/* ═══════════════════════════════════════════════════════════════
   Featured products — always-fresh refresh
   (brands/products 走 5 分鐘 cache,但 featured 永遠拉新版)
   ═══════════════════════════════════════════════════════════════ */
async function _refreshFeaturedFromServer() {
  try {
    const rows = await fetchAll('featured_products', {
      select: 'id, product_id, brand_id, is_active, sort_order',
      filter: q => q.eq('is_active', true),
      order: 'sort_order',
    });
    const next = (rows || []).map(f => ({
      id:         f.id,
      product_id: f.product_id,
      brand_id:   f.brand_id,
      is_active:  f.is_active,
      sort_order: f.sort_order || 0,
    }));
    const prevJson = JSON.stringify(window.FEATURED_DATA || []);
    window.FEATURED_DATA = next;

    // 同步把 cache payload 裡的 featured 也更新,
    // 這樣下次重整(就算 cache 還沒過期)也能看到最新 featured。
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached) {
        cached.featured = next;
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
      }
    } catch (_) {}

    // 如果 main.js 已經 render 過了,FEATURED_DATA 變了就重 render 一次
    if (prevJson !== JSON.stringify(next) && typeof window.renderFeatured === 'function') {
      window.renderFeatured();
    }
  } catch (err) {
    console.warn('[supabase-client] featured refresh failed:', err?.message || err);
  }
}

// Expose loadBrandDetail globally for main.js
window.loadBrandDetail = loadBrandDetail;

// ── Execute initial load ──────────────────────────────────────
loadSupabaseData().catch(err => {
  console.error('[supabase-client] Failed to load data:', err);
});
