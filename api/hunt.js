/**
 * api/hunt.js
 * ─────────────────────────────────────────────────────────────
 * 獵物雷達 (Target Radar) 委託代尋表單後端
 *
 * 目前 (方案 A):接收前端表單 → 發送通知到 Telegram
 *               (跟 notify-order.js 共用同一個 bot)
 *
 * 之後 (方案 B):若要切換或併行 Supabase 表格紀錄,只需在
 *               下方標記為 "PLAN B" 的區塊取消註解即可,
 *               前端 fetch('/api/hunt') 不需要任何改動。
 * ─────────────────────────────────────────────────────────────
 */

const TG_TOKEN = "8573719490:AAE0VQM7LndIvJKXkTuqGn0JEQPV_wzGoLg";
const TG_CHAT  = "7083254563";

// ── Reference URL 白名單 (防垃圾連結) ───────────────────────────────────
// 只接受社群平台、台越東南亞常見的二手/拍賣站、IG/FB/蝦皮等。
// 如果想新增就加進這個 array。空字串/無 URL 一律放行。
const ALLOWED_REF_DOMAINS = [
  // Social
  "facebook.com", "fb.com", "fb.me", "messenger.com",
  "instagram.com",
  "threads.net", "threads.com",
  "tiktok.com", "vt.tiktok.com", "douyin.com",
  "xiaohongshu.com", "xhslink.com",
  "twitter.com", "x.com",
  // Marketplace
  "shopee.tw", "shopee.vn", "shopee.com.tw", "shopee.com", "shopee.sg", "shopee.my", "shopee.ph",
  "ruten.com.tw", "goods.ruten.com.tw",
  "carousell.tw", "carousell.com",
  "pinkoi.com",
  "lazada.vn", "lazada.com.tw",
  "tiki.vn",
  "line.me", "shop.line.me",
];

