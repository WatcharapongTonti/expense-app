import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateLinkCode } from "@/lib/utils";

export async function GET() {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true, name: true, lineUserId: true, linkCode: true },
    });
    if (!user) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json(user);
}

/** Generate a link code for connecting LINE account */
export async function POST() {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const linkCode = generateLinkCode();
    await prisma.user.update({
        where: { id: session.userId },
        data: { linkCode },
    });

    return Response.json({ linkCode });
}
