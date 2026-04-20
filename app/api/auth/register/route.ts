import { NextRequest } from "next/server";
import { z } from "zod";
import { registerUser } from "@/lib/auth";

const schema = z.object({
    email: z.string().email("อีเมลไม่ถูกต้อง"),
    name: z.string().min(1, "กรุณากรอกชื่อ"),
    password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const data = schema.parse(body);
        await registerUser(data);
        return Response.json({ ok: true });
    } catch (err) {
        const message =
            err instanceof z.ZodError
                ? err.issues[0].message
                : err instanceof Error
                    ? err.message
                    : "เกิดข้อผิดพลาด";
        return Response.json({ error: message }, { status: 400 });
    }
}
