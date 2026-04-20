import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { createSession, deleteSession, getSession } from "./session";

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function registerUser(data: {
    email: string;
    name: string;
    password: string;
}) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error("อีเมลนี้ถูกใช้แล้ว");

    const hashed = await hashPassword(data.password);
    const user = await prisma.user.create({
        data: {
            email: data.email,
            name: data.name,
            password: hashed,
        },
    });

    await createSession({ userId: user.id, email: user.email!, name: user.name });
    return user;
}

export async function loginUser(data: { email: string; password: string; }) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.password) throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");

    const valid = await verifyPassword(data.password, user.password);
    if (!valid) throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");

    await createSession({ userId: user.id, email: user.email!, name: user.name });
    return user;
}

export async function logoutUser() {
    await deleteSession();
}

export { getSession };
