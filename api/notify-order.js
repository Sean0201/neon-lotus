const TG_TOKEN = "8573719490:AAE0VQM7LndIvJKXkTuqGn0JEQPV_wzGoLg";
const TG_CHAT = "7083254563";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { orderNumber, name, phone, email, address, shipping, total, items, note } = req.body;
    if (!orderNumber || !name) return res.status(400).json({ error: "Missing fields" });

    const shipLabel = shipping === "carryback" ? "\u89AA\u81EA\u5E36\u56DE" : "\u570B\u969B\u914D\u9001";
    const itemLines = (items || []).map(it =>
      "  \u2022 " + it.product_name + " (Size " + it.size + ") x" + it.quantity + " \u2014 NT$" + it.unit_price
    ).join("\n");

    const msg = "\ud83d\uded2 \u65B0\u8A02\u55AE\u901A\u77E5\n\n"
      + "\ud83d\udccb \u8A02\u55AE\u7DE8\u865F: " + orderNumber + "\n"
      + "\ud83d\udc64 \u59D3\u540D: " + name + "\n"
      + "\ud83d\udcf1 \u96FB\u8A71: " + phone + "\n"
      + (email ? "\ud83d\udce7 Email: " + email + "\n" : "")
      + (address ? "\ud83d\udccd \u5730\u5740: " + address + "\n" : "")
      + "\ud83d\ude9a \u65B9\u5F0F: " + shipLabel + "\n"
      + "\ud83d\udcb0 \u7E3D\u91D1\u984D: NT$ " + Number(total || 0).toLocaleString() + "\n\n"
      + "\ud83d\udce6 \u5546\u54C1\u660E\u7D30:\n" + itemLines
      + (note ? "\n\n\ud83d\udcdd \u5099\u8A3B: " + note : "");

    const tgRes = await fetch("https://api.telegram.org/bot" + TG_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text: msg }),
    });
    const tgData = await tgRes.json();
    return res.status(200).json({ success: tgData.ok });
  } catch (err) {
    console.error("[TG]", err);
    return res.status(200).json({ success: false, error: err.message });
  }
}
