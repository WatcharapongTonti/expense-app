import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import JoinGroupForm from "@/components/JoinGroupForm";

export default async function GroupsPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const memberships = await prisma.groupMember.findMany({
        where: { userId: session.userId },
        include: {
            group: {
                include: { _count: { select: { members: true, transactions: true } } },
            },
        },
        orderBy: { joinedAt: "desc" },
    });

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">กลุ่มของฉัน</h1>
                    <p className="text-slate-500 mt-1">จัดการกลุ่มรายรับ-รายจ่าย</p>
                </div>
                <Link
                    href="/groups/new"
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                    + สร้างกลุ่มใหม่
                </Link>
            </div>

            {/* Join a group */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
                <h2 className="font-semibold text-slate-900 mb-3">เข้าร่วมกลุ่ม</h2>
                <JoinGroupForm />
            </div>

            {/* Group list */}
            {memberships.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
                    <p className="text-slate-400">คุณยังไม่ได้อยู่ในกลุ่มใด</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {memberships.map(({ group, role }) => (
                        <Link
                            key={group.id}
                            href={`/groups/${group.id}`}
                            className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-slate-900">{group.name}</h3>
                                    {role === "admin" && (
                                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                            แอดมิน
                                        </span>
                                    )}
                                    {group.lineGroupId && (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                            LINE
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-400 mt-0.5">
                                    {group._count.members} สมาชิก • {group._count.transactions} รายการ
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 mb-1">รหัสเชิญ</p>
                                <code className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                    {group.inviteCode}
                                </code>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