function _isAllowedRefUrl(url) {
  if (!url || !String(url).trim()) return true;             // 空值放行
  try {
    const u = new URL(String(url).trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return ALLOWED_REF_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;                                           // 連 URL 都 parse 不出來
  }
}

// PLAN B (Supabase) — 之後啟用時把下面三行解開,加上 hunt_requests table migration 即可
// import { createClient } from '@supabase/supabase-js';
// const SUPABASE_URL = process.env.SUPABASE_URL;
// const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      target,                 // 獵物名稱 / 品牌  (必填)
      ref_url,                // 參考連結
      vnd_price,              // 越南盾原價 (新)
      category,               // 商品類型 (新: Top/Outerwear/Bottom/Set/Accessories/_default)
      estimated_carryback,    // 前端算好的預估親自帶回 NTD
      estimated_shipping,     // 前端算好的預估國際運送 NTD
      contact,                // 聯絡方式  (必填)
      notes,                  // 備註
      image_urls,             // 圖片 URL array (上傳到 Supabase Storage 後的公開 URL)
      submitted_at,           // 前端 ISO 時間戳
      user_agent,             // 用戶 UA
      referrer,               // 來源頁面
    } = req.body || {};

    // ── 必填檢查 + 反垃圾長度限制 ────────────────────────────
    if (!target || !contact) {
      return res.status(400).json({ error: "Missing required fields: target, contact" });
    }
    if (String(target).length > 500 || String(contact).length > 500
        || String(notes || "").length > 2000) {
      return res.status(400).json({ error: "Field too long" });
    }

    // ── ref_url 白名單檢查 (前端應該已經擋,後端再驗一次防繞過) ──
    if (!_isAllowedRefUrl(ref_url)) {
      return res.status(400).json({
        error: "Reference URL not allowed",
        message: "參考連結僅接受 Facebook / Instagram / Shopee / Threads / TikTok / 小紅書 / 露天 / 蝦皮 / Pinkoi / Carousell / LINE Shopping / Lazada / Tiki 等社群和拍賣平台。",
      });
    }

    // ── 圖片 URL 列表清理 (最多 5 張,只接受 Supabase Storage host) ──
    const safeImages = Array.isArray(image_urls)
      ? image_urls
          .filter((u) => typeof u === "string")
          .filter((u) => /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(u))
          .slice(0, 5)
      : [];

    // ── 組 Telegram 訊息 ────────────────────────────────────
    const ts = (submitted_at ? new Date(submitted_at) : new Date())
      .toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
    const lines = [
      "\ud83d\udce1 \u7375\u7269\u96f7\u9054 \u2014 \u65b0\u4ee3\u5c0b\u59d4\u8a17",  // 📡 獵物雷達 — 新代尋委託
      "",
      "\ud83c\udfaf \u7375\u7269: " + target,                                          // 🎯 獵物
    ];
    if (ref_url) lines.push("\ud83d\udd17 \u53c3\u8003\u9023\u7d50: " + ref_url);          // 🔗 參考連結

    // 越南盾原價 + 商品類型
    const vndNum = parseInt(vnd_price, 10);
    if (vndNum && vndNum > 0) {
      const catLabel = ({
        Top: "上衣", Outerwear: "外套", Bottom: "褲款 / 下身",
        Set: "套裝", Accessories: "配件 / 帽款", _default: "其他",
      })[category] || "其他";
      lines.push("\ud83c\udff7\ufe0f VND \u539f\u50f9: " + vndNum.toLocaleString() + " \u20ab (" + catLabel + ")"); // 🏷️ VND 原價
    }

    // 前端送過來的預估報價 (兩種運送方式)
    const carryNum = parseInt(estimated_carryback, 10);
    const shipNum  = parseInt(estimated_shipping, 10);
    if (carryNum > 0 || shipNum > 0) {
      lines.push(
        "\ud83d\udcca \u9810\u4f30: \u89aa\u81ea\u5e36\u56de NT$ " + (carryNum > 0 ? carryNum.toLocaleString() : "—") +
        " / \u570b\u969b\u904b\u9001 NT$ " + (shipNum > 0 ? shipNum.toLocaleString() : "—")
      ); // 📊 預估
    }

    lines.push("\ud83d\udcde \u806f\u7d61: " + contact);                                  // 📞 聯絡
    if (notes) lines.push("", "\ud83d\udcdd \u5099\u8a3b:", notes);                       // 📝 備註
    if (safeImages.length > 0) lines.push("", "\ud83d\uddbc \u5716\u7247: " + safeImages.length + " \u5f35"); // 🖼 圖片
    lines.push("", "\u23f0 \u9001\u51fa\u6642\u9593: " + ts);                            // ⏰ 送出時間
    if (referrer) lines.push("\ud83c\udf10 \u4f86\u6e90: " + String(referrer).slice(0, 120));  // 🌐 來源
    const msg = lines.join("\n");

    // ── 發送到 Telegram ─────────────────────────────────────
    let tgOk = false;
    try {
      const tgRes = await fetch("https://api.telegram.org/bot" + TG_TOKEN + "/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TG_CHAT, text: msg }),
      });
      const tgData = await tgRes.json();
      tgOk = !!tgData.ok;
      if (!tgOk) console.error("[hunt] Telegram sendMessage error:", tgData);
    } catch (e) {
      console.error("[hunt] Telegram sendMessage failed:", e);
    }

    // ── 把圖片每張用 sendPhoto 推到 Telegram (URL 模式,Telegram 直接抓 Supabase 公開 URL) ──
    for (const photoUrl of safeImages) {
      try {
        const photoRes = await fetch("https://api.telegram.org/bot" + TG_TOKEN + "/sendPhoto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: TG_CHAT, photo: photoUrl }),
        });
        const photoData = await photoRes.json();
        if (!photoData.ok) console.error("[hunt] Telegram sendPhoto error:", photoData);
      } catch (e) {
        console.error("[hunt] Telegram sendPhoto failed:", e);
      }
    }

    // ── PLAN B (Supabase) — 之後想啟用的時候解開 ──────────────
    // const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    // const { error: dbErr } = await sb.from("hunt_requests").insert({
    //   target, ref_url, contact, notes,
    //   vnd_price: vndNum || null,
    //   category: category || null,
    //   estimated_carryback: carryNum || null,
    //   estimated_shipping:  shipNum  || null,
    //   image_urls: safeImages,
    //   user_agent, referrer,
    //   status: "pending",
    // });
    // if (dbErr) console.error("[hunt] Supabase insert failed:", dbErr);

    // 即使 Telegram 失敗也回 200,讓前端不要顯示錯誤
    // (前端 localStorage 會把資料留底,你之後用得到)
    return res.status(200).json({ success: true, telegram: tgOk });
  } catch (err) {
    console.error("[hunt]", err);
    return res.status(200).json({ success: false, error: err.message });
  }
}
