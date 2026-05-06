# Featured Products Admin — 技術規格文件

> 目標:讓「本週精選」(Home → Featured Products) 的 8 張商品卡片可以從
> `admin.html` 後台勾選/排序/上下架,**完全比照現有 banner 的架構**。
> 同時要求把 `index.html` 第 1885 行的副標 `<p>` 移除。

---

## 一、現況快照(我從程式碼讀到的)

### 1. 前端目前怎麼出 Featured

`main.js` 的 `renderFeatured()` (第 622–684 行) 目前是**硬寫死的優先名單**:

```js
const PREFERRED_BRANDS = ['ceci','dirtycoins','levents','hades','swe',
  'firefly','sly','badrabbit','stressmama','fragile','rich',
  'poison-fang','aesirstudio','latui-atelier'];
```

按陣列順序逐個品牌挑「第一個有 TWD 價格 + 圖片」的商品,挑滿 8 個。
這個邏輯**整段要改寫**,改成讀 Supabase 的新資料表。

### 2. 現有 banner 的全套運作(就是要 mirror 的 pattern)

| 位置 | 角色 |
|---|---|
| Supabase `banners` table | 後台寫入 / 前端讀取 的 source of truth |
| `admin.html:1055-1077` | banners 列表頁 (拖曳排序、is_active toggle) |
| `admin.html:1430-1515` | banner 編輯 modal (標題、副標、桌面/手機圖、連結品牌、is_active、sort_order) |
| `admin.html:2270-2316` | `loadBanners()` + `renderBannersTable()` 讀 Supabase 渲染表格 |
| `admin.html:2333-2342` | "+ Add Banner" 按鈕,開 modal |
| `admin.html:2344-2374` | `editBanner()` / `closeBannerModal()` |
| `supabase-client.js:73,181` | 把資料塞進 `window.BANNERS_DATA` |
| `main.js:1214-1316` | 前端 `mountBanners()` 讀 `window.BANNERS_DATA` 渲染 |

新功能就照這個拓撲再做一份,只是 "banner" 換成 "featured"。

---

## 二、規格總覽

### 2-1. Supabase 資料表 schema

新增資料表 `featured_products`:

```sql
create table public.featured_products (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  brand_id     uuid not null references public.brands(id)   on delete cascade,
  is_active    boolean not null default true,
  sort_order   int     not null default 0,
  created_at   timestamptz not null default now()
);

create index featured_products_active_sort
  on public.featured_products (is_active, sort_order);

-- RLS:跟 banners 同款
alter table public.featured_products enable row level security;

-- 公開讀(網站前端用 anon key)
create policy "featured_products_public_read"
  on public.featured_products for select
  to anon, authenticated
  using (is_active = true);

-- 後台寫(用 service_role 或登入 admin 的角色)
create policy "featured_products_admin_write"
  on public.featured_products for all
  to authenticated
  using (true) with check (true);
```

> **為什麼存 `brand_id` 而非用 join**:跟 banner 的 `brand_id` 直存策略
> 一致,前端讀完一次就能渲染,省一次 join。

### 2-2. 後台 admin.html 變更

#### (a) 左側 nav 新增條目
仿 `admin.html:904` 的 banner nav-item,新增:

```html
<div class="nav-item" data-page="featured">
  <span class="nav-icon">★</span>
  <span>Featured Products</span>
</div>
```

#### (b) 新增 Featured 頁面區塊
仿 `admin.html:1055-1077` 的 banners table 區塊。欄位建議:

| 欄 | 欄位 | 內容 |
|--:|---|---|
| 1 | (drag handle) | `⋮` |
| 2 | Cover | 商品封面縮圖 |
| 3 | Brand | 品牌名 |
| 4 | Product | 商品名 |
| 5 | TWD 親自帶 | 顯示 `price.twd_carryback` |
| 6 | TWD 國際送 | 顯示 `price.twd_shipping` |
| 7 | Active | toggle switch |
| 8 | Sort | 數字 |
| 9 | Actions | ✏️ / 🗑️ |

#### (c) 新增 Add/Edit Featured Modal
**關鍵差異**:不像 banner 是手填欄位,Featured 是「**從現有商品中選**」。
modal 結構:

