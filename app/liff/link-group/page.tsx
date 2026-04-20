"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Step = "loading" | "form" | "submitting" | "success" | "error";

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        liff: any;
    }
}

export default function LiffLinkGroupPage() {
    const searchParams = useSearchParams();
    const [step, setStep] = useState<Step>("loading");
    const [inviteCode, setInviteCode] = useState(searchParams.get("inviteCode") ?? "");
    const [errorMsg, setErrorMsg] = useState("");
    const [successGroup, setSuccessGroup] = useState<{ name: string; } | null>(null);

    const liffRef = useRef<{ idToken: string | null; }>({ idToken: null });

    useEffect(() => {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
            setErrorMsg("LIFF ID ยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ");
            setStep("error");
            return;
        }

        import("@line/liff").then(async ({ default: liff }) => {
            try {
                await liff.init({ liffId });

                if (!liff.isLoggedIn()) {
                    liff.login();
                    return;
                }

                liffRef.current = { idToken: liff.getIDToken() };
                setStep("form");
            } catch (err) {
                setErrorMsg(
                    err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อ LINE ได้"
                );
                setStep("error");
            }
        });
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const { idToken } = liffRef.current;
        if (!idToken) {
            setErrorMsg("ไม่พบ LINE session กรุณาลองใหม่");
            setStep("error");
            return;
        }

        setStep("submitting");

        try {
            const mod = await import("@line/liff");
            const liff = mod.default;
            let displayName: string | undefined;
            try {
                const profile = await liff.getProfile();
                displayName = profile.displayName;
            } catch {
                // ignore
            }

            const res = await fetch("/api/liff/link-group", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    idToken,
                    inviteCode: inviteCode.trim().toUpperCase(),
                    displayName,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setErrorMsg(data.error || "เกิดข้อผิดพลาด");
                setStep("form");
                return;
            }

            setSuccessGroup(data.group);
            setStep("success");
        } catch {
            setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่");
            setStep("form");
        }
    }

    // ── Screens ────────────────────────────────────────────────────────────────

    if (step === "loading") {
        return (
            <Screen>
                <Spinner />
                <p className="text-slate-500 mt-4">กำลังโหลด...</p>
            </Screen>
        );
    }

    if (step === "success" && successGroup) {
        return (
            <Screen>
                <div className="text-5xl mb-4">✅</div>
                <h1 className="text-xl font-bold text-slate-900 mb-2">เข้าร่วมสำเร็จ!</h1>
                <p className="text-slate-600 text-sm text-center">
                    คุณเข้าร่วมกลุ่ม
                    <br />
                    <span className="font-semibold text-indigo-700">
                        &ldquo;{successGroup.name}&rdquo;
                    </span>{" "}
                    เรียบร้อยแล้ว
                </p>
                <div className="mt-5 bg-slate-50 rounded-xl p-4 w-full text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-700 mb-2">บันทึกรายการผ่าน LINE OA:</p>
                    <p><code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">+500 ค่าขาย</code> → รายรับ</p>
                    <p><code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">-200 ค่าอาหาร</code> → รายจ่าย</p>
                    <p><code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">รายงาน</code> → ดูสรุป</p>
                    <p><code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">กลุ่ม</code> → เปลี่ยนกลุ่ม</p>
                </div>
            </Screen>
        );
    }

    if (step === "error") {
        return (
            <Screen>
                <div className="text-4xl mb-4">❌</div>
                <h1 className="text-xl font-bold text-slate-900 mb-2">เกิดข้อผิดพลาด</h1>
                <p className="text-red-600 text-sm text-center">{errorMsg}</p>
            </Screen>
        );
    }

    // step === "form" | "submitting"
    return (
        <Screen>
            <div className="text-4xl mb-3">🔗</div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">
                เข้าร่วมกลุ่ม
            </h1>
            <p className="text-slate-500 text-sm text-center mb-6">
                กรอกรหัสเชิญเพื่อเข้าร่วมกลุ่มรายรับ-รายจ่าย
            </p>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        รหัสเชิญกลุ่ม
                    </label>
                    <input
                        type="text"
                        required
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        maxLength={8}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-center text-xl font-mono font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="ABCD12"
                        autoFocus
                    />
                    <p className="text-xs text-slate-400 mt-1 text-center">
                        ดูรหัสได้จากหน้ากลุ่มบนเว็บ
                    </p>
                </div>

                {errorMsg && (
                    <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg text-center">
                        {errorMsg}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={step === "submitting" || inviteCode.length < 6}
                    className="w-full py-3 bg-[#06C755] text-white rounded-xl font-semibold text-lg hover:bg-[#05b34c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {step === "submitting" ? "กำลังเข้าร่วม..." : "เข้าร่วมกลุ่ม"}
                </button>
            </form>
        </Screen>
    );
}

function Screen({ children }: { children: React.ReactNode; }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white px-8 py-12">
            <div className="w-full max-w-sm flex flex-col items-center">{children}</div>
        </div>
    );
}

function Spinner() {
    return (
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#06C755] rounded-full animate-spin" />
    );
}

