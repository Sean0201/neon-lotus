/**
 * generate-data.js
 * Fetch brand and product data from Supabase, generate data.js
 */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchAll(table, orderCols, filter) {
  let all = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    let query = supabase.from(table).select("*");
    if (filter) query = filter(query);
    for (const col of orderCols) query = query.order(col);
    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data, error } = await query;
    if (error) { console.error(`Error fetching ${table}:`, error); process.exit(1); }
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return all;
}

async function main() {
  console.log("Fetching data from Supabase...");

  const brands = await fetchAll("brands", ["sort_order"]);
  console.log(`  ${brands.length} brands`);

  const allProducts = await fetchAll("products", ["brand_id", "id"]);
  console.log(`  ${allProducts.length} products`);

  const allSizes = await fetchAll("product_sizes", ["product_id", "sort_order"]);
  console.log(`  ${allSizes.length} sizes`);

  const allGallery = await fetchAll("product_gallery", ["product_id", "sort_order"]);
  console.log(`  ${allGallery.length} gallery images`);

  const sizesByProduct = {};
  allSizes.forEach((s) => {
    if (!sizesByProduct[s.product_id]) sizesByProduct[s.product_id] = [];
    sizesByProduct[s.product_id].push({ label: s.label, available: s.available });
  });

  const galleryByProduct = {};
  allGallery.forEach((g) => {
    if (!galleryByProduct[g.product_id]) galleryByProduct[g.product_id] = [];
    galleryByProduct[g.product_id].push({ type: g.type, url: g.url, original_url: g.original_url });
  });

  const brandsData = brands.map((b) => ({
    id: b.id, name: b.name, style: b.style || "",
    color_hex: b.color_hex || "#0a0a1a",
    description: { en: b.description_en || "", th: b.description_th || "", zh: b.description_zh || "" },
    meta: { category: b.category || "", website: b.website || "", founded: b.founded || "", location: b.location || "" },
  }));

  const productsData = allProducts.map((p) => {
    const product = { id: p.id, brand_id: p.brand_id, name: p.name };
    if (p.tag) product.tag = p.tag;
    if (p.category) product.category = p.category;
    if (p.season) product.season = p.season;
    product.price = {};
    if (p.price_vnd) product.price.vnd = p.price_vnd;
    if (p.price_vnd_estimated) product.price.vnd_estimated = p.price_vnd_estimated;
    if (p.price_thb_shipping) product.price.thb_shipping = p.price_thb_shipping;
    if (p.price_thb_carryback) product.price.thb_carryback = p.price_thb_carryback;
    if (p.price_note) product.price.note = p.price_note;
    product.sizes = sizesByProduct[p.id] || [];
    product.images = { cover: p.cover_image || "", gallery: galleryByProduct[p.id] || [] };
    product.sold_out = p.sold_out || false;
    product.needs_review = p.needs_review || false;
    if (p.original_cover_url) product.original_cover_url = p.original_cover_url;
    return product;
  });

  const output = { brands: brandsData, products: productsData };
  const outputPath = path.resolve("./data.js");
  const fileContent = "window.BRANDS_DATA = " + JSON.stringify(output) + ";";

  fs.writeFileSync(outputPath, fileContent, "utf-8");
  const sizeMB = (Buffer.byteLength(fileContent) / 1024 / 1024).toFixed(2);
  console.log(`\ndata.js generated: ${brandsData.length} brands, ${productsData.length} products (${sizeMB} MB)`);
}

main().catch((err) => { console.error("Fatal error:", err); process.exit(1); });
