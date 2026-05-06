# Patch 03 — `main.js` (`renderFeatured()` 重寫)

> 把硬寫的 `PREFERRED_BRANDS` 邏輯換成讀 `window.FEATURED_DATA`。
> 後台沒設資料時,自動 fallback 回原本的硬寫邏輯,確保前端永遠有東西可顯示。

---

## 改動位置 — 替換 `renderFeatured()` 整個函式

`main.js` 第 622–684 行是現有的 `renderFeatured()`。

把那一整段 **完全替換** 成下面這個新版本:

```js
function renderFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid || !BRANDS.length) return;

  const featured = window.FEATURED_DATA || [];
  const picks = [];
  const seenBrands = new Set();
  const seenProducts = new Set();

  // ─── Tier 1:後台 admin 設定的 featured_products 資料 ────────────────
  for (const f of featured) {
    if (!f.is_active) continue;
    const brand = BRANDS.find(b => b.id === f.brand_id);
    if (!brand) continue;
    const product = (brand.products || []).find(p => p.id === f.product_id);
    if (!product) continue;
    if (seenProducts.has(product.id)) continue;
    picks.push({ brand, product });
    seenBrands.add(brand.id);
    seenProducts.add(product.id);
  }

  // ─── Tier 2(fallback):後台沒設,沿用原本的優先品牌自動挑 ──────────
  if (!picks.length) {
    const PREFERRED_BRANDS = ['ceci','dirtycoins','levents','hades','swe',
      'firefly','sly','badrabbit','stressmama','fragile','rich',
      'poison-fang','aesirstudio','latui-atelier'];
    for (const bid of PREFERRED_BRANDS) {
      if (picks.length >= 8) break;
      const brand = BRANDS.find(b => b.id === bid);
      if (!brand || !brand.products?.length) continue;
      const product = brand.products.find(p =>
        p.price?.twd_carryback &&
        ((p.images?.gallery?.[0]?.original_url) || (p.original_cover_url) || (p.images?.cover))
      );
      if (product && !seenBrands.has(bid)) {
        picks.push({ brand, product });
        seenBrands.add(bid);
      }
    }
    // 還沒滿 8 個就從其他品牌補
    if (picks.length < 8) {
      for (const brand of BRANDS) {
        if (picks.length >= 8) break;
        if (seenBrands.has(brand.id) || !brand.products?.length) continue;
        const product = brand.products.find(p =>
          p.price?.twd_carryback &&
          ((p.images?.gallery?.[0]?.original_url) || (p.original_cover_url) || (p.images?.cover))
        );
        if (product) {
          picks.push({ brand, product });
          seenBrands.add(brand.id);
        }
      }
    }
  }

  if (!picks.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:40px">Loading featured products…</p>';
    return;
  }

  grid.innerHTML = picks.map(({ brand, product: p }) => {
    const cover = (p.images?.gallery?.[0]?.original_url) || p.original_cover_url || p.images?.cover || '';
    const safeName = (p.name || '').replace(/'/g, "&#39;").replace(/"/g, "&quot;");
    const ship  = p.price?.twd_shipping;
    const carry = p.price?.twd_carryback;
    return `
      <div class="featured-card" onclick="showPage('brand','${brand.id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter')showPage('brand','${brand.id}')">
        <img class="featured-card-img" src="${cover}" alt="${safeName}" loading="lazy" onerror="this.style.background='linear-gradient(135deg,#1a0520,#16141e)';this.style.opacity=0.4">
        <div class="featured-card-info">
          <p class="featured-brand">${brand.name || brand.id}</p>
          <p class="featured-name">${safeName}</p>
          <div class="featured-price">
            ${ship  != null ? `<div class="featured-price-row"><span class="label" data-en="SHIPPING" data-tw="國際送">國際送</span><span class="amount">NT$ ${ship.toLocaleString()}</span></div>` : ''}
            ${carry != null ? `<div class="featured-price-row"><span class="label" data-en="CARRY-BACK" data-tw="親自帶">親自帶</span><span class="amount carry">NT$ ${carry.toLocaleString()}</span></div>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}
```

---

## 升 `<script>` 引用版本

`index.html` 底部對 `main.js` 的引用 bump:

```html
<script src="main.js?v=51"></script>
```
改成:
```html
<script src="main.js?v=52"></script>
```

---

## 邏輯說明

- **Tier 1**:讀 `window.FEATURED_DATA`(由 `supabase-client.js` 從 Supabase 抓的 `featured_products` 表),這是後台可控的精選清單,順序依 `sort_order`。
- **Tier 2 fallback**:後台空無資料、或抓資料失敗時,沿用原本寫死的 `PREFERRED_BRANDS` 自動挑,確保前端不會出現空白區塊。
- 後台填滿 8 個 → 顯示 8 張卡。
- 後台填 3 個 → **只顯示 3 張卡**(不會混入 fallback 的 5 張),這樣 admin 完全控制版面。
- 後台 0 個 → fallback 走 PREFERRED_BRANDS 自動挑滿 8 張。

---

## 完成後驗收

1. 打開網站首頁,「本週精選」區塊應該還是看到 8 張卡(因為後台還沒設資料,走 fallback)。
2. 進 admin 加一筆 featured,F5 重整網站首頁,該商品應該出現在「本週精選」第 1 個位置。
