import crypto from "crypto";

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";

/** Verify LINE webhook signature */
export function verifyLineSignature(body: string, signature: string): boolean {
    if (!LINE_CHANNEL_SECRET) return false;
    const hmac = crypto
        .createHmac("sha256", LINE_CHANNEL_SECRET)
        .update(body)
        .digest("base64");
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

/** Send a reply message to LINE */
export async function replyMessage(replyToken: string, messages: LineMessage[]) {
    if (!LINE_CHANNEL_ACCESS_TOKEN) return;
    await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ replyToken, messages }),
    });
}

/** Send a push message to a LINE user or group */
export async function pushMessage(to: string, messages: LineMessage[]) {
    if (!LINE_CHANNEL_ACCESS_TOKEN) return;
    await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ to, messages }),
    });
}

export interface QuickReplyItem {
    type: "action";
    action: {
        type: "message";
        label: string;
        text: string;
    };
}

export interface LineMessage {
    type: "text";
    text: string;
    quickReply?: { items: QuickReplyItem[]; };
}

/** Build a text message with Quick Reply buttons.
 * @param text  The message body
 * @param items Array of { label, text } — label shown on button (max 20 chars),
 *              text sent when tapped (max 300 chars, pre-fills input box)
 */
export function withQuickReply(
    text: string,
    items: { label: string; text: string; }[]
): LineMessage {
    return {
        type: "text",
        text,
        quickReply: {
            items: items.slice(0, 13).map((i) => ({
                type: "action",
                action: { type: "message", label: i.label, text: i.text },
            })),
        },
    };
}

/** Parse a transaction message from LINE text.
 * Format: +500 ค่าอาหาร  → income
 *         -200 ค่าเดินทาง → expense
 * Returns null if not a valid transaction message.
 */
export function parseTransactionMessage(text: string): {
    type: "income" | "expense";
    amount: number;
    description: string;
} | null {
    const trimmed = text.trim();
    // Allow "+500 คำอธิบาย" or just "+500" (description optional)
    const match = trimmed.match(/^([+\-])(\d+(?:\.\d+)?)(?:\s+(.+))?$/);
    if (!match) return null;

    const [, sign, amountStr, description] = match;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return null;

    return {
        type: sign === "+" ? "income" : "expense",
        amount,
        description: description?.trim() ?? "",
    };
}

/** Format currency in Thai Baht */
export function formatAmount(amount: number): string {
    return new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        minimumFractionDigits: 0,
    }).format(amount);
}

// ---------------------------------------------------------------------------
// LIFF — Server-side LINE ID token verification
// ---------------------------------------------------------------------------

export interface LiffIdTokenPayload {
    sub: string;       // LINE user ID
    name: string;
    picture?: string;
    email?: string;
    iss: string;
    aud: string;
    exp: number;
    iat: number;
}

/**
 * Verify a LIFF ID token server-side via LINE's verify endpoint.
 * Returns the decoded payload if valid, throws otherwise.
 */
export async function verifyLiffIdToken(
    idToken: string
): Promise<LiffIdTokenPayload> {
    const channelId = process.env.LINE_LIFF_CHANNEL_ID;
    if (!channelId) throw new Error("LINE_LIFF_CHANNEL_ID is not configured");

    const params = new URLSearchParams({ id_token: idToken, client_id: channelId });
    const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`LINE token verification failed: ${err}`);
    }

    const payload = await res.json() as LiffIdTokenPayload;
    return payload;
}
