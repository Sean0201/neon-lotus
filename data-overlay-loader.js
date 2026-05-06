/* ═══════════════════════════════════════════════════════════════
 * data-overlay-loader.js
 * --------------------------------------------------------------------
 * 把 data-overlay.js 提供的 (window.DATA_OVERLAY) 在 supabase-client.js
 * 設定 window.BRANDS_DATA 之前 / 當下 merge 進去:
 *
 *   - overlay.brands[]     : 不在 Supabase 的新品牌 → 直接 push
 *   - overlay.products[]   : 不在 Supabase 的新商品 → 直接 push
 *   - overlay.size_charts  : { product_id: size_chart_obj }
 *                            針對「已存在」的商品補上 size_chart 欄位
 *
 * 必須在 supabase-client.js 之前 <script> 載入，這樣 Object.defineProperty
 * 才能攔截到 supabase-client 寫入 window.BRANDS_DATA 的那一刻。
 * --------------------------------------------------------------------
 */
(function () {
  'use strict';

  function getOverlay() {
    return window.DATA_OVERLAY || { brands: [], products: [], size_charts: {} };
  }

  /** 名稱標準化 → 與 matcher 用的 baseName 一致 */
  function baseKeys(name) {
    if (!name) return [];
    let s = String(name).toLowerCase();
    s = s.replace(/[\u2018\u2019\u02bc'`"]/g, '');
    s = s.replace(/^\s*23\s*/, '');
    if (s.includes('/')) s = s.split('/')[0];
    if (s.includes('//')) s = s.split('//')[0];
    s = s.replace(/\([^)]*\)/g, ' ');
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

  // ── 品類辨識 (與 matcher 同步) ──────────────────────────────
  // 用於「同品類 fallback」: 某商品沒有自己的尺寸圖時, 借同品牌同品類的圖
  const CAT_GROUPS = {
    tee:        ['tee','tees','tshirt','tshirts','tshirt','aotee','aothun'],
    tank:       ['tank','tanktop','singlet','sleeveless'],
    shirt:      ['shirt','shirts','aosomi','somi','flannel'],
    polo:       ['polo'],
    longsleeve: ['longsleeve'],
    hoodie:     ['hoodie','hoodies','hooded','hood','aohoodie'],
    sweater:    ['sweater','sweatshirt','sweat','jumper','knit','cardigan','crewneck'],
    jacket:     ['jacket','jackets','blazer','coat','parka','windbreaker','outer','outerwear','varsity','bomber'],
    pants:      ['pants','pant','trouser','trousers','jean','jeans','denim','aoquan','quan'],
    shorts:     ['short','shorts'],
    legging:    ['legging','leggings','tights'],
    skirt:      ['skirt','skirts','vay'],
    dress:      ['dress','dresses','maxi','midi','onepiece','dam'],
    bodysuit:   ['bodysuit','onesie'],
    set:        ['set','setbo','setup','combo'],
    cap:        ['cap','snapback','trucker'],
    beanie:     ['beanie'],
    hat:        ['hat','bucket'],
    bag:        ['bag','tote','crossbody','sling','backpack','handbag'],
    belt:       ['belt'],
    accessory:  ['pin','pins','keychain','sticker','patch','wallet','cardholder','sock','socks','glove','scarf']
  };
  const CAT_MAP = (() => {
    const m = {};
    for (const [c, syns] of Object.entries(CAT_GROUPS)) {
      for (const s of syns) m[s.toLowerCase().replace(/[^a-z0-9]/g,'')] = c;
    }
    return m;
  })();
  const NO_SIZE_CATS = new Set(['cap','beanie','hat','bag','belt','accessory']);
  function categoryOf(name) {
    if (!name) return null;
    let s = String(name).toLowerCase();
    s = s.replace(/[\u2018\u2019\u02bc'`"]/g,'').replace(/^\s*23\s*/, '');
    if (s.includes('/')) s = s.split('/')[0];
    if (s.includes('//')) s = s.split('//')[0];
    s = s.replace(/\([^)]*\)/g, ' ');
    const tokens = s.split(/[^a-z0-9]+/i).map(t => t.toLowerCase()).filter(Boolean);
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (i + 1 < tokens.length) {
        const two = tokens[i] + tokens[i+1];
        if (CAT_MAP[two]) return CAT_MAP[two];
      }
      if (CAT_MAP[tokens[i]]) return CAT_MAP[tokens[i]];
      const stem = tokens[i].replace(/(es|s)$/, '');
      if (CAT_MAP[stem]) return CAT_MAP[stem];
    }
    return null;
  }

  function merge(data) {
    if (!data || !Array.isArray(data.brands) || !Array.isArray(data.products)) return data;
    const ov = getOverlay();
    const newBrands   = ov.brands || [];
    const newProducts = ov.products || [];
    // 注意: by_id 已棄用 — Supabase product ID 會漂移 (重新發布時會洗 ID),
    //       本機 data.js 寫的 ID 對應到線上時可能是別的商品, 會把 size_chart
    //       配錯位 (e.g. 衣服顯示褲子尺寸). 改成只用 by_name (live data 名稱比較穩定)
    const byNameNested = ov.by_name || null;
    function getByName(brandId, kind /* 'size_charts'|'image_overlay' */) {
      if (byNameNested && byNameNested[brandId] && byNameNested[brandId][kind])
        return byNameNested[brandId][kind];
      return null;
    }

    // 1) 新品牌 (僅當 Supabase 沒有此 id 時加入)
    const brandIds = new Set(data.brands.map(b => b.id));
    let addedBrands = 0;
    for (const b of newBrands) {
      if (!brandIds.has(b.id)) {
        data.brands.push(b);
        brandIds.add(b.id);
        addedBrands++;
      }
    }

    // 1b) 品牌欄位覆寫 (修 Supabase 端拼字錯誤等問題, e.g. dirmior → DIMOIR)
    const brandOverrides = ov.brand_overrides || {};
    let overriddenBrands = 0;
    for (const b of data.brands) {
      const ovFields = brandOverrides[b.id];
      if (ovFields && typeof ovFields === 'object') {
        Object.assign(b, ovFields);
        overriddenBrands++;
      }
    }

    // 2) 新商品 (僅當 Supabase 沒有此 id 時加入)
    const productIds = new Set(data.products.map(p => p.id));
    let addedProducts = 0;
    for (const p of newProducts) {
      if (!productIds.has(p.id)) {
        data.products.push(p);
        productIds.add(p.id);
        addedProducts++;
      }
    }

    // 3) 為「既有商品」依「商品名稱」補上 size_chart 與圖片
    //    順序: exact name → same category fallback → brand default (公版) (限制同品牌、且非配件)
    const brandDefaults = ov.brand_defaults || {};
    let patchedExact = 0, patchedCat = 0, patchedDefault = 0, patchedImg = 0;
    for (const p of data.products) {
      // -- size_chart: 1) exact name --
      if (!p.size_chart) {
        const sizeMapByName = getByName(p.brand_id, 'size_charts');
        if (sizeMapByName) {
          for (const b of baseKeys(p.name)) {
            if (sizeMapByName[b]) {
              p.size_chart = sizeMapByName[b];
              patchedExact++;
              break;
            }
          }
        }
      }
      // -- size_chart: 2) same category fallback --
      if (!p.size_chart) {
        const cat = categoryOf(p.name);
        if (cat && !NO_SIZE_CATS.has(cat)) {
          const sizeMapByCat = getByName(p.brand_id, 'size_charts_by_category');
          if (sizeMapByCat && sizeMapByCat[cat]) {
            p.size_chart = sizeMapByCat[cat];
            patchedCat++;
          }
        }
      }
      // -- size_chart: 3) brand default 公版尺寸表 (僅當非配件) --
      //    優先順序: by_keyword (name contains) → by_category[<cat>] → 通用 image_url / rows
      if (!p.size_chart) {
        const cat = categoryOf(p.name);
        if (!cat || !NO_SIZE_CATS.has(cat)) {
          const bd = brandDefaults[p.brand_id];
          if (bd) {
            const nameLower = String(p.name || '').toLowerCase();
            // 1) by_keyword: 第一個符合的關鍵字 wins (順序很重要)
            let kwHit = null;
            for (const kw of (bd.by_keyword || [])) {
              if (kw.match && nameLower.includes(String(kw.match).toLowerCase())) {
                kwHit = kw;
                break;
              }
            }
            if (kwHit && (kwHit.image_url || (kwHit.rows && kwHit.rows.length))) {
              p.size_chart = {
                image_url: kwHit.image_url || '',
                source_url: kwHit.source_url || bd.source_url || '',
                headers: kwHit.headers || bd.headers || [],
                rows: kwHit.rows || bd.rows || [],
                raw_vn: kwHit.raw_vn || bd.raw_vn || ''
              };
              patchedDefault++;
            } else {
              // 2) by_category[cat]
              const byCat = (bd.by_category || {})[cat];
              if (byCat && (byCat.image_url || (byCat.rows && byCat.rows.length))) {
                p.size_chart = {
                  image_url: byCat.image_url || '',
                  source_url: byCat.source_url || bd.source_url || '',
                  headers: byCat.headers || bd.headers || [],
                  rows: byCat.rows || bd.rows || [],
                  raw_vn: byCat.raw_vn || bd.raw_vn || ''
                };
                patchedDefault++;
              } else if (bd.image_url || (bd.rows && bd.rows.length)) {
                // 3) 通用公版
                p.size_chart = bd;
                patchedDefault++;
              }
            }
          }
        }
      }

      // -- image overlay by name --
      const imageMapByName = getByName(p.brand_id, 'image_overlay');
      if (imageMapByName) {
        let ovG = null;
        for (const b of baseKeys(p.name)) {
          if (imageMapByName[b]) { ovG = imageMapByName[b]; break; }
        }
        if (ovG && ovG.length) {
          if (!p.images) p.images = { cover: '', gallery: [] };
          const cur = p.images.gallery || [];
          if (ovG.length > cur.length) {
            const seen = new Set(cur.map(g => g.url));
            const extra = ovG.filter(g => !seen.has(g.url));
            p.images.gallery = cur.concat(extra);
            patchedImg++;
          }
        }
      }
    }

    console.log(
      `[overlay] merged: +${addedBrands} brands, +${addedProducts} products, ` +
      `${overriddenBrands} brand overrides | ` +
      `size_chart: ${patchedExact} exact + ${patchedCat} by-category + ${patchedDefault} brand-default | image: ${patchedImg}`
    );
    return data;
  }

  // ── 攔截 window.BRANDS_DATA 賦值 ────────────────────────────
  // supabase-client.js 內會做 `window.BRANDS_DATA = data;`
  // 我們在那之前先把這個 property 改成 setter, merge 完再存起來
  let _real = null;
  try {
    Object.defineProperty(window, 'BRANDS_DATA', {
      configurable: true,
      get() { return _real; },
      set(v) {
        if (v && !v.__overlay_applied) {
          try { merge(v); } catch (e) { console.error('[overlay] merge failed', e); }
          v.__overlay_applied = true;
        }
        _real = v;
      },
    });
  } catch (e) {
    console.error('[overlay] Object.defineProperty failed', e);
  }

  // 有一個邊角情況: 如果 supabase-client 已經在我們之前執行 (script 順序錯誤),
  //                window.BRANDS_DATA 可能已經被設了。手動再 merge 一次。
  if (_real && !_real.__overlay_applied) {
    try { merge(_real); _real.__overlay_applied = true; }
    catch (e) { console.error('[overlay] retroactive merge failed', e); }
  }

  // 暴露 API 方便 debug
  window.DataOverlay = { merge, getOverlay };
})();
