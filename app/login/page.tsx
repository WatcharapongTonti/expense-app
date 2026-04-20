"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const err = searchParams.get("error");
        if (err === "invalid_token") {
            setError("ลิงก์หมดอายุหรือใช้งานแล้ว กรุณาพิมพ์ /เปิดเว็บ ใน LINE อีกครั้ง");
        } else if (err === "missing_token") {
            setError("ลิงก์ไม่ถูกต้อง กรุณาพิมพ์ /เปิดเว็บ ใน LINE เพื่อรับลิงก์ใหม่");
        }
    }, [searchParams]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "เกิดข้อผิดพลาด");
                return;
            }
            const next = searchParams.get("next");
            router.push(next && next.startsWith("/") ? next : "/dashboard");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <div className="text-center mb-8">
                        <div className="text-4xl mb-3">💰</div>
                        <h1 className="text-2xl font-bold text-slate-900">ยินดีต้อนรับ</h1>
                        <p className="text-slate-500 mt-1">ระบบรายรับ-รายจ่ายกลุ่ม</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                อีเมล
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="email@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                รหัสผ่าน
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="••••••••"
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
                            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-6">
                        ยังไม่มีบัญชี?{" "}
                        <Link href="/register" className="text-indigo-600 font-medium hover:underline">
                            สมัครสมาชิก
                        </Link>
                    </p>

                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <p className="text-center text-xs text-slate-400 mb-3">หรือเข้าสู่ระบบด้วย LINE</p>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 space-y-1">
                            <p className="font-medium">📱 เข้าสู่ระบบผ่าน LINE OA</p>
                            <p className="text-green-700">
                                พิมพ์ <span className="font-mono bg-green-100 px-1.5 py-0.5 rounded">/เปิดเว็บ</span> ใน LINE
                                เพื่อรับลิงก์เข้าสู่ระบบ (ใช้ได้ 10 นาที)
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
