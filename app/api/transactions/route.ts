import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
    type: z.enum(["income", "expense"]),
    amount: z.number().positive("จำนวนเงินต้องมากกว่า 0"),
    description: z.string().min(1, "กรุณากรอกรายละเอียด"),
    groupId: z.string().min(1, "กรุณาเลือกกลุ่ม"),
});

/** List transactions for a group */
export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const groupId = searchParams.get("groupId");
    if (!groupId) return Response.json({ error: "groupId required" }, { status: 400 });

    const membership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: session.userId, groupId } },
    });
    if (!membership) return Response.json({ error: "Forbidden" }, { status: 403 });

    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
            where: { groupId },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        }),
        prisma.transaction.count({ where: { groupId } }),
    ]);

    return Response.json({ transactions, total, page, limit });
}

/** Create a transaction */
export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const data = createSchema.parse(body);

        const membership = await prisma.groupMember.findUnique({
            where: { userId_groupId: { userId: session.userId, groupId: data.groupId } },
        });
        if (!membership) return Response.json({ error: "Forbidden" }, { status: 403 });

        const tx = await prisma.transaction.create({
            data: {
                type: data.type,
                amount: data.amount,
                description: data.description,
                userId: session.userId,
                groupId: data.groupId,
            },
            include: { user: { select: { id: true, name: true } } },
        });

        return Response.json(tx, { status: 201 });
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
