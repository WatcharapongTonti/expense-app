import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; }>; };

/** Leave a group (non-admin members; admins must delete or transfer) */
export async function POST(_req: NextRequest, { params }: Params) {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const membership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: session.userId, groupId: id } },
    });
    if (!membership) {
        return Response.json({ error: "คุณไม่ได้อยู่ในกลุ่มนี้" }, { status: 404 });
    }

    // Admin can leave only if there are other admins or no other members
    if (membership.role === "admin") {
        const otherAdmins = await prisma.groupMember.count({
            where: { groupId: id, role: "admin", NOT: { userId: session.userId } },
        });
        const totalMembers = await prisma.groupMember.count({ where: { groupId: id } });
        if (otherAdmins === 0 && totalMembers > 1) {
            return Response.json(
                { error: "คุณเป็นแอดมินคนเดียว กรุณาโอนสิทธิ์หรือลบกลุ่มก่อนออก" },
                { status: 400 }
            );
        }
    }

    await prisma.groupMember.delete({
        where: { userId_groupId: { userId: session.userId, groupId: id } },
    });

    // Clear activeGroupId if this was the user's active group
    await prisma.user.updateMany({
        where: { id: session.userId, activeGroupId: id },
        data: { activeGroupId: null },
    });

    return Response.json({ ok: true });
}
