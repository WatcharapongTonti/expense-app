import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLineSignature } from "@/lib/line";

/**
 * Internal endpoint called by the LINE webhook to generate a one-time
 * web login token for a LINE user.
 *
 * Protected by the LINE channel secret (same HMAC check as the webhook).
 */
export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const signature = request.headers.get("x-line-signature") || "";

    if (!verifyLineSignature(rawBody, signature)) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lineUserId } = JSON.parse(rawBody) as { lineUserId: string; };
    if (!lineUserId) {
        return Response.json({ error: "lineUserId required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { lineUserId } });
    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Generate a random 32-byte token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    // Expire in 10 minutes
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
        where: { id: user.id },
        data: { webLoginToken: token, webLoginExpiry: expiry },
    });

    return Response.json({ token });
}
