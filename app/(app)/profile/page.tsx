import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ProfileClient from "@/components/ProfileClient";

export default async function ProfilePage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, name: true, email: true, lineUserId: true, linkCode: true },
    });

    if (!user) redirect("/login");

    return <ProfileClient user={user} />;
}
