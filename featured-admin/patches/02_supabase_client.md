# Patch 02 — `supabase-client.js`

> 讓前端載入網站時也順便抓 `featured_products`,塞進 `window.FEATURED_DATA`。
> 完全比照 `BANNERS_DATA` 的處理方式。

---

## 改動位置 1 — 在批次 fetch 處新增一支查詢

找到目前批次 fetch banners + settings 的地方(約在檔案中段,類似這樣的程式):

```js
// ...
const bannersP  = sb.from('banners').select('*').eq('is_active', true).order('sort_order', { ascending: true });
const settingsP = sb.from('site_settings').select('*');
// ...
```

在它們**下面**新增一支:

```js
const featuredP = sb.from('featured_products')
  .select('id, product_id, brand_id, is_active, sort_order')
  .eq('is_active', true)
  .order('sort_order', { ascending: true });
```

接著 `Promise.all` 那一段把它一起 await 進去。例如原本:

```js
const [brandsRes, productsRes, bannersRes, settingsRes] =
  await Promise.all([brandsP, productsP, bannersP, settingsP]);
```

改成:

```js
const [brandsRes, productsRes, bannersRes, settingsRes, featuredRes] =
  await Promise.all([brandsP, productsP, bannersP, settingsP, featuredP]);
```

---

## 改動位置 2 — 把資料寫進 cache payload

找到把資料整理進 `data` 物件、再寫到 localStorage 的地方,類似:

```js
const data = {
  brands:   brandsData,
  products: productsData,
  banners:  bannersData,
  settings: settings,
  ts: Date.now()
};
```

改成:

```js
const data = {
  brands:   brandsData,
  products: productsData,
  banners:  bannersData,
  featured: featuredRes.data || [],
  settings: settings,
  ts: Date.now()
};
```

---

## 改動位置 3 — 把資料寫進 window 全域

在現有的這兩行下面(約 73、181 行附近):
```js
window.BANNERS_DATA  = data.banners  || [];
```

新增一行:
```js
window.FEATURED_DATA = data.featured || [];
```

兩個地方都要加(cache 命中分支 + cache miss 分支)。

---

## 改動位置 4 — 升 cache 版本(很重要)

檔案最上方應該有一個 cache key 常數,像:

```js
const CACHE_KEY     = 'neonlotus_data_v3';
const CACHE_VERSION = 3;
```

把版本號 +1,例如改成:

```js
const CACHE_KEY     = 'neonlotus_data_v4';
const CACHE_VERSION = 4;
```

這樣老用戶的瀏覽器就會強制重抓,確保新加的 `featured` 欄位有寫進 cache。

---

## 改動位置 5 — 升 `<script>` 引用版本

`index.html` 底部對 `supabase-client.js` 的引用要 bump:

```html
<script src="supabase-client.js?v=3"></script>
```
改成:
```html
<script src="supabase-client.js?v=4"></script>
```

---

## 完成後驗收

打開網站、F12 開 console,輸入:
```js
window.FEATURED_DATA
```
應該回傳一個陣列(暫時是空的,因為後台還沒有資料)。
