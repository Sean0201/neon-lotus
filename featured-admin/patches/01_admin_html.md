# Patch 01 — `admin.html`

> 這份檔案告訴你要在 `admin.html` 哪幾個位置貼上哪些片段。
> 全部都是新增,不需要刪除任何現有程式碼。

---

## 片段 A — 左側 nav 新增「Featured Products」

**位置**:`admin.html` 第 904 行附近(banners nav-item 下面)。
找到這段:
```html
<div class="nav-item" data-page="banners">
    <span class="nav-icon">🖼️</span>
    <span>Banners</span>
</div>
```

**在它的下一行**(`</div>` 之後)貼:
```html
<div class="nav-item" data-page="featured">
    <span class="nav-icon">★</span>
    <span>Featured Products</span>
</div>
```

---

## 片段 B — 新增 Featured Products 列表頁

**位置**:`admin.html` 第 1077 行附近。
找到 banners 列表頁的結尾(`</div>` 結束 `id="banners"` 那個 page block)。

**在它的下一行**貼整段:

```html
<!-- Featured Products Page -->
<div id="featured" class="page">
    <div class="content-card">
        <div class="content-card-header">
            <h2>Featured Products</h2>
            <div>
                <button id="addFeaturedBtn" class="btn-primary">+ Add Featured</button>
            </div>
        </div>
        <table id="featuredTable">
            <thead>
                <tr>
                    <th style="width: 40px;"></th>
                    <th style="width: 80px;">Cover</th>
                    <th>Brand</th>
                    <th>Product</th>
                    <th style="width: 100px;">親自帶</th>
                    <th style="width: 100px;">國際送</th>
                    <th style="width: 80px;">Active</th>
                    <th style="width: 60px;">Sort</th>
                    <th style="width: 100px;">Actions</th>
                </tr>
            </thead>
            <tbody id="featuredTableBody" draggable="true">
            </tbody>
        </table>
    </div>
</div>
```

---

## 片段 C — 新增 Featured 編輯 Modal

**位置**:`admin.html` 第 1515 行附近。
找到 banner modal 的結尾(`</div>` 結束 `id="bannerModal"`)。

**在它的下一行**貼整段:

```html
<!-- Featured Modal -->
<div id="featuredModal" class="modal-overlay">
    <div class="modal">
        <div class="modal-header">
            <h2 id="featuredModalTitle">Add Featured Product</h2>
            <button class="modal-close" onclick="closeFeaturedModal()">×</button>
        </div>
        <form id="featuredForm">
            <div class="modal-body">
                <div class="form-row">
                    <div class="form-group" style="flex:1">
                        <label for="featuredBrandId">品牌</label>
                        <select id="featuredBrandId" required
                                style="width:100%;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;">
                            <option value="">— 選擇品牌 —</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex:1">
                        <label for="featuredProductId">商品</label>
                        <select id="featuredProductId" required disabled
                                style="width:100%;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:14px;">
                            <option value="">— 先選擇品牌 —</option>
                        </select>
                    </div>
                </div>
                <div id="featuredPreviewWrap"
                     style="display:none;margin:12px 0;padding:12px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border);">
                    <img id="featuredPreviewImg"
                         style="max-width:120px;max-height:120px;border-radius:6px;object-fit:cover;display:block;margin-bottom:8px;">
                    <div id="featuredPreviewMeta" style="font-size:13px;color:var(--text);"></div>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex:1">
                        <label class="toggle-label" style="display:flex;align-items:center;gap:8px;">
                            <input type="checkbox" id="featuredActive" checked>
                            <span>Active</span>
                        </label>
                    </div>
                    <div class="form-group" style="flex:1">
                        <label for="featuredSortOrder">Sort Order</label>
                        <input type="number" id="featuredSortOrder" value="0">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeFeaturedModal()">Cancel</button>
                <button type="submit" class="btn-primary">Save</button>
            </div>
        </form>
    </div>
</div>
```

---

## 片段 D — 新增 Featured 全域變數

**位置**:`admin.html` 第 1540 行附近。
找到這段:
```js
let allBanners = [];
```

**在它下面、`let editingBannerId = null;` 上下** 加兩行:
```js
let allFeatured = [];
let editingFeaturedId = null;
```

---

## 片段 E — Router 註冊

