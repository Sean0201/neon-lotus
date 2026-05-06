/* ═══════════════════════════════════════════════════════════════
 * shopping-guide.js
 * --------------------------------------------------------------------
 * 客戶服務區塊 modal:
 *   - 購買須知與วิธีชำระเงิน (PURCHASE & PAYMENT)
 *   - วิธีจัดส่ง與出貨說明 (SHIPPING & DELIVERY)
 *   - นโยบายคืนสินค้า (RETURNS & EXCHANGES)
 *
 * 觸發: 主頁「聯繫我們」上方的三個 icon card, onclick 呼叫
 *       window.openGuide(key)
 *
 * 風格: 與 sizechart.js 同樣的紫粉霓虹 modal
 * --------------------------------------------------------------------
 */
(function () {
  'use strict';

  const STYLE_ID = 'neon-guide-styles';
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const css = `
      .neon-guide-mask {
        position: fixed; inset: 0; z-index: 9998;
        background: rgba(10,10,15,0.82);
        backdrop-filter: blur(8px);
        opacity: 0; transition: opacity .25s ease;
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
      }
      .neon-guide-mask.show { opacity: 1; }

      .neon-guide-modal {
        position: relative;
        width: min(720px, 100%);
        max-height: 86vh;
        display: flex; flex-direction: column;
        background: linear-gradient(160deg, rgba(22,20,30,0.96), rgba(34,18,48,0.96));
        border: 1px solid rgba(192,132,252,0.35);
        border-radius: 16px;
        box-shadow:
          0 20px 60px rgba(0,0,0,0.55),
          0 0 30px rgba(168,85,247,0.18),
          0 0 60px rgba(244,114,182,0.10);
        color: #f5f4f8;
        font-family: 'Inter','Kanit',sans-serif,sans-serif;
        transform: translateY(18px) scale(.97);
        opacity: 0;
        transition: transform .28s ease, opacity .28s ease;
        overflow: hidden;
      }
      .neon-guide-mask.show .neon-guide-modal { transform: translateY(0) scale(1); opacity: 1; }

      .neon-guide-header {
        position: relative;
        padding: 22px 56px 20px 28px;
        border-bottom: 1px solid rgba(192,132,252,0.18);
        background: linear-gradient(120deg, rgba(168,85,247,0.10), rgba(244,114,182,0.05));
      }
      .neon-guide-eyebrow {
        font-size: 0.72rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: rgba(244,114,182,0.85);
        margin: 0 0 6px 0;
      }
      .neon-guide-title {
        font-size: 1.25rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        margin: 0;
        color: #fff;
      }
      .neon-guide-close {
        position: absolute; top: 18px; right: 18px;
        width: 34px; height: 34px;
        border: 1px solid rgba(192,132,252,0.35);
        border-radius: 50%;
        background: rgba(0,0,0,0.25);
        color: #f5f4f8;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; line-height: 1;
        transition: all .2s ease;
      }
      .neon-guide-close:hover {
        background: rgba(168,85,247,0.18);
        border-color: rgba(244,114,182,0.5);
      }

      .neon-guide-body {
        padding: 24px 28px 30px;
        overflow-y: auto;
        font-size: 0.92rem;
        line-height: 1.75;
        color: #e8e6f0;
      }
      .neon-guide-body h3 {
        margin: 22px 0 10px 0;
        font-size: 0.95rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        color: #f9d4ff;
        padding-left: 12px;
        border-left: 3px solid rgba(244,114,182,0.6);
      }
      .neon-guide-body h3:first-child { margin-top: 0; }
      .neon-guide-body p { margin: 0 0 12px 0; }
      .neon-guide-body ul { margin: 0 0 14px 0; padding-left: 20px; }
      .neon-guide-body li { margin: 0 0 6px 0; }
      .neon-guide-body strong { color: #f9d4ff; font-weight: 600; }
      .neon-guide-body .accent {
        color: #fcc4ff;
        background: rgba(168,85,247,0.10);
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 500;
      }
      .neon-guide-body .warn {
        background: rgba(244,114,182,0.08);
        border-left: 3px solid rgba(244,114,182,0.6);
        padding: 12px 16px;
        margin: 14px 0;
        border-radius: 0 8px 8px 0;
        color: #fce7f3;
      }
      .neon-guide-body code, .neon-guide-body .lineid {
        font-family: 'Inter','SF Mono',monospace;
        background: rgba(168,85,247,0.18);
        padding: 1px 7px;
        border-radius: 4px;
        font-size: 0.85em;
        color: #fcc4ff;
      }

      @media (max-width: 600px) {
        .neon-guide-header { padding: 18px 50px 16px 20px; }
        .neon-guide-title { font-size: 1.1rem; }
        .neon-guide-body { padding: 20px 22px 26px; font-size: 0.88rem; }
      }
    `;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── 內容資料 (繁體中文) ─────────────────────────────────────────
  const GUIDES = {
    purchase: {
      eyebrow: 'PURCHASE & PAYMENT',
      title: '購買須知與วิธีชำระเงิน',
      html: `
        <h3>ลักษณะสินค้า</h3>
        <p>NEON LOTUS นำเสนอ<strong>สินค้าจากแบรนด์ดีไซเนอร์เวียดนาม</strong> เราคัดสรรสินค้าจากแบรนด์ดีไซเนอร์ชั้นนำของเวียดนาม และจัดซื้อตรงจากแบรนด์เพื่อจัดส่งกลับประเทศไทย</p>

        <h3>คำแนะนำไซส์</h3>
        <p>下單前請務必確認尺寸 (可參考商品頁面尺寸表或私訊客服)。代購商品下單後,
        除重大瑕疵外,<strong>無法因「尺寸不合」或「個人喜好」提供退換貨</strong>。</p>

        <h3>หมายเหตุเรื่องสี</h3>
        <p>商品照片可能因拍攝光線、個人手機或電腦螢幕顯示器不同而產生微色差,皆以實品顏色為準,
        微小色差不列入瑕疵退換範圍。</p>

        <h3>วิธีชำระเงิน</h3>
        <p>目前官網支援的มัดจำ方式包含:</p>
        <ul>
          <li>บัตรเครดิต (Visa / Mastercard / JCB)</li>
          <li>Apple Pay</li>
          <li>โอนผ่านธนาคาร</li>
        </ul>

        <div class="warn">
          訂單成立即代表您同意所有購物須知條款。如有任何疑問,
          歡迎透過 LINE <span class="lineid">@590eckna</span> 私訊客服。
        </div>
      `
    },
    shipping: {
      eyebrow: 'SHIPPING & DELIVERY',
      title: 'วิธีจัดส่ง與出貨說明',
      html: `
        <h3>越南端嚴格品檢</h3>
        <p>所有商品在寄出前,皆會由我們的越南團隊進行<strong>初步開箱檢查</strong>,
        確保商品無重大瑕疵。</p>

        <h3>固定รอบการส่ง</h3>
        <p>我們<span class="accent">每週日進行結單</span>,並於<span class="accent">每週一統一安排國際出貨</span>。</p>

        <h3>預估天數</h3>
        <p>หลังจัดส่งจากเวียดนามแล้ว สินค้าจะถึงไทยภายใน <strong>5-10 วันทำการ</strong>
        (遇節慶假日或海關查驗可能微幅延遲,敬請見諒)</p>

        <h3>包裝聲明</h3>
        <p>我們會盡最大努力附上品牌原盒與完整包裝,但國際長途運送過程中,
        鞋盒或外包裝難免有擠壓破損之情形,無法保證 100% 完美,
        <strong>完美主義者請斟酌下單</strong>。</p>

        <h3>特別企劃 — 主理人親帶班機</h3>
        <ul>
          <li>每兩個月我們將親自從越南帶貨回台,該批次訂單將<strong>免收國際運費</strong>!</li>
          <li>確切的「下趟回台時間」與收單期限,請密切鎖定 <strong>NEON LOTUS 官方 Instagram</strong> 公告。</li>
        </ul>
      `
    },
    returns: {
      eyebrow: 'RETURNS & EXCHANGES',
      title: 'นโยบายคืนสินค้า',
      html: `
        <p>根據行政院消保法規定,<strong>依消費者要求所為之客製化給付</strong> (如專屬代購) 可排除 7 日解除權。
        因此,預購/代購商品<strong>不提供任何「個人因素」</strong> (如尺寸不合、穿起來不適合、與想像不同) 的退換貨服務。</p>

        <h3>受理退換貨條件</h3>
        <p>退換貨僅限於以下兩種情況:</p>
        <ul>
          <li><strong>寄錯商品</strong> — 款式、顏色或尺寸與您訂單上所載明的不符。</li>
          <li><strong>重大瑕疵</strong> — 嚴重影響穿著或缺少配件。例如:超過 3cm 的大範圍無法清洗污漬、明顯破洞、鞋底膠合破裂等。</li>
        </ul>

        <h3>非瑕疵範圍定義</h3>
        <p>服飾與鞋款於工廠大量製造過程中,難免有做工問題。以下情況屬正常做工範圍,<strong>不列入重大瑕疵且無法退換</strong>:</p>
        <ul>
          <li>極小脫線、線頭外露、輕微車線偏移。</li>
          <li>極小污點 (3cm 以內)、鞋款輕微溢膠。</li>
          <li>商品本身因染劑或布料產生的氣味。</li>
          <li>因海關抽驗規定,少部分商品吊牌可能被拆除,但我們保證皆為全新正品。</li>
        </ul>

        <h3>退換貨必備流程 — วิดีโอแกะกล่อง</h3>
        <div class="warn">
          為保障雙方權益,<strong>未提供「一鏡到底開箱影片」將不受理任何退換貨申請</strong>!
        </div>
        <ul>
          <li>請於收到包裹 <strong>5 天內</strong> 檢查商品。</li>
          <li>若發現重大問題,請準備好「<strong>包裹未拆封狀態至取出商品檢查</strong>」的完整錄影檔與照片,聯繫官方客服 (LINE ID: <span class="lineid">@590eckna</span>)。</li>
          <li>經客服判定符合退換貨資格後,請確保商品保持<strong>全新未拆狀態</strong> (包含配件、吊牌未剪、無下水、無沾染香水或煙味),我們將盡速為您處理。</li>
        </ul>
      `
    }
  };

  // ── 開啟/關閉 modal ─────────────────────────────────────────────
  let mask = null;
  function close() {
    if (!mask) return;
    mask.classList.remove('show');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => { if (mask) { mask.remove(); mask = null; } }, 280);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  function open(key) {
    injectStyles();
    const data = GUIDES[key];
    if (!data) return;

    // Close existing
    if (mask) close();

    mask = document.createElement('div');
    mask.className = 'neon-guide-mask';
    mask.innerHTML = `
      <div class="neon-guide-modal" role="dialog" aria-modal="true" aria-labelledby="neon-guide-title">
        <div class="neon-guide-header">
          <p class="neon-guide-eyebrow">${data.eyebrow}</p>
          <h2 class="neon-guide-title" id="neon-guide-title">${data.title}</h2>
          <button class="neon-guide-close" aria-label="Close">×</button>
        </div>
        <div class="neon-guide-body">${data.html}</div>
      </div>
    `;
    document.body.appendChild(mask);
    // animate in
    requestAnimationFrame(() => mask.classList.add('show'));
    // close handlers
    mask.querySelector('.neon-guide-close').addEventListener('click', close);
    mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
    document.addEventListener('keydown', onKey);
  }

  window.openGuide = open;
})();
