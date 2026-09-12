import QRCode from "qrcode";

// Builds a standard UPI deep-link URI. Any UPI app (GPay, PhonePe,
// Paytm, etc.) recognizes this scheme and pre-fills the payee and
// amount — the payer still confirms in their own app, we're not
// touching money directly.
export function buildUpiUri(params: { upiId: string; payeeName?: string | null; amount: number; note?: string }) {
  const qs = new URLSearchParams({
    pa: params.upiId,
    pn: params.payeeName || "Business",
    am: params.amount.toFixed(2),
    cu: "INR",
    tn: params.note || "Agent payment",
  });
  return `upi://pay?${qs.toString()}`;
}

// Renders the UPI URI as a PNG data URL (server-side), so the amount
// baked into the QR is always whatever the server just computed —
// the agent's browser never gets a chance to alter it before it's
// encoded.
export async function generateUpiQrDataUrl(params: { upiId: string; payeeName?: string | null; amount: number; note?: string }) {
  const uri = buildUpiUri(params);
  const dataUrl = await QRCode.toDataURL(uri, { width: 320, margin: 1 });
  return { uri, dataUrl };
}
