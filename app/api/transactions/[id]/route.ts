import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; }>; };

/** Delete a transaction */
export async function DELETE(_req: NextRequest, { params }: Params) {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) return Response.json({ error: "Not found" }, { status: 404 });

    // Only the creator or group admin can delete
    const membership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: session.userId, groupId: tx.groupId } },
    });
    if (!membership) return Response.json({ error: "Forbidden" }, { status: 403 });
    if (tx.userId !== session.userId && membership.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.transaction.delete({ where: { id } });
    return Response.json({ ok: true });
}