```html
<div id="featuredModal" class="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <h2 id="featuredModalTitle">Add Featured</h2>
      <button class="modal-close" onclick="closeFeaturedModal()">×</button>
    </div>
    <form id="featuredForm">
      <!-- Step 1: 選品牌 -->
      <label>Brand</label>
      <select id="featuredBrandId" required>
        <option value="">— 選擇品牌 —</option>
        <!-- populateFeaturedBrandSelect() 注入 -->
      </select>

      <!-- Step 2: 選商品(依品牌過濾) -->
      <label>Product</label>
      <select id="featuredProductId" required disabled>
        <option value="">— 先選擇品牌 —</option>
      </select>

      <!-- Step 3: 預覽 -->
      <div id="featuredPreview" class="image-preview-wrap">
        <img id="featuredPreviewImg" style="display:none">
        <div id="featuredPreviewMeta"></div>
      </div>

      <label><input type="checkbox" id="featuredActive" checked> Active</label>
      <label>Sort Order <input type="number" id="featuredSortOrder" value="0"></label>

      <div class="modal-footer">
        <button type="button" onclick="closeFeaturedModal()">Cancel</button>
        <button type="submit" class="btn-primary">Save</button>
      </div>
    </form>
  </div>
</div>
```

#### (d) admin JS 新增函式
仿 `admin.html:2270-2370` 的 banner block:

```js
let allFeatured = [];
let editingFeaturedId = null;

async function loadFeatured() {
  const { data, error } = await sb.from('featured_products')
    .select('*, products(name, images, price), brands(id, name)')
    .order('sort_order', { ascending: true });
  if (error) { showToast('Error loading featured', 'error'); return; }
  allFeatured = data || [];
  renderFeaturedTable();
}

function renderFeaturedTable() { /* 同 renderBannersTable 的格式 */ }

async function populateFeaturedBrandSelect(selectedId) {
  const sel = document.getElementById('featuredBrandId');
  const { data: brands } = await sb.from('brands').select('id, name').order('name');
  sel.innerHTML = '<option value="">— 選擇品牌 —</option>' +
    (brands||[]).map(b => `<option value="${b.id}" ${b.id===selectedId?'selected':''}>${b.name}</option>`).join('');
}

async function populateFeaturedProductSelect(brandId, selectedId) {
  const sel = document.getElementById('featuredProductId');
  if (!brandId) { sel.disabled = true; sel.innerHTML = '<option value="">— 先選擇品牌 —</option>'; return; }
  const { data: products } = await sb.from('products')
    .select('id, name, price').eq('brand_id', brandId).order('name');
  sel.disabled = false;
  sel.innerHTML = '<option value="">— 選擇商品 —</option>' +
    (products||[]).map(p => {
      const carry = p.price?.twd_carryback ? `NT$${p.price.twd_carryback}` : '';
      return `<option value="${p.id}" ${p.id===selectedId?'selected':''}>${p.name} ${carry}</option>`;
    }).join('');
}

document.getElementById('featuredBrandId').addEventListener('change', e => {
  populateFeaturedProductSelect(e.target.value, '');
});

document.getElementById('featuredForm').addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    brand_id:   document.getElementById('featuredBrandId').value,
    product_id: document.getElementById('featuredProductId').value,
    is_active:  document.getElementById('featuredActive').checked,
    sort_order: +document.getElementById('featuredSortOrder').value || 0,
  };
  if (editingFeaturedId) {
    await sb.from('featured_products').update(payload).eq('id', editingFeaturedId);
  } else {
    await sb.from('featured_products').insert(payload);
  }
  closeFeaturedModal();
  loadFeatured();
});

async function deleteFeatured(id) { /* 同 deleteBanner */ }
async function updateFeaturedActive(id, val) { /* 同 updateBannerActive */ }
```

#### (e) router 註冊
在 `admin.html` 路由切換的 `else if (page === ...)` 鏈裡加:
```js
else if (page === 'featured') loadFeatured();
```
頁面標題對照:
```js
'featured': 'Featured Products Management',
```

### 2-3. 前端 `supabase-client.js` 變更

