"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewGroupPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "เกิดข้อผิดพลาด");
                return;
            }
            router.push(`/groups/${data.id}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-8 max-w-lg mx-auto">
            <button
                onClick={() => router.back()}
                className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
            >
                ← กลับ
            </button>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">สร้างกลุ่มใหม่</h1>
            <p className="text-slate-500 mb-8">
                สร้างกลุ่มสำหรับบันทึกรายรับ-รายจ่ายร่วมกัน
            </p>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            ชื่อกลุ่ม
                        </label>
                        <input
                            type="text"
                            required
                            maxLength={50}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="เช่น กลุ่มครอบครัว, บ้านเพื่อน"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? "กำลังสร้าง..." : "สร้างกลุ่ม"}
                    </button>
                </form>
            </div>
        </div>
    );
}
