"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Transaction {
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
    user: { id: string; name: string; };
}

interface Member {
    id: string;
    role: string;
    user: { id: string; name: string; email: string | null; lineUserId: string | null; };
}

interface Group {
    id: string;
    name: string;
    inviteCode: string;
    lineGroupId: string | null;
    members: Member[];
    transactions: Transaction[];
}

interface Props {
    group: Group;
    currentUserId: string;
    role: string;
}

const fmt = (n: number) =>
    new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        minimumFractionDigits: 0,
    }).format(n);

export default function GroupDetail({ group, currentUserId, role }: Props) {
    const router = useRouter();
    const [showAddForm, setShowAddForm] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>(group.transactions);

    // Form state
    const [txType, setTxType] = useState<"income" | "expense">("expense");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [txError, setTxError] = useState("");
    const [txLoading, setTxLoading] = useState(false);

    const [copied, setCopied] = useState(false);
    const [liffCopied, setLiffCopied] = useState(false);
    const [webCopied, setWebCopied] = useState(false);

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    const liffUrl = liffId
        ? `https://liff.line.me/${liffId}?inviteCode=${group.inviteCode}`
        : null;

    const totalIncome = transactions
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);

    // Per-person breakdown
    const byPerson = new Map<string, { name: string; income: number; expense: number; }>();
    for (const tx of transactions) {
        const entry = byPerson.get(tx.user.id) ?? { name: tx.user.name, income: 0, expense: 0 };
        if (tx.type === "income") entry.income += tx.amount;
        else entry.expense += tx.amount;
        byPerson.set(tx.user.id, entry);
    }
    const personSummary = [...byPerson.values()];

    async function handleAddTransaction(e: React.FormEvent) {
        e.preventDefault();
        setTxError("");
        setTxLoading(true);

        try {
            const res = await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: txType,
                    amount: parseFloat(amount),
                    description,
                    groupId: group.id,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setTxError(data.error || "เกิดข้อผิดพลาด");
                return;
            }
            setTransactions([data, ...transactions]);
            setAmount("");
            setDescription("");
            setShowAddForm(false);
        } finally {
            setTxLoading(false);
        }
    }

    async function handleDeleteTransaction(id: string) {
        if (!confirm("ต้องการลบรายการนี้?")) return;
        const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
        if (res.ok) {
            setTransactions(transactions.filter((t) => t.id !== id));
        }
    }

    async function handleLeaveGroup() {
        if (!confirm(`ต้องการออกจากกลุ่ม "${group.name}"?`)) return;
        const res = await fetch(`/api/groups/${group.id}/leave`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error || "เกิดข้อผิดพลาด");
            return;
        }
        router.push("/groups");
    }

    async function handleDeleteGroup() {
        if (!confirm(`ลบกลุ่ม "${group.name}" และข้อมูลธุรกรรมทั้งหมด?\nไม่สามารถกู้คืนได้`)) return;
        const res = await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
            alert(data.error || "เกิดข้อผิดพลาด");
            return;
        }
        router.push("/groups");
    }

    function copyInviteCode() {
        navigator.clipboard.writeText(group.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function copyWebInviteUrl() {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        navigator.clipboard.writeText(`${appUrl}/invite/${group.inviteCode}`);
        setWebCopied(true);
        setTimeout(() => setWebCopied(false), 2000);
    }

    function copyLiffUrl() {
        if (!liffUrl) return;
        navigator.clipboard.writeText(liffUrl);
        setLiffCopied(true);
        setTimeout(() => setLiffCopied(false), 2000);
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <button
                onClick={() => router.back()}
                className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
            >
                ← กลับ
            </button>

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
                        {group.lineGroupId && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                LINE เชื่อมแล้ว
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-slate-400">รหัสเชิญ:</span>
                        <code className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            {group.inviteCode}
                        </code>
                        <button
                            onClick={copyInviteCode}
                            className="text-xs text-indigo-600 hover:underline"
                        >
                            {copied ? "คัดลอกแล้ว ✓" : "คัดลอก"}
                        </button>
                        <button
                            onClick={copyWebInviteUrl}
                            className="text-xs text-green-600 hover:underline"
                        >
                            {webCopied ? "คัดลอกลิงก์แล้ว ✓" : "📎 คัดลอกลิงก์เชิญ"}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        + บันทึกรายการ
                    </button>
                    {role === "admin" ? (
                        <button
                            onClick={handleDeleteGroup}
                            className="px-3 py-2.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                            title="ลบกลุ่ม"
                        >
                            🗑️ ลบกลุ่ม
                        </button>
                    ) : (
                        <button
                            onClick={handleLeaveGroup}
                            className="px-3 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            title="ออกจากกลุ่ม"
                        >
                            ออกจากกลุ่ม
                        </button>
                    )}
                </div>
            </div>

            {/* Add transaction form */}
            {showAddForm && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                    <h2 className="font-semibold text-slate-900 mb-4">บันทึกรายการใหม่</h2>
                    <form onSubmit={handleAddTransaction} className="space-y-4">
                        <div className="flex gap-3">
                            <label
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer text-sm font-medium transition-colors ${txType === "income"
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                                    }`}
                            >
                                <input
                                    type="radio"
                                    className="sr-only"
                                    checked={txType === "income"}
                                    onChange={() => setTxType("income")}
                                />
                                💰 รายรับ
                            </label>
                            <label
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer text-sm font-medium transition-colors ${txType === "expense"
                                    ? "border-red-500 bg-red-50 text-red-700"
                                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                                    }`}
                            >
                                <input
                                    type="radio"
                                    className="sr-only"
                                    checked={txType === "expense"}
                                    onChange={() => setTxType("expense")}
                                />
                                💸 รายจ่าย
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    จำนวนเงิน (บาท)
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0.01"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    รายละเอียด
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="เช่น ค่าอาหาร"
                                />
                            </div>
                        </div>

                        {txError && (
                            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                                {txError}
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={txLoading}
                                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                {txLoading ? "กำลังบันทึก..." : "บันทึก"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 mb-1">รายรับรวม</p>
                    <p className="text-xl font-bold text-emerald-600">{fmt(totalIncome)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 mb-1">รายจ่ายรวม</p>
                    <p className="text-xl font-bold text-red-500">{fmt(totalExpense)}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 mb-1">คงเหลือ</p>
                    <p
                        className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? "text-slate-900" : "text-red-600"
                            }`}
                    >
                        {fmt(totalIncome - totalExpense)}
                    </p>
                </div>
            </div>

            {/* Per-person breakdown */}
            {personSummary.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                    <h2 className="text-sm font-semibold text-slate-700 mb-3">แยกรายคน</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {personSummary.map((p) => (
                            <div key={p.name} className="bg-slate-50 rounded-lg px-3 py-2.5">
                                <p className="text-xs font-semibold text-slate-700 truncate mb-1.5">{p.name}</p>
                                <div className="flex justify-between text-xs">
                                    <span className="text-emerald-600">+{fmt(p.income)}</span>
                                    <span className="text-red-500">-{fmt(p.expense)}</span>
                                </div>
                                <div className="mt-1 text-xs text-slate-500 text-right">
                                    คงเหลือ{" "}
                                    <span className={p.income - p.expense >= 0 ? "text-slate-700 font-medium" : "text-red-600 font-medium"}>
                                        {fmt(p.income - p.expense)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-6">
                {/* Transactions */}
                <div className="col-span-2">
                    <h2 className="font-semibold text-slate-900 mb-3">รายการล่าสุด</h2>
                    {transactions.length === 0 ? (
                        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
                            <p className="text-slate-400 text-sm">ยังไม่มีรายการ</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {transactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">
                                            {tx.type === "income" ? "💰" : "💸"}
                                        </span>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">
                                                {tx.description}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {tx.user.name} •{" "}
                                                {new Date(tx.createdAt).toLocaleDateString("th-TH", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`font-semibold text-sm ${tx.type === "income" ? "text-emerald-600" : "text-red-500"
                                                }`}
                                        >
                                            {tx.type === "income" ? "+" : "-"}
                                            {fmt(tx.amount)}
                                        </span>
                                        {(tx.user.id === currentUserId || role === "admin") && (
                                            <button
                                                onClick={() => handleDeleteTransaction(tx.id)}
                                                className="text-slate-300 hover:text-red-500 text-xs transition-colors"
                                                title="ลบ"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Members */}
                <div>
                    <h2 className="font-semibold text-slate-900 mb-3">สมาชิก</h2>
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                        {group.members.map((m) => (
                            <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{m.user.name}</p>
                                    {m.user.lineUserId && (
                                        <p className="text-xs text-green-600">LINE</p>
                                    )}
                                </div>
                                {m.role === "admin" && (
                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                                        แอดมิน
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* LINE OA join section */}
                    <div className="mt-4 bg-[#06C755]/5 border border-[#06C755]/30 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💚</span>
                            <p className="text-sm font-semibold text-slate-800">
                                เข้าร่วมผ่าน LINE OA
                            </p>
                        </div>

                        {liffUrl ? (
                            <>
                                <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                                    <li>แชร์ลิงก์นี้ให้สมาชิกที่ต้องการเข้าร่วม</li>
                                    <li>เปิดลิงก์จาก LINE แล้วกด &ldquo;เข้าร่วมกลุ่ม&rdquo;</li>
                                    <li>บันทึกรายการผ่าน LINE OA ได้เลย</li>
                                </ol>
                                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                                    <span className="text-xs font-mono text-slate-500 break-all">
                                        {liffUrl}
                                    </span>
                                </div>
                                <button
                                    onClick={copyLiffUrl}
                                    className="w-full py-2 bg-[#06C755] text-white text-sm font-semibold rounded-lg hover:bg-[#05b34c] transition-colors"
                                >
                                    {liffCopied ? "คัดลอกแล้ว ✓" : "📋 คัดลอกลิงก์เชิญ"}
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-slate-500">
                                    ยังไม่ได้ตั้งค่า LIFF ID —{" "}
                                    <span className="text-amber-600">
                                        เพิ่ม NEXT_PUBLIC_LIFF_ID ใน .env
                                    </span>
                                </p>
                            </>
                        )}

                        <div className="border-t border-[#06C755]/20 pt-2">
                            <p className="text-xs text-slate-500 font-medium mb-1">คำสั่ง LINE OA:</p>
                            <div className="space-y-0.5 text-xs text-slate-500">
                                <p><code className="bg-slate-100 px-1 rounded">+500 ค่าขาย</code> รายรับ</p>
                                <p><code className="bg-slate-100 px-1 rounded">-200 ค่าอาหาร</code> รายจ่าย</p>
                                <p><code className="bg-slate-100 px-1 rounded">รายงาน</code> ดูสรุป</p>
                                <p><code className="bg-slate-100 px-1 rounded">กลุ่ม</code> เปลี่ยนกลุ่ม</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
