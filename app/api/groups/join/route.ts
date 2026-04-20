import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
    inviteCode: z.string().min(1, "กรุณากรอกรหัสเชิญ"),
});

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { inviteCode } = schema.parse(body);

        const group = await prisma.group.findUnique({
            where: { inviteCode: inviteCode.toUpperCase() },
        });
        if (!group) return Response.json({ error: "รหัสเชิญไม่ถูกต้อง" }, { status: 404 });

        const existing = await prisma.groupMember.findUnique({
            where: { userId_groupId: { userId: session.userId, groupId: group.id } },
        });
        if (existing) {
            return Response.json({ error: "คุณเป็นสมาชิกกลุ่มนี้แล้ว" }, { status: 400 });
        }

        await prisma.groupMember.create({
            data: { userId: session.userId, groupId: group.id, role: "member" },
        });

        return Response.json(group, { status: 201 });
    } catch (err) {
        const message =
            err instanceof z.ZodError
                ? err.issues[0].message
                : err instanceof Error
                    ? err.message
                    : "เกิดข้อผิดพลาด";
        return Response.json({ error: message }, { status: 400 });
    }
}
