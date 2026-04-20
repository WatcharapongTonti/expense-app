import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import LineJoinSection from "@/components/LineJoinSection";

type Params = { params: Promise<{ code: string; }>; };

export default async function InvitePage({ params }: Params) {
    const { code } = await params;
    const upperCode = code.toUpperCase();

    const group = await prisma.group.findUnique({
        where: { inviteCode: upperCode },
        select: { id: true, name: true },
    });

    if (!group) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
                    <div className="text-4xl mb-3">❌</div>
                    <h1 className="text-xl font-bold text-slate-900">ลิงก์ไม่ถูกต้อง</h1>
                    <p className="text-slate-500 mt-2">รหัสเชิญนี้ไม่มีอยู่ในระบบ</p>
                    <Link
                        href="/"
                        className="mt-4 inline-block text-sm text-indigo-600 hover:underline"
                    >
                        กลับหน้าหลัก
                    </Link>
                </div>
            </div>
        );
    }

    const session = await getSession();

    // Logged in → join and redirect
    if (session) {
        const existing = await prisma.groupMember.findUnique({
            where: { userId_groupId: { userId: session.userId, groupId: group.id } },
        });
        if (!existing) {
            await prisma.groupMember.create({
                data: { userId: session.userId, groupId: group.id, role: "member" },
            });
        }
        redirect(`/groups/${group.id}`);
    }

    // Not logged in → set pending cookie via Server Action, then redirect to login
    async function joinAfterLogin() {
        "use server";
        const cookieStore = await cookies();
        cookieStore.set("pendingInvite", upperCode, {
            maxAge: 60 * 30, // 30 min
            httpOnly: true,
            path: "/",
            sameSite: "lax",
        });
        redirect(`/login?next=/invite/${upperCode}`);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md w-full">
                <div className="text-center mb-6">
                    <div className="text-4xl mb-3">👥</div>
                    <h1 className="text-xl font-bold text-slate-900">คำเชิญเข้าร่วมกลุ่ม</h1>
                    <p className="text-slate-500 mt-1">คุณได้รับคำเชิญให้เข้าร่วม</p>
                    <div className="mt-3 bg-indigo-50 rounded-xl p-3">
                        <p className="text-lg font-semibold text-indigo-700">{group.name}</p>
                    </div>
                </div>

                <form action={joinAfterLogin}>
                    <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                        เข้าสู่ระบบเพื่อเข้าร่วมกลุ่ม
                    </button>
                </form>

                <div className="my-3 flex items-center gap-3 text-xs text-slate-400">
                    <div className="flex-1 border-t border-slate-200" />
                    <span>หรือ</span>
                    <div className="flex-1 border-t border-slate-200" />
                </div>

                <LineJoinSection inviteCode={upperCode} />
            </div>
        </div>
    );
}
