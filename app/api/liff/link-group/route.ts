import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyLiffIdToken } from "@/lib/line";

const schema = z.object({
    idToken: z.string().min(1, "idToken required"),
    inviteCode: z.string().min(1, "inviteCode required"),
    displayName: z.string().optional(),
});

/**
 * LIFF endpoint: join a web group via LINE OA.
 *
 * Flow:
 *  1. Verify LINE ID token → get lineUserId
 *  2. Find web group by inviteCode
 *  3. Find-or-create web User for this lineUserId
 *  4. Add them as a group member if not already
 *  5. Set activeGroupId if they have no active group yet
 */
export async function POST(request: NextRequest) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { idToken, inviteCode, displayName } = parsed.data;

    // 1. Verify LINE ID token
    let lineUserId: string;
    let lineName: string;
    try {
        const payload = await verifyLiffIdToken(idToken);
        lineUserId = payload.sub;
        lineName = displayName ?? payload.name ?? `LINE User (${payload.sub.slice(-4)})`;
    } catch (err) {
        return Response.json(
            { error: err instanceof Error ? err.message : "Token verification failed" },
            { status: 401 }
        );
    }

    // 2. Find web group by inviteCode
    const group = await prisma.group.findUnique({
        where: { inviteCode: inviteCode.toUpperCase() },
    });
    if (!group) {
        return Response.json({ error: "รหัสเชิญไม่ถูกต้อง" }, { status: 404 });
    }

    // 3. Find or create web User for this LINE user
    let user = await prisma.user.findUnique({ where: { lineUserId } });
    if (!user) {
        user = await prisma.user.create({
            data: { lineUserId, name: lineName },
        });
    }

    // 4. Add user to group as member if not already
    const existing = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: user.id, groupId: group.id } },
    });
    if (!existing) {
        await prisma.groupMember.create({
            data: { userId: user.id, groupId: group.id, role: "member" },
        });
    }

    // 5. Set activeGroupId if they don't have one yet
    if (!user.activeGroupId) {
        await prisma.user.update({
            where: { id: user.id },
            data: { activeGroupId: group.id },
        });
    }

    return Response.json({
        ok: true,
        group: { id: group.id, name: group.name, inviteCode: group.inviteCode },
        user: { id: user.id, name: user.name },
    });
}