**位置**:`admin.html` 第 1634 行附近。
找到這段(類似):
```js
else if (page === 'banners') loadBanners();
```

**在那行下面**加:
```js
else if (page === 'featured') loadFeatured();
```

---

## 片段 F — 頁面標題對照

**位置**:`admin.html` 第 1644 行附近。
找到這個 mapping 物件:
```js
'banners': 'Banners Management',
```

**在那行下面**加一筆:
```js
'featured': 'Featured Products Management',
```

---

## 片段 G — Featured 全套 JS 邏輯

**位置**:`admin.html` 第 2380 行附近(BANNERS section 結尾,所有 banner 函式定義完之後)。
找到 banner 區塊結束的地方(通常是 `// ============================================================================` 分隔線),在它**之前或之後**整段貼:

```js
// ============================================================================
// FEATURED PRODUCTS
// ============================================================================
async function loadFeatured() {
    try {
        const { data, error } = await sb.from('featured_products')
            .select('*, products(id, name, images, price), brands(id, name)')
            .order('sort_order', { ascending: true });
        if (error) throw error;
        allFeatured = data || [];
        renderFeaturedTable();
    } catch (error) {
        showToast('Error loading featured', 'error');
        console.error(error);
    }
}

function renderFeaturedTable() {
    const tbody = document.getElementById('featuredTableBody');
    tbody.innerHTML = '';

    allFeatured.forEach(f => {
        const tr = document.createElement('tr');
        tr.draggable = true;
        tr.dataset.id = f.id;
        const p = f.products || {};
        const b = f.brands   || {};
        const cover = p.images?.gallery?.[0]?.original_url
                   || p.images?.cover
                   || '';
        const img = cover
            ? `<img src="${cover}" class="image-preview" style="width:60px;height:60px;border-radius:4px;object-fit:cover;">`
            : '<span style="opacity:0.4">—</span>';
        const carry = p.price?.twd_carryback != null ? `NT$ ${p.price.twd_carryback.toLocaleString()}` : '—';
        const ship  = p.price?.twd_shipping  != null ? `NT$ ${p.price.twd_shipping.toLocaleString()}`  : '—';
        tr.innerHTML = `
            <td style="cursor:move;text-align:center;">⋮</td>
            <td>${img}</td>
            <td>${b.name || '-'}</td>
            <td>${p.name || '-'}</td>
            <td>${carry}</td>
            <td>${ship}</td>
            <td>
                <label class="toggle-switch">
                    <input type="checkbox" ${f.is_active ? 'checked' : ''} onchange="updateFeaturedActive('${f.id}', this.checked)">
                    <span class="slider"></span>
                </label>
            </td>
            <td>${f.sort_order}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" onclick="editFeatured('${f.id}')">✏️</button>
                    <button class="btn-icon delete" onclick="deleteFeatured('${f.id}')">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    setupDragDrop('featuredTableBody', 'featured_products');
}

async function populateFeaturedBrandSelect(selectedId) {
    const sel = document.getElementById('featuredBrandId');
    try {
        const { data: brands } = await sb.from('brands').select('id, name').order('name');
        sel.innerHTML = '<option value="">— 選擇品牌 —</option>' +
            (brands || []).map(b =>
                `<option value="${b.id}" ${b.id === selectedId ? 'selected' : ''}>${b.name}</option>`
            ).join('');
    } catch (e) { console.error('Failed to load brands:', e); }
}

async function populateFeaturedProductSelect(brandId, selectedId) {
    const sel = document.getElementById('featuredProductId');
    if (!brandId) {
        sel.disabled = true;
        sel.innerHTML = '<option value="">— 先選擇品牌 —</option>';
        return;
    }
    try {
        const { data: products } = await sb.from('products')
            .select('id, name, price, images')
            .eq('brand_id', brandId)
            .order('name');
        sel.disabled = false;
        sel.innerHTML = '<option value="">— 選擇商品 —</option>' +
            (products || []).map(p => {
                const carry = p.price?.twd_carryback ? ` (NT$${p.price.twd_carryback})` : '';
                return `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${p.name}${carry}</option>`;
            }).join('');
        // 把 product 物件存到 select 上,給 preview 用
        sel._featuredProducts = products || [];
    } catch (e) { console.error('Failed to load products:', e); }
}