新增載入邏輯,把資料塞進 `window.FEATURED_DATA`(跟 BANNERS_DATA 同款全域):

```js
// 在批次抓 brands/products/banners/settings 的地方,加一筆
const featuredP = sb.from('featured_products')
  .select('id, product_id, brand_id, is_active, sort_order')
  .eq('is_active', true)
  .order('sort_order', { ascending: true });

// ...await Promise.all 之後
window.FEATURED_DATA = (await featuredP).data || [];
```

並且把 `FEATURED_DATA` 也加到 cache payload 裡(跟 banners、settings 一樣)。

### 2-4. 前端 `main.js` — `renderFeatured()` 重寫

把第 622–684 行整段換掉。新版邏輯:

```js
function renderFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid || !BRANDS.length) return;

  const featured = window.FEATURED_DATA || [];

  // 把 featured rows 對到實際 product 物件
  const picks = [];
  for (const f of featured) {
    const brand = BRANDS.find(b => b.id === f.brand_id);
    if (!brand) continue;
    const product = (brand.products || []).find(p => p.id === f.product_id);
    if (!product) continue;
    picks.push({ brand, product });
  }

  // 後台還沒設或都被刪光時的 fallback:沿用舊的 PREFERRED_BRANDS 邏輯
  if (!picks.length) {
    // ...保留原本的 PREFERRED_BRANDS 自動挑邏輯當 fallback...
  }

  if (!picks.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:40px">尚未設定精選商品</p>';
    return;
  }

  // 渲染 (跟原本第 666–683 行相同的卡片 HTML)
  grid.innerHTML = picks.map(({ brand, product: p }) => { /* ... */ }).join('');
}
```

### 2-5. `index.html` 變更

#### (a) 刪除第 1885 行(副標 `<p>`)
刪除整行:
```html
<p class="featured-sub" data-en="Hand-picked products with TWD prices — what you'll see at checkout." data-tw="精選新品,直接顯示新台幣售價,讓你下單前一目了然。">精選新品,直接顯示新台幣售價,讓你下單前一目了然。</p>
```

留下的標題 `本週精選` (第 1884 行) 之後就直接接 grid。

#### (b)(Optional) bump cache version
若改了 main.js 與 supabase-client.js,把 `index.html` 底部的引用版本號各加一:
```html
<script src="supabase-client.js?v=4"></script>
...
<script src="main.js?v=52"></script>
```

---

## 三、部署步驟總覽

1. **Supabase**:在 SQL editor 執行第 2-1 節的 `create table` + RLS 政策。
2. **admin.html**:套用第 2-2 節的 (a)~(e) 五段變更。
3. **supabase-client.js**:套用第 2-3 節的 fetch + cache 變更。
4. **main.js**:套用第 2-4 節的 `renderFeatured()` 重寫。
5. **index.html**:刪第 1885 行,bump cache version。
6. **git commit & push**:Vercel 自動部署。
7. **進 admin → Featured Products**:點 + Add Featured,選品牌、選商品、儲存。前端 reload 即可看到。

---

## 四、驗收清單

- [ ] admin 左側 nav 出現 ★ Featured Products
- [ ] 點 + Add Featured → 兩段式下拉(先品牌 → 後商品)
- [ ] 列表可拖曳排序、可 toggle active
- [ ] 前端首頁 `本週精選` 區塊顯示後台選的商品(順序對應 sort_order)
- [ ] 後台全部刪光 → 前端 fallback 回舊的自動挑邏輯(不會空白)
- [ ] 第 1885 行已移除,前端只剩 `本週精選` 標題接 grid
- [ ] 後台 toggle is_active off → 前端立即不再顯示該品(下次 fetch)

---

## 五、可選的進階功能(可後做)

- 在卡片上加自訂文字(例如「本週主打」「限量回購」),需要在 schema 加
  `tag_label` 欄位,modal 多一個 input。
- 改成多檔(例如「本週精選」+「設計師之選」兩個 group),schema 加
  `group_key` 欄位,前端按 group 渲染不同 section。
- 排程上下架:加 `start_at` / `end_at`,前端做時間過濾。

— end of spec —
