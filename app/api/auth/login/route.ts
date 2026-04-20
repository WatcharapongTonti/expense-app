import { NextRequest } from "next/server";
import { z } from "zod";
import { loginUser } from "@/lib/auth";

const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const data = schema.parse(body);
        await loginUser(data);
        return Response.json({ ok: true });
    } catch (err) {
        const message =
            err instanceof z.ZodError
                ? err.issues[0].message
                : err instanceof Error
                    ? err.message
                    : "เกิดข้อผิดพลาด";
        return Response.json({ error: message }, { status: 401 });
    }
}
