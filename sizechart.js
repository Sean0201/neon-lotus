/* ═══════════════════════════════════════════════════════════════
 * sizechart.js
 * 點擊商品卡左側「📏 尺寸表」按鈕後，彈出一個與卡片同色系的
 * 尺寸表 modal：
 *   - 上方為示意圖 (image)
 *   - 下方為文字尺寸表 (table)
 *   - 內部可上下滑動瀏覽
 *   - 可關閉 (X / 背景點擊 / ESC)
 * 資料來源: 每個 product 的 size_chart 欄位
 *           (由 scripts/translate-vn-sizes.js 寫入)
 * ─────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  // ── 1. 樣式: 與卡片同樣的紫粉霓虹風 ────────────────────────────
  const STYLE_ID = 'neon-sizechart-styles';
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const css = `
      .neon-sc-mask {
        position: fixed; inset: 0; z-index: 9998;
        background: rgba(10,10,15,0.78);
        backdrop-filter: blur(6px);
        opacity: 0; transition: opacity .25s ease;
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
      }
      .neon-sc-mask.show { opacity: 1; }

      .neon-sc-modal {
        position: relative;
        width: min(560px, 100%);
        max-height: 86vh;
        display: flex; flex-direction: column;
        background: linear-gradient(160deg, rgba(22,20,30,0.95), rgba(34,18,48,0.95));
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
      .neon-sc-mask.show .neon-sc-modal { transform: translateY(0) scale(1); opacity: 1; }

      .neon-sc-modal::before {
        content: '';
        position: absolute; inset: 0;
        background:
          radial-gradient(120% 60% at 0% 0%, rgba(244,114,182,0.10), transparent 60%),
          radial-gradient(120% 60% at 100% 100%, rgba(96,165,250,0.10), transparent 60%);
        pointer-events: none;
      }

      .neon-sc-head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(192,132,252,0.18);
        background: rgba(168,85,247,0.05);
        position: relative; z-index: 1;
      }
      .neon-sc-title {
        font-family: 'Syncopate','Montserrat',sans-serif;
        font-size: .92rem; font-weight: 700;
        letter-spacing: .12em; text-transform: uppercase;
        background: linear-gradient(135deg, #f472b6, #a855f7, #60a5fa);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .neon-sc-sub {
        font-size: .65rem; color: #c084fc; letter-spacing: .1em;
        margin-top: 2px;
      }
      .neon-sc-close {
        width: 32px; height: 32px; border-radius: 8px;
        border: 1px solid rgba(192,132,252,0.30);
        background: rgba(168,85,247,0.10);
        color: #f5f4f8; font-size: 1.05rem; line-height: 1;
        cursor: pointer; transition: all .2s ease;
      }
      .neon-sc-close:hover {
        background: rgba(244,114,182,0.20);
        border-color: rgba(244,114,182,0.55);
        transform: rotate(90deg);
      }

      /* ── 滑動內容區 ────────────────────────────────────────── */
      .neon-sc-body {
        position: relative; z-index: 1;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 18px 20px 22px;
        display: flex; flex-direction: column; gap: 18px;
      }
      .neon-sc-body::-webkit-scrollbar { width: 8px; }
      .neon-sc-body::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); }
      .neon-sc-body::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #a855f7, #f472b6);
        border-radius: 8px;
      }

      .neon-sc-img-wrap {
        background: rgba(255,255,255,0.04);
        border: 1px dashed rgba(192,132,252,0.25);
        border-radius: 12px;
        padding: 8px;
        position: relative;
      }
      .neon-sc-img-wrap img {
        display: block;
        width: 100%;
        height: auto;
        object-fit: contain;
        border-radius: 8px;
        /* 多數尺寸圖是「白底/淺底 + 深色文字」, 用白底避免文字看不到 */
        background: #ffffff;
        cursor: zoom-in;
        transition: max-height 0.3s ease;
        max-height: 480px;
      }
      .neon-sc-img-wrap.expanded img {
        max-height: none;
        cursor: zoom-out;
      }
      .neon-sc-img-hint {
        position: absolute; right: 14px; bottom: 14px;
        background: rgba(0,0,0,0.6); color: #fff;
        font-size: .62rem; padding: 4px 8px; border-radius: 4px;
        letter-spacing: .08em;
        pointer-events: none;
        opacity: 0.85;
      }
      .neon-sc-img-empty {
        font-size: .7rem; color: var(--lightgrey, #9ca3af);
        text-align: center; padding: 22px 0; letter-spacing: .08em;
      }

      .neon-sc-section-h {
        font-size: .68rem; letter-spacing: .25em; text-transform: uppercase;
        color: #f472b6; margin-bottom: 6px; font-weight: 700;
      }

      .neon-sc-table {
        width: 100%;
        border-collapse: separate; border-spacing: 0;
        font-size: .78rem;
        border: 1px solid rgba(192,132,252,0.18);
        border-radius: 10px; overflow: hidden;
        background: rgba(10,10,15,0.55);
      }
      .neon-sc-table thead th {
        background: linear-gradient(135deg, rgba(244,114,182,0.18), rgba(168,85,247,0.18));
        color: #ffffff;
        font-weight: 700; letter-spacing: .08em;
        padding: 10px 8px; text-align: center;
        border-bottom: 1px solid rgba(192,132,252,0.30);
        white-space: nowrap;
      }
      .neon-sc-table tbody td {
        padding: 9px 8px; text-align: center;
        border-bottom: 1px solid rgba(192,132,252,0.10);
        color: #e8e4ee;
      }
      .neon-sc-table tbody tr:last-child td { border-bottom: none; }
      .neon-sc-table tbody tr:hover td {
        background: rgba(168,85,247,0.08);
      }
      .neon-sc-table .sz {
        font-weight: 700; color: #c084fc;
        background: rgba(168,85,247,0.06);
      }

      .neon-sc-empty {
        padding: 30px 12px; text-align: center;
        color: var(--lightgrey, #9ca3af);
        font-size: .8rem; line-height: 1.7;
      }

      .neon-sc-foot {
        font-size: .62rem; color: rgba(192,132,252,0.55);
        text-align: center; padding: 4px 0 2px;
        letter-spacing: .12em;
      }

      /* ── 卡片左側按鈕 (與加入購物車按鈕同風格) ─────────────── */
      .neon-sizechart-btn {
        align-self: flex-end;
        margin-top: 14px; margin-right: 8px;
        padding: 7px 14px;
        background: linear-gradient(135deg, rgba(96,165,250,0.18), rgba(168,85,247,0.18));
        border: 1px solid rgba(192,132,252,0.35);
        border-radius: 8px;
        color: #f5f4f8;
        font-size: .72rem; font-weight: 600; letter-spacing: .08em;
        cursor: pointer; white-space: nowrap;
        transition: all .25s ease;
      }
      .neon-sizechart-btn:hover {
        background: linear-gradient(135deg, rgba(96,165,250,0.32), rgba(244,114,182,0.32));
        border-color: rgba(244,114,182,0.6);
        box-shadow: 0 4px 16px rgba(168,85,247,0.25);
        transform: translateY(-1px);
      }
      .neon-sizechart-btn:active { transform: translateY(0); box-shadow: none; }

      /* card-actions: 兩顆按鈕並排 (尺寸表在左，購物車在右) */
      .neon-card-actions {
        display: flex; justify-content: flex-end; align-items: center;
        gap: 6px; margin-top: 4px;
      }
      .neon-card-actions .neon-sizechart-btn,
      .neon-card-actions .neon-add-to-cart-btn { margin-top: 10px; }

      @media (max-width: 480px) {
        .neon-sc-modal { max-height: 92vh; }
        .neon-sc-table { font-size: .72rem; }
        .neon-sizechart-btn { padding: 5px 10px; font-size: .6rem; }
      }
    `;
    const tag = document.createElement('style');
    tag.id = STYLE_ID;
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  // ── 2. 工具: 由 product_id / brand_id 找資料 ───────────────
  function findProduct(productId) {
    const data = window.BRANDS_DATA;
    if (!data || !Array.isArray(data.products)) return null;
    return data.products.find(p => p.id === productId) || null;
  }

  function findBrand(brandId) {
    const data = window.BRANDS_DATA;
    if (!data || !Array.isArray(data.brands)) return null;
    return data.brands.find(b => b.id === brandId) || null;
  }

  // ── 3. 渲染 modal ─────────────────────────────────────────
  let activeMask = null;
  let escHandler = null;

  function close() {
    if (!activeMask) return;
    activeMask.classList.remove('show');
    const m = activeMask;
    activeMask = null;
    if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null; }
    setTimeout(() => { if (m && m.parentNode) m.parentNode.removeChild(m); }, 280);
  }

  function buildTableHTML(sc) {
    if (!sc.rows || !sc.rows.length) return '';
    // 收集所有出現過的欄位 (排除 size 本身)
    const headerSet = new Set();
    sc.rows.forEach(r => Object.keys(r.values || {}).forEach(k => headerSet.add(k)));
    let headers = sc.headers && sc.headers.length
      ? sc.headers.slice(1).filter(h => headerSet.has(h) || true)
      : Array.from(headerSet);
    if (!headers.length) headers = Array.from(headerSet);

    const thead = `<thead><tr>
      <th>尺碼</th>
      ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
    </tr></thead>`;

    const tbody = '<tbody>' + sc.rows.map(r => {
      const cells = headers.map(h => `<td>${escapeHtml((r.values || {})[h] ?? '—')}</td>`).join('');
      return `<tr><td class="sz">${escapeHtml(r.size || '')}</td>${cells}</tr>`;
    }).join('') + '</tbody>';

    return `<table class="neon-sc-table">${thead}${tbody}</table>`;
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function open(productOrId) {
    injectStyles();
    const product = typeof productOrId === 'string' ? findProduct(productOrId) : productOrId;
    if (!product) { console.warn('[sizechart] product not found:', productOrId); return; }
    const brand = findBrand(product.brand_id);
    const sc = product.size_chart || null;

    const mask = document.createElement('div');
    mask.className = 'neon-sc-mask';

    const hasChart = !!(sc && sc.rows && sc.rows.length);
    const hasImage = !!(sc && sc.image_url);

    let bodyContent;
    if (!hasChart && !hasImage) {
      // 完全沒資料 → 單一友善提示, 不暴露任何後台資訊
      bodyContent = `<div class="neon-sc-empty">📐 暫無提供尺寸數據</div>`;
    } else {
      const imgPart = hasImage
        ? `<div class="neon-sc-img-wrap" onclick="this.classList.toggle('expanded')">
            <img src="${escapeHtml(sc.image_url)}" alt="size chart" loading="lazy" onerror="this.parentNode.innerHTML='<div class=\\'neon-sc-img-empty\\'>圖片無法載入</div>'">
            <div class="neon-sc-img-hint">🔍 點擊放大</div>
          </div>`
        : '';
      const tablePart = hasChart
        ? `<div>
            <div class="neon-sc-section-h">尺寸表 (cm)</div>
            ${buildTableHTML(sc)}
          </div>`
        : '';
      bodyContent = imgPart + tablePart;
    }

    mask.innerHTML = `
      <div class="neon-sc-modal" role="dialog" aria-modal="true" aria-label="尺寸表">
        <div class="neon-sc-head">
          <div>
            <div class="neon-sc-title">📏 SIZE CHART</div>
            <div class="neon-sc-sub">${escapeHtml(brand?.name || product.brand_id || '')} · ${escapeHtml(product.name || '')}</div>
          </div>
          <button class="neon-sc-close" aria-label="關閉">✕</button>
        </div>
        <div class="neon-sc-body">
          ${bodyContent}
        </div>
        <div class="neon-sc-foot">向下滑動可瀏覽完整尺寸 · 點擊外側或按 ESC 關閉</div>
      </div>
    `;

    document.body.appendChild(mask);
    activeMask = mask;
    requestAnimationFrame(() => mask.classList.add('show'));

    mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
    mask.querySelector('.neon-sc-close').addEventListener('click', close);
    escHandler = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', escHandler);
  }

  // ── 4. 對外 API ────────────────────────────────────────────
  window.showSizeChart = function (productId /*, optionalCategory */) {
    open(productId);
  };
  window.SizeChart = { open, close };

  // 啟動時注入樣式 (確保按鈕樣式優先載入)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles);
  } else {
    injectStyles();
  }
})();
