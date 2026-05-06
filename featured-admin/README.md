# Featured Products Admin — 一步步部署指南

這個資料夾裡有實作「本週精選」後台管理功能的所有檔案。
**照著下面的順序逐步執行,大約 30 分鐘可全部完成。**

---

## 📁 檔案總覽

```
featured-admin/
├── README.md                                 ← 你正在看的這份
├── migrations/
│   └── 20260430_featured_products.sql        ← Step 1 用
├── patches/
│   ├── 01_admin_html.md                      ← Step 2 用
│   ├── 02_supabase_client.md                 ← Step 3 用
│   ├── 03_main_js.md                         ← Step 4 用
│   └── 04_index_html_remove_subline.md       ← Step 5 用
└── scripts/
    └── verify_featured_setup.js              ← Step 6 用
```

---

## ✅ Step 1 — Supabase 建表(5 分鐘)

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選 NEON LOTUS 的 project
3. 左側選 **SQL Editor** → New query
4. 打開 `featured-admin/migrations/20260430_featured_products.sql`,**複製整份內容貼到 SQL Editor**
5. 點右下 **Run**
6. 看到 `featured_products migration applied ✓` 即成功

驗證:左側 **Table Editor** → 找到新表 `featured_products`(空表)。

---

## ✅ Step 2 — admin.html 加入後台 UI(10 分鐘)

打開 `featured-admin/patches/01_admin_html.md`,**裡面有 7 個片段(A~G)需要逐個貼到 admin.html 對應位置**:

- 片段 A — 左側 nav(行 904 附近)
- 片段 B — 列表頁區塊(行 1077 附近)
- 片段 C — 編輯 modal(行 1515 附近)
- 片段 D — 全域變數(行 1540 附近)
- 片段 E — Router 註冊(行 1634 附近)
- 片段 F — 頁面標題對照(行 1644 附近)
- 片段 G — 全套 JS 邏輯(行 2380 附近,banner section 結尾後)

**全部貼完之後**,本機開啟 `admin.html`,左側應該看到「★ Featured Products」。
點進去顯示空表格。

---

## ✅ Step 3 — supabase-client.js 加入抓資料邏輯(5 分鐘)

打開 `featured-admin/patches/02_supabase_client.md`,**裡面有 5 個改動**:

- 改動 1 — 加 `featuredP` 查詢
- 改動 2 — 寫進 cache payload
- 改動 3 — 寫進 `window.FEATURED_DATA`
- 改動 4 — bump cache 版本(`v3` → `v4`)
- 改動 5 — bump `<script>` 引用版本

**完成後**:F12 console 輸入 `window.FEATURED_DATA` 應回傳空陣列。

---

## ✅ Step 4 — main.js 重寫 renderFeatured(5 分鐘)

打開 `featured-admin/patches/03_main_js.md`,**把 `main.js` 第 622–684 行整個替換**為新版函式。

- 同時 bump `<script src="main.js?v=51">` 為 `?v=52`

**完成後**:首頁「本週精選」應該還是顯示 8 張卡(走 fallback 邏輯)。

---

## ✅ Step 5 — index.html 刪除副標(1 分鐘)

照 `featured-admin/patches/04_index_html_remove_subline.md` 的方法 A 或 B 操作。

最快是直接在專案根目錄跑:
```bash
sed -i '' '/<p class="featured-sub"/d' index.html
grep -n featured-sub index.html
```
第二行應沒有任何輸出。

---

## ✅ Step 6 — 部署上線(2 分鐘)

```bash
cd /path/to/neon-lotus-tw
git status                   # 應看到 4 個檔被修改: admin.html, supabase-client.js, main.js, index.html
git add admin.html supabase-client.js main.js index.html
git commit -m "feat: featured products admin (CMS-driven, with fallback)"
git push origin main
```
Vercel 自動部署,約 1 分鐘上線。

---

## ✅ Step 7 — 驗證 Supabase 端(可選,1 分鐘)

```bash
cd /path/to/neon-lotus-tw
node featured-admin/scripts/verify_featured_setup.js
```
(先把腳本最上方的 SUPABASE_URL / SUPABASE_ANON_KEY 換成你的)

預期輸出:
```
▶ Verifying featured_products setup…

✓ featured_products 表可讀,共 0 筆 active 資料

✓ featured_products 設定看起來都正常 ✨
```

---

## ✅ Step 8 — 在後台選你想精選的商品

1. 打開 `<your-domain>/admin.html`
2. 左側 nav 點「★ Featured Products」
3. 點右上「+ Add Featured」
4. 選品牌 → 選商品 → 設 Sort Order(0=最前) → Save
5. 重複第 4 步加滿 8 個(或想要的數量)
6. 重整網站首頁,「本週精選」就會顯示你選的商品

---

## 🔧 Troubleshooting

| 症狀 | 可能原因 | 解法 |
|---|---|---|
| 後台點 + Add 沒反應 | JS 還沒貼完整 | 檢查 patch 01 的片段 G 是否貼了 |
| 後台儲存失敗 401 | RLS 政策不對 | 重跑 SQL migration 確保 4 個 policy 都建立 |
| 後台儲存失敗 23505 | 同一商品被加兩次 | schema 設了 `unique(product_id)`,改 edit 那筆 |
| 前端看不到變更 | 瀏覽器 cache | `Ctrl+Shift+R` 強制重整 |
| 前端 console 沒 FEATURED_DATA | client 沒重新載入 | 確認 `?v=4` cache bust 有改到 |
| 前端只顯示 fallback 商品 | 資料表是空的或全 inactive | 後台至少要加 1 筆 active 才會走 Tier 1 |

---

## 📋 完整驗收清單

- [ ] Supabase `featured_products` 表存在
- [ ] RLS 4 個 policies 都存在(SELECT × 2 + INSERT/UPDATE/DELETE × 3)
- [ ] admin.html 左側看到 ★ Featured Products
- [ ] admin.html 列表頁顯示
- [ ] admin.html 點 + Add → modal 開啟,品牌/商品下拉可運作
- [ ] admin.html 儲存後列表立即更新
- [ ] admin.html toggle is_active 立即生效
- [ ] admin.html 拖曳排序可運作
- [ ] 前端 `window.FEATURED_DATA` 是陣列
- [ ] 前端「本週精選」標題下面**沒有**副標文字
- [ ] 後台清空時,前端走 fallback 顯示 8 張卡
- [ ] 後台加 1 筆 active 時,前端**只**顯示那 1 張卡

---

## 🎁 之後想擴充的方向(看你需要)

- 為精選卡片新增「主打」「限量」等小標籤
- 拆成多組 group(本週精選 / 設計師之選 / 新品上市)
- 加排程上下架(`start_at` / `end_at` 欄位)
- 加 admin 統計:每個精選商品的曝光、點擊次數

— 完 —
