"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface SidebarProps {
    user: { name: string; email: string; };
}

const navItems = [
    { href: "/dashboard", label: "ภาพรวม", icon: "📊" },
    { href: "/groups", label: "กลุ่ม", icon: "👥" },
    { href: "/profile", label: "โปรไฟล์", icon: "⚙️" },
    { href: "/help", label: "คู่มือ", icon: "📖" },
];

export default function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    async function handleLogout() {
        setLoggingOut(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    }

    return (
        <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0">
            <div className="p-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    <div>
                        <p className="font-bold text-slate-900 text-sm leading-tight">รายรับ-รายจ่าย</p>
                        <p className="text-xs text-slate-400">ระบบกลุ่ม</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-3 space-y-0.5">
                {navItems.map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                        >
                            <span>{item.icon}</span>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-3 border-t border-slate-100">
                <div className="px-3 py-2 mb-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                    <span>🚪</span>
                    {loggingOut ? "กำลังออก..." : "ออกจากระบบ"}
                </button>
            </div>
        </aside>
    );
}
