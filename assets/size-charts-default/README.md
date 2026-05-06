# 公版尺寸表 (Brand-Default Size Charts)

當品牌沒有為每件商品提供獨立尺寸表 (公版尺寸表),
請把該品牌的尺寸表圖片上傳到此資料夾。

## 兩種模式

### A. 全品牌單一公版 (`<brand_id>.jpg`)
所有非配件商品共用同一張圖。

```
tuyen.jpg
laneci.jpg
dirmior.jpg
```

### B. 分品類公版 (`<brand_id>_<category>.jpg`) ← HADES 採用此模式
不同品類用不同的圖,所以可以針對 tee / 褲 / 外套 等分別給對應的尺寸圖。

| 品類 key | 建議檔名 (HADES) | Supabase 件數 |
|---|---|---|
| `tee` | `hades_tee.jpg` | 43 |
| `pants` | `hades_pants.jpg` | 31 |
| `shirt` | `hades_shirt.jpg` | 15 |
| `shorts` | `hades_shorts.jpg` | 14 |
| `jacket` | `hades_jacket.jpg` | 12 |
| `hoodie` | `hades_hoodie.jpg` | 9 |
| `sweater` | `hades_sweater.jpg` | 9 |
| `tank` | `hades_tank.jpg` | 9 |
| `longsleeve` | `hades_longsleeve.jpg` | 7 |
| `jersey` | `hades_jersey.jpg` | 7 |
| `polo` | `hades_polo.jpg` | 5 |
| `skirt` | `hades_skirt.jpg` | (預留) |
| (其他/找不到品類) | `hades.jpg` | 通用 fallback |

**邏輯:** 系統先看商品名找對應 `category`,再在 `brand_defaults[brand_id].by_category[category]` 找圖片;沒有就用通用的 `image_url`。

## 已設定品牌一覽

| Supabase brand_id | 模式 | 檔案路徑 |
|---|---|---|
| `hades` | **分品類 (12 + 1 通用)** | `hades_<cat>.jpg` + `hades.jpg` |
| `tuyen` | 單一公版 | `tuyen.jpg` |
| `laneci` | 單一公版 | `laneci.jpg` |
| `dirmior` | 單一公版 | `dirmior.jpg` |
| `lsoul` | 結構化表格 (S/M/L/XL · Bust/Waist/Hip) | (內建,不需圖) |

## 部署流程

1. 把尺寸表圖片放到此資料夾,檔名要對應 `match-config.json` 的 `brand_defaults` 設定
2. 跑 `node scripts/match-sizes-to-supabase.js` 重新生成 overlay
3. Bump `index.html` 的 `data-overlay.js?v=N` 版本
4. Commit + push

## 邏輯優先順序

`data-overlay-loader.js` 在 patch 商品 `size_chart` 時:

1. **Exact name match** — `by_name[brand_id].size_charts[product_name]`
2. **Same category fallback** — `by_name[brand_id].size_charts_by_category[category]`
3. **Brand-default by_category** ← 新增 (HADES 用這個)
4. **Brand-default 通用 image_url** ← `tuyen` / `laneci` / `dirmior` 用這個
5. 配件 (cap/beanie/bag/belt) 永遠不套公版

## category key 對照表

`category` 在 loader 內由 `categoryOf(product.name)` 計算,可能值:
`tee · longsleeve · polo · tank · jersey · shirt · sweater · hoodie · jacket · pants · shorts · skirt · dress · set · bodysuit · legging · cap · beanie · hat · bag · belt · accessory`