function updateFeaturedPreview() {
    const productSel = document.getElementById('featuredProductId');
    const productId  = productSel.value;
    const products   = productSel._featuredProducts || [];
    const wrap = document.getElementById('featuredPreviewWrap');
    if (!productId) { wrap.style.display = 'none'; return; }
    const p = products.find(x => x.id === productId);
    if (!p) { wrap.style.display = 'none'; return; }
    const cover = p.images?.gallery?.[0]?.original_url || p.images?.cover || '';
    document.getElementById('featuredPreviewImg').src = cover;
    document.getElementById('featuredPreviewImg').style.display = cover ? 'block' : 'none';
    const carry = p.price?.twd_carryback != null ? `親自帶 NT$ ${p.price.twd_carryback}` : '';
    const ship  = p.price?.twd_shipping  != null ? `國際送 NT$ ${p.price.twd_shipping}`  : '';
    document.getElementById('featuredPreviewMeta').textContent = `${p.name} — ${carry}  ${ship}`;
    wrap.style.display = 'block';
}

document.getElementById('addFeaturedBtn').addEventListener('click', async () => {
    editingFeaturedId = null;
    document.getElementById('featuredModalTitle').textContent = 'Add Featured Product';
    document.getElementById('featuredForm').reset();
    document.getElementById('featuredActive').checked = true;
    document.getElementById('featuredPreviewWrap').style.display = 'none';
    await populateFeaturedBrandSelect('');
    document.getElementById('featuredProductId').disabled = true;
    document.getElementById('featuredProductId').innerHTML = '<option value="">— 先選擇品牌 —</option>';
    document.getElementById('featuredModal').classList.add('active');
});

document.getElementById('featuredBrandId').addEventListener('change', async (e) => {
    await populateFeaturedProductSelect(e.target.value, '');
    document.getElementById('featuredPreviewWrap').style.display = 'none';
});

document.getElementById('featuredProductId').addEventListener('change', updateFeaturedPreview);

async function editFeatured(id) {
    editingFeaturedId = id;
    const f = allFeatured.find(x => x.id === id);
    if (!f) return;
    document.getElementById('featuredModalTitle').textContent = 'Edit Featured Product';
    document.getElementById('featuredActive').checked = f.is_active !== false;
    document.getElementById('featuredSortOrder').value = f.sort_order || 0;
    await populateFeaturedBrandSelect(f.brand_id);
    await populateFeaturedProductSelect(f.brand_id, f.product_id);
    updateFeaturedPreview();
    document.getElementById('featuredModal').classList.add('active');
}

function closeFeaturedModal() {
    document.getElementById('featuredModal').classList.remove('active');
    editingFeaturedId = null;
}

document.getElementById('featuredForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const brandId   = document.getElementById('featuredBrandId').value;
    const productId = document.getElementById('featuredProductId').value;
    if (!brandId || !productId) {
        showToast('請選擇品牌與商品', 'error');
        return;
    }
    const payload = {
        brand_id:   brandId,
        product_id: productId,
        is_active:  document.getElementById('featuredActive').checked,
        sort_order: parseInt(document.getElementById('featuredSortOrder').value, 10) || 0
    };
    try {
        if (editingFeaturedId) {
            const { error } = await sb.from('featured_products').update(payload).eq('id', editingFeaturedId);
            if (error) throw error;
            showToast('Featured updated', 'success');
        } else {
            const { error } = await sb.from('featured_products').insert(payload);
            if (error) throw error;
            showToast('Featured added', 'success');
        }
        closeFeaturedModal();
        loadFeatured();
    } catch (error) {
        showToast(error.message || 'Save failed', 'error');
    }
});

async function deleteFeatured(id) {
    if (!confirm('確定要從精選移除這個商品嗎?')) return;
    try {
        const { error } = await sb.from('featured_products').delete().eq('id', id);
        if (error) throw error;
        showToast('Featured deleted', 'success');
        loadFeatured();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function updateFeaturedActive(id, isActive) {
    try {
        const { error } = await sb.from('featured_products').update({ is_active: isActive }).eq('id', id);
        if (error) throw error;
    } catch (error) {
        showToast(error.message, 'error');
        loadFeatured();
    }
}
```

---

## 完成後驗收

存檔後在瀏覽器打開 admin.html,左側 nav 應該看到「★ Featured Products」。
點進去顯示空表格 + 右上角「+ Add Featured」按鈕。
