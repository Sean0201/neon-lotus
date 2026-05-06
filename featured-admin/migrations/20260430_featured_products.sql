-- ============================================================================
-- NEON LOTUS TW — Featured Products admin migration
-- File:  migrations/20260430_featured_products.sql
-- Date:  2026-04-30
-- Purpose: 新增「本週精選」後台管理用的資料表
-- ============================================================================

-- 1) 主表
-- 注意: products.id 與 brands.id 在這個 schema 是 text(例如 'ceci'),不是 uuid。
-- 因此 product_id / brand_id 用 text 才能對得上 FK。
create table if not exists public.featured_products (
  id           uuid primary key default gen_random_uuid(),
  product_id   text not null references public.products(id) on delete cascade,
  brand_id     text not null references public.brands(id)   on delete cascade,
  is_active    boolean not null default true,
  sort_order   int     not null default 0,
  created_at   timestamptz not null default now(),
  unique (product_id)            -- 同一商品只能被精選一次
);

-- 2) 索引(前端依 is_active + sort_order 查詢)
create index if not exists featured_products_active_sort_idx
  on public.featured_products (is_active, sort_order);

create index if not exists featured_products_brand_idx
  on public.featured_products (brand_id);

-- 3) Row Level Security
alter table public.featured_products enable row level security;

-- 公開讀(網站前端用 anon key,只看 active 的)
drop policy if exists "featured_products_public_read" on public.featured_products;
create policy "featured_products_public_read"
  on public.featured_products for select
  to anon, authenticated
  using (is_active = true);

-- Admin 全權讀(後台需看到 inactive 的也能管理)
drop policy if exists "featured_products_admin_read_all" on public.featured_products;
create policy "featured_products_admin_read_all"
  on public.featured_products for select
  to authenticated
  using (true);

-- Admin 寫入
drop policy if exists "featured_products_admin_write" on public.featured_products;
create policy "featured_products_admin_write"
  on public.featured_products for insert
  to authenticated
  with check (true);

drop policy if exists "featured_products_admin_update" on public.featured_products;
create policy "featured_products_admin_update"
  on public.featured_products for update
  to authenticated
  using (true) with check (true);

drop policy if exists "featured_products_admin_delete" on public.featured_products;
create policy "featured_products_admin_delete"
  on public.featured_products for delete
  to authenticated
  using (true);

-- 4) 確認
select 'featured_products migration applied ✓' as status;
