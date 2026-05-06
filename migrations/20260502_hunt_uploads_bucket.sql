-- ============================================================================
-- NEON LOTUS TW — 獵物雷達 圖片附件 Storage bucket
-- File:    migrations/20260502_hunt_uploads_bucket.sql
-- Date:    2026-05-02
-- Purpose: 讓首頁「獵物雷達」表單的訪客能上傳圖片(無需登入)。
--          公開讀,匿名寫入,5MB 上限,只允許圖片 MIME。
-- ============================================================================

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
