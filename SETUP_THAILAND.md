# NEON LOTUS Thailand — Setup & Deployment Guide

## 一、Supabase 建立指引

### 1.1 建立 Supabase Project
1. 前往 https://app.supabase.com → New project
2. **Name**: `neon-lotus-th`
3. **Region**: 選 **Southeast Asia (Singapore)** 或 **Asia Pacific (Tokyo)** — 對泰國延遲最低
4. **Database password**: 記錄保存
5. **Pricing plan**: Free 即可 (上線後再升級 Pro)

### 1.2 取得 API Keys
建好 project 後,到 **Settings → API**:
- 複製 **Project URL** (像 `https://xxxxxxxx.supabase.co`)
- 複製 **anon public** key (給前端用)
- 複製 **service_role** key (給 build/scripts 用,**不要**外洩!)

### 1.3 建立資料表 (Tables)
從 TW 站複製 schema。在 Supabase **SQL Editor** 執行以下指令來建立所有 tables:

```sql
-- BRANDS
create table brands (
  id text primary key,
  name text not null,
  style text,
  color_hex text default '#0a0a1a',
  logo_url text,
  cover_url text,
  description_en text,
  description_th text,
  category text,
  website text,
  founded text,
  location text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- PRODUCTS
create table products (
  id text primary key,
  brand_id text references brands(id) on delete cascade,
  name text not null,
  tag text,
  category text,
  season text,
  price_vnd numeric,
  price_vnd_estimated numeric,
  price_thb_shipping numeric,
  price_thb_carryback numeric,
  price_note text,
  cover_image text,
  original_cover_url text,
  description_en text,
  description_th text,
  sold_out boolean default false,
  needs_review boolean default false,
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- PRODUCT_GALLERY
create table product_gallery (
  id bigserial primary key,
  product_id text references products(id) on delete cascade,
  type text default 'image',
  url text not null,
  original_url text,
  sort_order int default 0
);

-- PRODUCT_SIZES
create table product_sizes (
  id bigserial primary key,
  product_id text references products(id) on delete cascade,
  label text not null,
  available boolean default true,
  sort_order int default 0
);

-- BANNERS (首頁輪播)
create table banners (
  id bigserial primary key,
  title text,
  subtitle text,
  image_url text,
  mobile_image_url text,
  brand_id text,
  link_url text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- FEATURED_PRODUCTS
create table featured_products (
  id bigserial primary key,
  product_id text references products(id) on delete cascade,
  brand_id text,
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- SITE_SETTINGS (key-value config)
create table site_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);

-- ORDERS (Manual checkout)
create table orders (
  id bigserial primary key,
  order_no text unique,
  status text default 'pending',  -- pending | confirmed | shipped | completed | cancelled
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_line text,
  delivery_address text,
  notes text,
  items jsonb,           -- [{product_id, brand_id, name, size, unit_price, quantity, shipping_method}]
  subtotal numeric,
  shipping_fee numeric default 0,
  total numeric,
  payment_method text default 'manual',
  created_at timestamptz default now()
);

-- HUNT_REQUESTS (代尋委託)
create table hunt_requests (
  id bigserial primary key,
  target text not null,
  ref_url text,
  vnd_price numeric,
  category text,
  contact text not null,
  notes text,
  images jsonb,          -- array of uploaded URLs
  status text default 'new',
  created_at timestamptz default now()
);
```

### 1.4 也跑 migrations

⚠️ **注意:** Supabase 的線上 SQL Editor **不支援** psql 的 `\i` 指令。
請直接把下面的 SQL 內容**整段複製貼上** Supabase SQL Editor 後執行。

#### Migration 1 — 商品多語描述欄位
> 說明:section 1.3 的 `CREATE TABLE products` 已經包含 `description_en` / `description_th` 欄位,
> 所以這個 migration **可以跳過**。如果你之前已經建好 products table 但沒有這兩欄,才需要跑下面這段:

```sql
alter table public.products
  add column if not exists description_en text,
  add column if not exists description_th text;

select 'products multilingual description columns added (en, th) ✓' as status;
```

#### Migration 2 — 獵物雷達 圖片附件 Storage bucket (**必跑**)

```sql
-- 1) Bucket 本體 (public read,5MB,允許常見圖片類型)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hunt-uploads',
  'hunt-uploads',
  true,
  5242880,                                                      -- 5 MB
  array['image/jpeg','image/png','image/webp','image/gif','image/heic']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) RLS policies (匿名訪客可寫入,任何人可讀取)
--    storage.objects 已經 enable RLS,只需要新增 policy
drop policy if exists "anon_upload_hunt_uploads" on storage.objects;
create policy "anon_upload_hunt_uploads"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'hunt-uploads');

drop policy if exists "public_read_hunt_uploads" on storage.objects;
create policy "public_read_hunt_uploads"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'hunt-uploads');

-- 3) 確認
select 'hunt-uploads bucket + RLS applied ✓' as status;
```

> 跑完後在 **Storage** 頁籤應該能看到 `hunt-uploads` bucket。
> 如果你比較喜歡圖形界面建,可以用 1.5 的方式。

