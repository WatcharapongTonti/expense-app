import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import GroupDetail from "@/components/GroupDetail";

type Params = { params: Promise<{ id: string; }>; };

export default async function GroupPage({ params }: Params) {
    const session = await getSession();
    if (!session) redirect("/login");

    const { id } = await params;

    const membership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: session.userId, groupId: id } },
    });
    if (!membership) notFound();

    const group = await prisma.group.findUnique({
        where: { id },
        include: {
            members: {
                include: {
                    user: { select: { id: true, name: true, email: true, lineUserId: true } },
                },
                orderBy: { joinedAt: "asc" },
            },
            transactions: {
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: "desc" },
                take: 50,
            },
        },
    });

    if (!group) notFound();

    // Serialize dates for client component
    const serialized = {
        ...group,
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
        members: group.members.map((m) => ({
            ...m,
            joinedAt: m.joinedAt.toISOString(),
        })),
        transactions: group.transactions.map((t) => ({
            ...t,
            createdAt: t.createdAt.toISOString(),
        })),
    };

    return (
        <GroupDetail
            group={serialized}
            currentUserId={session.userId}
            role={membership.role}
        />
    );
}
