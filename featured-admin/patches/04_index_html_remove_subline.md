# Patch 04 — `index.html` 刪除第 1885 行副標

> 任務:把「本週精選」標題下面的副標 `<p>` 整段移除。

---

## 要刪的內容

`index.html` 第 1885 行:

```html
<p class="featured-sub" data-en="Hand-picked products with TWD prices — what you'll see at checkout." data-tw="精選新品,直接顯示新台幣售價,讓你下單前一目了然。">精選新品,直接顯示新台幣售價,讓你下單前一目了然。</p>
```

---

## 方法 A — 一行 `sed` 指令(最快)

在你本機開啟 NEON LOTUS TW 專案的 terminal,執行:

```bash
sed -i '' '/<p class="featured-sub"/d' index.html
```

> macOS 的 sed 需要 `-i ''` (空字串)。Linux 直接 `-i` 即可。

執行完用 grep 確認:
```bash
grep -n 'featured-sub' index.html
```
應該完全沒有輸出(代表那一行已不存在)。

---

## 方法 B — VSCode 手動

1. VSCode 打開 `index.html`
2. `Cmd+G` 跳到第 1885 行(或 `Cmd+F` 搜尋 `featured-sub`)
3. 整行選取後刪除
4. 存檔

---

## 完成後驗收

`grep -n featured-sub index.html` 應沒有任何結果。

部署上線後,首頁「本週精選」標題下面只剩商品 grid,沒有副標文字。
