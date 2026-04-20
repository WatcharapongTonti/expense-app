import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/utils";

/** List all groups for the current user */
export async function GET() {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const memberships = await prisma.groupMember.findMany({
        where: { userId: session.userId },
        include: {
            group: {
                include: {
                    _count: { select: { members: true, transactions: true } },
                },
            },
        },
        orderBy: { joinedAt: "desc" },
    });

    return Response.json(memberships.map((m) => ({ ...m.group, role: m.role })));
}

const createSchema = z.object({
    name: z.string().min(1, "กรุณากรอกชื่อกลุ่ม").max(50),
});

/** Create a new group */
export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { name } = createSchema.parse(body);

        let inviteCode = generateInviteCode();
        // Ensure uniqueness (extremely rare collision)
        while (await prisma.group.findUnique({ where: { inviteCode } })) {
            inviteCode = generateInviteCode();
        }

        const group = await prisma.group.create({
            data: {
                name,
                inviteCode,
                members: {
                    create: { userId: session.userId, role: "admin" },
                },
            },
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
