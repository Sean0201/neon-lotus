#!/usr/bin/env node
/**
 * verify_featured_setup.js
 *
 * 驗證 Supabase 端的 featured_products 設定是否完整。
 * 用 anon key 跑 — 模擬前端網站的權限。
 *
 * 用法:
 *   1. 把下面的 SUPABASE_URL / SUPABASE_ANON_KEY 換成你的(或設環境變數)
 *   2. node featured-admin/scripts/verify_featured_setup.js
 */

const SUPABASE_URL  = process.env.SUPABASE_URL  || '<YOUR_SUPABASE_URL>';
const SUPABASE_ANON = process.env.SUPABASE_ANON || '<YOUR_ANON_KEY>';

async function req(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      ...(opts.headers || {})
    }
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await r.text()}`);
  return r.json();
}

(async () => {
  console.log('▶ Verifying featured_products setup…\n');

  // 1) 表存在 + 可讀
  let rows;
  try {
    rows = await req('featured_products?select=id,product_id,brand_id,is_active,sort_order&order=sort_order.asc');
    console.log(`✓ featured_products 表可讀,共 ${rows.length} 筆 active 資料`);
  } catch (e) {
    console.error('✗ 讀 featured_products 失敗:', e.message);
    console.error('  → 檢查:1) SQL migration 是否執行  2) RLS public_read policy 是否存在');
    process.exit(1);
  }

  // 2) 每筆對應的 product / brand 是否存在
  let allOk = true;
  for (const f of rows) {
    const product = await req(`products?id=eq.${f.product_id}&select=id,name`).then(r => r[0]);
    const brand   = await req(`brands?id=eq.${f.brand_id}&select=id,name`).then(r => r[0]);
    if (!product) { console.error(`✗ product_id ${f.product_id} 不存在`); allOk = false; continue; }
    if (!brand)   { console.error(`✗ brand_id   ${f.brand_id} 不存在`);   allOk = false; continue; }
    console.log(`  • ${brand.name} / ${product.name}  (sort=${f.sort_order})`);
  }

  if (!allOk) {
    console.error('\n✗ 有 dangling 資料,請到 admin 後台修正');
    process.exit(1);
  }

  console.log('\n✓ featured_products 設定看起來都正常 ✨');
})();