### 1.6 RLS Policies (Row Level Security)
每個 table 啟用 RLS,然後加 policy:

```sql
-- 讓任何人 (anon) 可讀 brands / products / banners / featured / settings / sizes / gallery
alter table brands enable row level security;
create policy "public read" on brands for select using (true);

alter table products enable row level security;
create policy "public read" on products for select using (is_active = true);

alter table product_gallery enable row level security;
create policy "public read" on product_gallery for select using (true);

alter table product_sizes enable row level security;
create policy "public read" on product_sizes for select using (true);

alter table banners enable row level security;
create policy "public read" on banners for select using (is_active = true);

alter table featured_products enable row level security;
create policy "public read" on featured_products for select using (is_active = true);

alter table site_settings enable row level security;
create policy "public read" on site_settings for select using (true);

-- Orders: anon 可寫 (從 cart.js 提交), 但只能讀自己的 (透過 order_no + email)
alter table orders enable row level security;
create policy "anon insert" on orders for insert with check (true);
-- (admin 用 service_role 全權, 不需要額外 policy)

-- hunt_requests: anon 可寫
alter table hunt_requests enable row level security;
create policy "anon insert" on hunt_requests for insert with check (true);
```

---

## 二、本地端設定

### 2.1 編輯 `supabase-client.js` 的兩行
打開 `supabase-client.js`,把這兩行替換成你剛複製的 keys:
```javascript
const SUPABASE_URL  = 'YOUR_TH_SUPABASE_URL';        // ← 改這行
const SUPABASE_ANON = 'YOUR_TH_SUPABASE_ANON_KEY';   // ← 改這行
```

### 2.2 本地測試 (可選)
```bash
cd web/neon-lotus
npm install
# 啟動本機伺服器
python3 -m http.server 8080
# 開啟 http://localhost:8080
```

---

## 三、Vercel 部署

### 3.1 連接 GitHub repo
1. https://vercel.com → New Project
2. Import `web/neon-lotus` (或先 push 到 GitHub)
3. **Root directory**: `web/neon-lotus` (如果你的 monorepo 是這個結構)
4. **Framework Preset**: Other
5. Build command 從 `vercel.json` 自動讀取

### 3.2 環境變數 (Environment Variables)
在 Vercel 專案 **Settings → Environment Variables** 加入:

| Key | Value | 用途 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | (Supabase Project URL) | scripts/generate-data.js |
| `SUPABASE_SERVICE_ROLE_KEY` | (Supabase service_role key) | scripts/generate-data.js |
| `SUPABASE_ANON_KEY` | (Supabase anon key) | api/hunt.js, api/notify-order.js |
| `SUPABASE_HUNT_BUCKET` | `hunt-uploads` | api/hunt.js |
| `LINE_CHANNEL_ACCESS_TOKEN` | (你的泰國 LINE OA token) | api/notify-order.js |
| `LINE_NOTIFY_TARGET_USER_ID` | (你的 LINE userId) | api/notify-order.js |
| `GEMINI_API_KEY` | (Google AI Studio key) | api/tryon.js |

### 3.3 自訂 Domain
**Settings → Domains** → 加 `neonlotus-th.com` 跟 `www.neonlotus-th.com`

---

## 四、上線前最後檢查

### 必做
- [ ] 在 admin.html 用 Supabase service_role key 登入,新增 1-2 個測試品牌、測試商品
- [ ] 主站 `/` 可正常顯示品牌和商品
- [ ] 用手機開,語言切換 (EN / TH) 正常運作
- [ ] 提交一個測試訂單到 `orders` table
- [ ] 提交一個測試 Hunt 委託到 `hunt_requests` table
- [ ] LINE OA 收到 notify 訊息

### 已知待人工潤稿項目 (TODO)
索引 `index.html` 中,以下 About / Brand Story / Shopping Guide 段落保留泰文機器翻譯,**建議由泰文母語者潤稿**:
- About 頁面 4 個故事區塊 (純粹真我 / 極致策展 / 文化連結 / 跟我們聊聊)
- Hero subtitle 詳細描述
- Hunt section 的免責聲明
- Footer copyright 文案
- Shopping guide 的詳細條款

`cart.js` 中所有 UI 文字目前是英文,**建議**之後加上泰文版本(類似 index.html 用 `data-th=` 屬性)。

`admin.html` 大部分已英文化,但內部 dev comments 仍保留中文 (僅給 Sean 看,不會影響使用者體驗)。

---

## 五、付款 / 物流接通 (上線後)

當你準備接通泰國金流:
- **Omise** (推薦,泰國本地最大): https://www.omise.co/
- **2C2P**: https://www.2c2p.com/
- **Stripe**: 支援泰國 THB

物流:
- **Thailand Post**
- **Kerry Express**
- **Flash Express**
- **J&T Express**

接通方式類似現在 ECPay 的架構,只要把 `cart.js` 中註解掉的 ECPay 程式碼換成新的金流 SDK 即可。
