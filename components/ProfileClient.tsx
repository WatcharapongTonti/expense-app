"use client";

import { useState } from "react";

interface User {
    id: string;
    name: string;
    email: string | null;
    lineUserId: string | null;
    linkCode: string | null;
}

export default function ProfileClient({ user }: { user: User; }) {
    const [linkCode, setLinkCode] = useState(user.linkCode);
    const [lineUserId, setLineUserId] = useState(user.lineUserId);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    async function generateCode() {
        setGenerating(true);
        try {
            const res = await fetch("/api/auth/me", { method: "POST" });
            const data = await res.json();
            if (res.ok) setLinkCode(data.linkCode);
        } finally {
            setGenerating(false);
        }
    }

    function copyCode() {
        if (!linkCode) return;
        navigator.clipboard.writeText(linkCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">โปรไฟล์</h1>
            <p className="text-slate-500 mb-8">จัดการบัญชีและการเชื่อมต่อ LINE</p>

            {/* Account Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                <h2 className="font-semibold text-slate-900 mb-4">ข้อมูลบัญชี</h2>
                <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">ชื่อ</span>
                        <span className="text-sm font-medium text-slate-900">{user.name}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">อีเมล</span>
                        <span className="text-sm font-medium text-slate-900">{user.email || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-500">LINE</span>
                        {lineUserId ? (
                            <span className="text-sm font-medium text-green-600">✓ เชื่อมแล้ว</span>
                        ) : (
                            <span className="text-sm text-slate-400">ยังไม่ได้เชื่อม</span>
                        )}
                    </div>
                </div>
            </div>

            {/* LINE Linking */}
            {!lineUserId && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="font-semibold text-slate-900 mb-2">เชื่อม LINE กับบัญชีนี้</h2>
                    <p className="text-sm text-slate-500 mb-5">
                        สร้างรหัสแล้วส่งให้บอทใน LINE แชทส่วนตัว เพื่อเชื่อมบัญชี
                    </p>

                    {linkCode ? (
                        <div className="space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <p className="text-xs text-slate-500 mb-2">พิมพ์คำสั่งนี้ในแชทส่วนตัวกับบอท:</p>
                                <div className="flex items-center gap-3">
                                    <code className="flex-1 text-lg font-mono font-bold text-slate-900 tracking-wider">
                                        /mylink {linkCode}
                                    </code>
                                    <button
                                        onClick={copyCode}
                                        className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
                                    >
                                        {copied ? "คัดลอกแล้ว ✓" : "คัดลอก"}
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-amber-600">
                                ⚠️ รหัสนี้ใช้ได้ครั้งเดียว หากต้องการรหัสใหม่ให้กดปุ่มด้านล่าง
                            </p>
                            <button
                                onClick={generateCode}
                                disabled={generating}
                                className="text-sm text-slate-500 hover:text-slate-700 underline"
                            >
                                {generating ? "กำลังสร้าง..." : "สร้างรหัสใหม่"}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={generateCode}
                            disabled={generating}
                            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {generating ? "กำลังสร้าง..." : "สร้างรหัสเชื่อม LINE"}
                        </button>
                    )}
                </div>
            )}

            {lineUserId && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">✅</span>
                        <div>
                            <p className="font-semibold text-green-800">เชื่อม LINE สำเร็จ</p>
                            <p className="text-sm text-green-700 mt-0.5">
                                บัญชีนี้เชื่อมกับ LINE แล้ว สามารถบันทึกรายการผ่าน LINE ได้
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
