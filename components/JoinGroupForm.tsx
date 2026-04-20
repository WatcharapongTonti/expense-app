"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinGroupForm() {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/groups/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inviteCode: code.trim().toUpperCase() }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "เกิดข้อผิดพลาด");
                return;
            }
            router.push(`/groups/${data.id}`);
            router.refresh();
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-3">
            <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                placeholder="รหัสเชิญ เช่น ABCD12"
            />
            <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
                {loading ? "กำลังเข้าร่วม..." : "เข้าร่วม"}
            </button>
            {error && (
                <p className="text-sm text-red-600 absolute mt-10">{error}</p>
            )}
        </form>
    );
}
