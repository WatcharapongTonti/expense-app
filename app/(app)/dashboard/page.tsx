import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const memberships = await prisma.groupMember.findMany({
        where: { userId: session.userId },
        include: {
            group: {
                include: {
                    transactions: { orderBy: { createdAt: "desc" }, take: 5 },
                    _count: { select: { members: true } },
                },
            },
        },
        orderBy: { joinedAt: "desc" },
    });

    const allGroups = memberships.map((m) => m.group);

    // Aggregate totals across all groups
    const allTransactions = allGroups.flatMap((g) => g.transactions);
    const totalIncome = allTransactions
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
    const totalExpense = allTransactions
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);

    const fmt = (n: number) =>
        new Intl.NumberFormat("th-TH", {
            style: "currency",
            currency: "THB",
            minimumFractionDigits: 0,
        }).format(n);

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">
                    สวัสดี, {session.name} 👋
                </h1>
                <p className="text-slate-500 mt-1">ภาพรวมรายรับ-รายจ่ายของคุณ</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <p className="text-sm text-slate-500 mb-1">รายรับรวม</p>
                    <p className="text-2xl font-bold text-emerald-600">{fmt(totalIncome)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <p className="text-sm text-slate-500 mb-1">รายจ่ายรวม</p>
                    <p className="text-2xl font-bold text-red-500">{fmt(totalExpense)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <p className="text-sm text-slate-500 mb-1">คงเหลือ</p>
                    <p
                        className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? "text-slate-900" : "text-red-600"
                            }`}
                    >
                        {fmt(totalIncome - totalExpense)}
                    </p>
                </div>
            </div>

            {/* Groups */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">กลุ่มของคุณ</h2>
                <Link
                    href="/groups"
                    className="text-sm text-indigo-600 hover:underline font-medium"
                >
                    ดูทั้งหมด →
                </Link>
            </div>

            {allGroups.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
                    <p className="text-slate-400 mb-4">คุณยังไม่ได้อยู่ในกลุ่มใด</p>
                    <Link
                        href="/groups"
                        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                    >
                        สร้างหรือเข้าร่วมกลุ่ม
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {allGroups.map((group) => {
                        const income = group.transactions
                            .filter((t) => t.type === "income")
                            .reduce((s, t) => s + t.amount, 0);
                        const expense = group.transactions
                            .filter((t) => t.type === "expense")
                            .reduce((s, t) => s + t.amount, 0);
                        return (
                            <Link
                                key={group.id}
                                href={`/groups/${group.id}`}
                                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{group.name}</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {group._count.members} สมาชิก
                                            {group.lineGroupId && (
                                                <span className="ml-2 text-green-600">• LINE เชื่อมแล้ว</span>
                                            )}
                                        </p>
                                    </div>
                                    <span className="text-slate-300">→</span>
                                </div>
                                <div className="flex gap-4 text-sm">
                                    <span className="text-emerald-600 font-medium">{fmt(income)}</span>
                                    <span className="text-red-500 font-medium">{fmt(expense)}</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
