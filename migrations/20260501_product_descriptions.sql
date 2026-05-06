-- ============================================================================
-- NEON LOTUS TW — 商品多語描述欄位 (中文 + 英文)
-- File:    migrations/20260501_product_descriptions.sql
-- Date:    2026-05-01
-- Purpose: 在 products 表新增中、英兩個語系的描述欄位。
--          此站 (TW) 不需要泰文;泰文版屬於另一個站,後續再單獨處理。
-- ============================================================================

alter table public.products
  add column if not exists description_zh text,
  add column if not exists description_en text;

-- 確認:
select 'products multilingual description columns added (zh, en) ✓' as status;
