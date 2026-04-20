import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; }>; };

/** Get group details */
export async function GET(_req: NextRequest, { params }: Params) {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const membership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: session.userId, groupId: id } },
    });
    if (!membership) return Response.json({ error: "Forbidden" }, { status: 403 });

    const group = await prisma.group.findUnique({
        where: { id },
        include: {
            members: {
                include: { user: { select: { id: true, name: true, email: true, lineUserId: true } } },
                orderBy: { joinedAt: "asc" },
            },
            transactions: {
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: "desc" },
                take: 50,
            },
        },
    });

    if (!group) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ...group, role: membership.role });
}

/** Delete group (admin only) */
export async function DELETE(_req: NextRequest, { params }: Params) {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const membership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: session.userId, groupId: id } },
    });
    if (!membership || membership.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cascade delete: transactions → members → clear activeGroupId → group
    await prisma.transaction.deleteMany({ where: { groupId: id } });
    await prisma.groupMember.deleteMany({ where: { groupId: id } });
    await prisma.user.updateMany({ where: { activeGroupId: id }, data: { activeGroupId: null } });
    await prisma.group.delete({ where: { id } });
    return Response.json({ ok: true });
}
