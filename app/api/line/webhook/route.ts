import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/utils";
import {
    verifyLineSignature,
    replyMessage,
    parseTransactionMessage,
    formatAmount,
    withQuickReply,
} from "@/lib/line";

export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const signature = request.headers.get("x-line-signature") || "";

    if (!verifyLineSignature(rawBody, signature)) {
        return new Response("Invalid signature", { status: 401 });
    }

    let body: LineWebhookBody;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return new Response("Bad request", { status: 400 });
    }

    // Process events in parallel (fire-and-forget style, but await here for safety)
    await Promise.allSettled(body.events.map(handleEvent));

    return new Response("OK", { status: 200 });
}

async function handleEvent(event: LineEvent) {
    try {
        if (event.type === "join" && event.source.type === "group") {
            await handleGroupJoin(event);
        } else if (event.type === "message" && event.message?.type === "text") {
            await handleTextMessage(event as LineMessageEvent);
        }
    } catch {
        // Log but don't crash
    }
}

async function handleGroupJoin(event: LineEvent) {
    const lineGroupId = event.source.groupId!;
    await replyMessage(event.replyToken!, [
        {
            type: "text",
            text:
                "สวัสดี! 👋 บอทรายรับ-รายจ่ายพร้อมใช้งาน\n\n" +
                "📌 วิธีใช้:\n" +
                "• บันทึกรายรับ: +500 ค่าขาย\n" +
                "• บันทึกรายจ่าย: -200 ค่าอาหาร\n" +
                "• ดูรายงาน: พิมพ์ รายงาน\n\n" +
                "🔗 เชื่อมกลุ่มนี้กับเว็บ:\n" +
                `สร้างกลุ่มบนเว็บก่อน แล้วพิมพ์: /link INVITE_CODE\n\n` +
                `LINE Group ID: ${lineGroupId}`,
        },
    ]);
}

async function handleTextMessage(event: LineMessageEvent) {
    const text = event.message.text.trim();
    const sourceType = event.source.type;
    const lineGroupId = event.source.groupId;
    const lineUserId = event.source.userId;

    // --- Group chat commands ---
    if (sourceType === "group" && lineGroupId) {
        // /link INVITE_CODE — link LINE group to web group
        if (text.startsWith("/link ")) {
            await handleGroupLink(event, lineGroupId, text.slice(6).trim());
            return;
        }

        // รายงาน / report — show summary
        if (text === "รายงาน" || text.toLowerCase() === "report") {
            await handleGroupReport(event, lineGroupId);
            return;
        }

        // +amount desc or -amount desc — record transaction
        const parsed = parseTransactionMessage(text);
        if (parsed && lineUserId) {
            await handleGroupTransaction(event, lineGroupId, lineUserId, parsed);
            return;
        }
    }

    // --- Direct chat / OA commands ---
    if (sourceType === "user" && lineUserId) {
        // /mylink LINK_CODE — link LINE user to web user
        if (text.startsWith("/mylink ")) {
            await handleUserLink(event, lineUserId, text.slice(8).trim());
            return;
        }

        // กลุ่ม / /กลุ่ม — list groups and switch active group
        if (text === "กลุ่ม" || text === "/กลุ่ม") {
            await handleOAListGroups(event, lineUserId);
            return;
        }

        // /เลือก N — set active group by number
        if (text.startsWith("/เลือก ")) {
            await handleOASelectGroup(event, lineUserId, text.slice(7).trim());
            return;
        }

        // /join INVITE_CODE — join group by invite code
        if (text.startsWith("/join ") || text.startsWith("join ")) {
            const code = text.startsWith("/join ")
                ? text.slice(6).trim()
                : text.slice(5).trim();
            await handleOAJoinGroup(event, lineUserId, code);
            return;
        }

        // /สร้าง ชื่อกลุ่ม — create new group
        if (text.startsWith("/สร้าง ") || text.startsWith("สร้างกลุ่ม ")) {
            const name = text.startsWith("/สร้าง ")
                ? text.slice(7).trim()
                : text.slice(10).trim();
            await handleOACreateGroup(event, lineUserId, name);
            return;
        }

        // /เปิดเว็บ — generate one-time login link for the web app
        if (text === "/เปิดเว็บ" || text === "เปิดเว็บ") {
            await handleOAWebLogin(event, lineUserId);
            return;
        }

        // /ออก — leave active group
        if (text === "/ออก" || text === "ออกกลุ่ม") {
            await handleOALeaveGroup(event, lineUserId);
            return;
        }

        // /ลบกลุ่ม ยืนยัน — confirm delete (check before /ลบกลุ่ม)
        if (text === "/ลบกลุ่ม ยืนยัน" || text === "ลบกลุ่ม ยืนยัน") {
            await handleOADeleteGroup(event, lineUserId, true);
            return;
        }

        // /ลบกลุ่ม — delete active group (admin only)
        if (text === "/ลบกลุ่ม" || text === "ลบกลุ่ม") {
            await handleOADeleteGroup(event, lineUserId, false);
            return;
        }

        // รายงาน — show report for active group
        if (text === "รายงาน" || text.toLowerCase() === "report") {
            await handleOAReport(event, lineUserId);
            return;
        }

        // +amount desc or -amount desc — record transaction in OA
        const parsed = parseTransactionMessage(text);
        if (parsed) {
            await handleOATransaction(event, lineUserId, parsed);
            return;
        }

        // Quick reply triggers — prompt user to type the actual command
        if (text === "บันทึกรายรับ") {
            await replyMessage(event.replyToken!, [
                withQuickReply(
                    "💰 บันทึกรายรับ\nพิมพ์ในรูปแบบ: +จำนวน รายละเอียด\n\nตัวอย่าง:\n+500 ค่าขาย\n+1200 ค่าบริการ\n+3000 ยอดขายวันนี้",
                    [
                        { label: "+100", text: "+100 " },
                        { label: "+500", text: "+500 " },
                        { label: "+1000", text: "+1000 " },
                        { label: "+5000", text: "+5000 " },
                    ]
                ),
            ]);
            return;
        }

        if (text === "บันทึกรายจ่าย") {
            await replyMessage(event.replyToken!, [
                withQuickReply(
                    "💸 บันทึกรายจ่าย\nพิมพ์ในรูปแบบ: -จำนวน รายละเอียด\n\nตัวอย่าง:\n-200 ค่าอาหาร\n-350 ค่าน้ำมัน\n-1500 ค่าของ",
                    [
                        { label: "-100", text: "-100 " },
                        { label: "-200", text: "-200 " },
                        { label: "-500", text: "-500 " },
                        { label: "-1000", text: "-1000 " },
                    ]
                ),
            ]);
            return;
        }

        // Help / คู่มือ
        if (text === "help" || text === "ช่วยเหลือ" || text === "?" || text === "คู่มือ" || text === "/help") {
            await replyMessage(event.replyToken!, [
                withQuickReply(
                    "📖 คู่มือ LINE OA\n" +
                    "─────────────────────────\n" +
                    "💰 บันทึกรายการ:\n" +
                    "  +500 ค่าขาย → รายรับ\n" +
                    "  -200 ค่าอาหาร → รายจ่าย\n\n" +
                    "📊 ดูข้อมูล:\n" +
                    "  รายงาน → สรุปยอด + แยกรายคน\n" +
                    "  กลุ่ม → ดูกลุ่มทั้งหมด\n\n" +
                    "👥 จัดการกลุ่ม:\n" +
                    "  /สร้าง ชื่อ → สร้างกลุ่มใหม่\n" +
                    "  /join ABCD12 → เข้าร่วมกลุ่ม\n" +
                    "  /เลือก 2 → เปลี่ยนกลุ่มที่ 2\n" +
                    "  /ออก → ออกจากกลุ่มปัจจุบัน\n" +
                    "  /ลบกลุ่ม → ลบกลุ่ม (แอดมิน)\n\n" +
                    "🌐 เข้าเว็บ:\n" +
                    "  /เปิดเว็บ → รับลิงก์เข้าสู่ระบบ\n" +
                    "  /mylink XXXXXX → เชื่อมบัญชีเว็บ",
                    [
                        { label: "💰 บันทึกรายรับ", text: "บันทึกรายรับ" },
                        { label: "💸 บันทึกรายจ่าย", text: "บันทึกรายจ่าย" },
                        { label: "📊 รายงาน", text: "รายงาน" },
                        { label: "👥 กลุ่ม", text: "กลุ่ม" },
                        { label: "🌐 เปิดเว็บ", text: "/เปิดเว็บ" },
                    ]
                ),
            ]);
            return;
        }

        // Unrecognised — suggest help with quick reply buttons
        await replyMessage(event.replyToken!, [
            withQuickReply(
                "ไม่เข้าใจคำสั่ง 😅\nพิมพ์ คู่มือ หรือกดปุ่มด้านล่าง",
                [
                    { label: "💰 บันทึกรายรับ", text: "บันทึกรายรับ" },
                    { label: "💸 บันทึกรายจ่าย", text: "บันทึกรายจ่าย" },
                    { label: "📊 รายงาน", text: "รายงาน" },
                    { label: "👥 กลุ่ม", text: "กลุ่ม" },
                    { label: "📖 คู่มือ", text: "คู่มือ" },
                    { label: "🌐 เปิดเว็บ", text: "/เปิดเว็บ" },
                ]
            ),
        ]);
    }
}

async function handleGroupLink(
    event: LineMessageEvent,
    lineGroupId: string,
    inviteCode: string
) {
    if (!inviteCode) {
        await replyMessage(event.replyToken!, [
            { type: "text", text: "กรุณาระบุรหัสเชิญ เช่น: /link ABCD12" },
        ]);
        return;
    }

    const group = await prisma.group.findUnique({
        where: { inviteCode: inviteCode.toUpperCase() },
    });

    if (!group) {
        await replyMessage(event.replyToken!, [
            { type: "text", text: "❌ รหัสเชิญไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" },
        ]);
        return;
    }

    if (group.lineGroupId && group.lineGroupId !== lineGroupId) {
        await replyMessage(event.replyToken!, [
            { type: "text", text: "❌ กลุ่มนี้ถูกเชื่อมกับ LINE กลุ่มอื่นแล้ว" },
        ]);
        return;
    }

    await prisma.group.update({
        where: { id: group.id },
        data: { lineGroupId },
    });

    await replyMessage(event.replyToken!, [
        {
            type: "text",
            text:
                `✅ เชื่อมสำเร็จ! กลุ่ม "${group.name}" เชื่อมกับ LINE กลุ่มนี้แล้ว\n\n` +
                "ตอนนี้สามารถบันทึกรายรับ-รายจ่ายได้เลย:\n" +
                "• +500 ค่าขาย\n" +
                "• -200 ค่าอาหาร",
        },
    ]);
}

async function handleGroupReport(event: LineMessageEvent, lineGroupId: string) {
    const group = await prisma.group.findUnique({
        where: { lineGroupId },
        include: {
            transactions: {
                orderBy: { createdAt: "desc" },
                include: { user: true },
            },
        },
    });

    if (!group) {
        await replyMessage(event.replyToken!, [
            {
                type: "text",
                text: "❌ กลุ่มนี้ยังไม่ได้เชื่อมกับเว็บ\nพิมพ์ /link INVITE_CODE เพื่อเชื่อม",
            },
        ]);
        return;
    }

    const txs = group.transactions;
    const totalIncome = txs
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
    const totalExpense = txs
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    // Per-person breakdown
    const byPerson = new Map<string, { name: string; income: number; expense: number; }>();
    for (const tx of txs) {
        const entry = byPerson.get(tx.userId) ?? { name: tx.user.name, income: 0, expense: 0 };
        if (tx.type === "income") entry.income += tx.amount;
        else entry.expense += tx.amount;
        byPerson.set(tx.userId, entry);
    }
    const personText = [...byPerson.values()]
        .map((p) => `👤 ${p.name}\n   รับ +${formatAmount(p.income)}  จ่าย -${formatAmount(p.expense)}`)
        .join("\n");

    const recentText = txs
        .slice(0, 5)
        .map((t) => {
            const sign = t.type === "income" ? "+" : "-";
            return `${sign}${formatAmount(t.amount)} ${t.description} (${t.user.name})`;
        })
        .join("\n");

    await replyMessage(event.replyToken!, [
        {
            type: "text",
            text:
                `📊 รายงานกลุ่ม: ${group.name}\n` +
                `${"─".repeat(25)}\n` +
                `💰 รายรับรวม: ${formatAmount(totalIncome)}\n` +
                `💸 รายจ่ายรวม: ${formatAmount(totalExpense)}\n` +
                `💵 คงเหลือ: ${formatAmount(balance)}\n` +
                (personText ? `${"─".repeat(25)}\n👥 แยกรายคน:\n${personText}\n` : "") +
                (recentText ? `${"─".repeat(25)}\n📋 รายการล่าสุด:\n${recentText}` : ""),
        },
    ]);
}

async function handleGroupTransaction(
    event: LineMessageEvent,
    lineGroupId: string,
    lineUserId: string,
    parsed: { type: "income" | "expense"; amount: number; description: string; }
) {
    const group = await prisma.group.findUnique({ where: { lineGroupId } });
    if (!group) {
        await replyMessage(event.replyToken!, [
            {
                type: "text",
                text: "❌ กลุ่มนี้ยังไม่ได้เชื่อมกับเว็บ\nพิมพ์ /link INVITE_CODE เพื่อเชื่อม",
            },
        ]);
        return;
    }

    // Find or create user by LINE user ID
    let user = await prisma.user.findUnique({ where: { lineUserId } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                lineUserId,
                name: `LINE User (${lineUserId.slice(-4)})`,
            },
        });
    }

    // Ensure user is a member of the group
    const membership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: user.id, groupId: group.id } },
    });
    if (!membership) {
        await prisma.groupMember.create({
            data: { userId: user.id, groupId: group.id, role: "member" },
        });
    }

    // Auto-generate description if not provided
    let description = parsed.description;
    if (!description) {
        const count = await prisma.transaction.count({ where: { groupId: group.id } });
        description = `รายการ ${count + 1}`;
    }

    await prisma.transaction.create({
        data: {
            type: parsed.type,
            amount: parsed.amount,
            description,
            userId: user.id,
            groupId: group.id,
        },
    });

    const sign = parsed.type === "income" ? "+" : "-";
    const emoji = parsed.type === "income" ? "💰" : "💸";
    await replyMessage(event.replyToken!, [
        {
            type: "text",
            text:
                `${emoji} บันทึกแล้ว!\n` +
                `${parsed.type === "income" ? "รายรับ" : "รายจ่าย"}: ${sign}${formatAmount(parsed.amount)}\n` +
                `รายละเอียด: ${description}\n` +
                `โดย: ${user.name}`,
        },
    ]);
}

// ---------------------------------------------------------------------------
// OA (1-on-1 chat) handlers
// ---------------------------------------------------------------------------

async function getOAUser(lineUserId: string) {
    return prisma.user.findUnique({
        where: { lineUserId },
        include: {
            memberships: {
                include: { group: true },
                orderBy: { joinedAt: "asc" },
            },
        },
    });
}

async function handleOAListGroups(event: LineMessageEvent, lineUserId: string) {
    const user = await getOAUser(lineUserId);
    if (!user || user.memberships.length === 0) {
        await replyMessage(event.replyToken!, [
            withQuickReply("❌ คุณยังไม่ได้เข้าร่วมกลุ่มใด\n\n" +
                "📌 วิธีเข้าร่วม:\n" +
                "• รับลิงก์เชิญจากเว็บแล้วกดเปิดใน LINE\n" +
                "• หรือพิมพ์: /join รหัสเชิญ\n" +
                "• หรือพิมพ์: /สร้าง ชื่อกลุ่ม (สร้างใหม่)", [
                { label: "📖 คู่มือ", text: "คู่มือ" },
            ])
        ]);
        return;
    }

    const activeId = user.activeGroupId ?? user.memberships[0].groupId;
    const activeGroup = user.memberships.find((m) => m.groupId === activeId);

    const listLines = user.memberships.map((m, i) => {
        const isActive = m.groupId === activeId;
        return `${i + 1}. ${m.group.name}${isActive ? " ✅" : ""}`;
    });

    await replyMessage(event.replyToken!, [
        withQuickReply(
            `📍 กลุ่มปัจจุบัน: ${activeGroup?.group.name ?? "-"}\n` +
            `${"─".repeat(25)}\n` +
            `👥 กลุ่มทั้งหมด:\n` +
            listLines.join("\n") +
            `\n${"─".repeat(25)}\n` +
            `เปลี่ยนกลุ่ม: /เลือก [หมายเลข]\n` +
            `เข้าร่วมกลุ่มใหม่: /join รหัสเชิญ\n` +
            `สร้างกลุ่ม: /สร้าง ชื่อกลุ่ม`,
            [
                ...user.memberships.map((m, i) => ({
                    label: `${i + 1}. ${m.group.name.slice(0, 15)}`,
                    text: `/เลือก ${i + 1}`,
                })),
                { label: "💰 บันทึกรายรับ", text: "บันทึกรายรับ" },
                { label: "💸 บันทึกรายจ่าย", text: "บันทึกรายจ่าย" },
                { label: "📊 รายงาน", text: "รายงาน" },
            ]
        ),
    ]);
}

async function handleOASelectGroup(
    event: LineMessageEvent,
    lineUserId: string,
    numStr: string
) {
    const user = await getOAUser(lineUserId);
    if (!user || user.memberships.length === 0) {
        await replyMessage(event.replyToken!, [
            withQuickReply("❌ คุณยังไม่ได้เข้าร่วมกลุ่มใด", [
                { label: "📖 คู่มือ", text: "คู่มือ" },
            ])
        ]);
        return;
    }

    const num = parseInt(numStr);
    if (isNaN(num) || num < 1 || num > user.memberships.length) {
        await replyMessage(event.replyToken!, [
            { type: "text", text: `❌ หมายเลขไม่ถูกต้อง (1-${user.memberships.length})` },
        ]);
        return;
    }

    const selected = user.memberships[num - 1];
    await prisma.user.update({
        where: { id: user.id },
        data: { activeGroupId: selected.groupId },
    });

    const listLines = user.memberships.map((m, i) => {
        const isActive = m.groupId === selected.groupId;
        return `${i + 1}. ${m.group.name}${isActive ? " ✅" : ""}`;
    });

    await replyMessage(event.replyToken!, [
        withQuickReply(
            `✅ เปลี่ยนกลุ่มเป็น "${selected.group.name}" แล้ว\n` +
            `${"─".repeat(25)}\n` +
            listLines.join("\n") +
            `\n\nบันทึกรายการได้เลย`,
            [
                { label: "💰 บันทึกรายรับ", text: "บันทึกรายรับ" },
                { label: "💸 บันทึกรายจ่าย", text: "บันทึกรายจ่าย" },
                { label: "📊 รายงาน", text: "รายงาน" },
                { label: "👥 กลุ่ม", text: "กลุ่ม" },
            ]
        ),
    ]);
}

async function handleOAReport(event: LineMessageEvent, lineUserId: string) {
    const user = await getOAUser(lineUserId);
    if (!user || user.memberships.length === 0) {
        await replyMessage(event.replyToken!, [
            withQuickReply("❌ คุณยังไม่ได้เข้าร่วมกลุ่มใด", [
                { label: "📖 คู่มือ", text: "คู่มือ" },
            ])
        ]);
        return;
    }

    const activeId = user.activeGroupId ?? user.memberships[0].groupId;
    const group = await prisma.group.findUnique({
        where: { id: activeId },
        include: {
            transactions: {
                orderBy: { createdAt: "desc" },
                include: { user: true },
            },
        },
    });
    if (!group) return;

    const txs = group.transactions;
    const totalIncome = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    // Per-person breakdown
    const byPerson = new Map<string, { name: string; income: number; expense: number; }>();
    for (const tx of txs) {
        const entry = byPerson.get(tx.userId) ?? { name: tx.user.name, income: 0, expense: 0 };
        if (tx.type === "income") entry.income += tx.amount;
        else entry.expense += tx.amount;
        byPerson.set(tx.userId, entry);
    }
    const personText = [...byPerson.values()]
        .map((p) => `👤 ${p.name}\n   รับ +${formatAmount(p.income)}  จ่าย -${formatAmount(p.expense)}`)
        .join("\n");

    const recentText = txs
        .slice(0, 5)
        .map((t) => `${t.type === "income" ? "+" : "-"}${formatAmount(t.amount)} ${t.description} (${t.user.name})`)
        .join("\n");

    await replyMessage(event.replyToken!, [
        {
            type: "text",
            text:
                `📊 รายงานกลุ่ม: ${group.name}\n` +
                `${"─".repeat(25)}\n` +
                `💰 รายรับรวม: ${formatAmount(totalIncome)}\n` +
                `💸 รายจ่ายรวม: ${formatAmount(totalExpense)}\n` +
                `💵 คงเหลือ: ${formatAmount(balance)}\n` +
                (personText ? `${"─".repeat(25)}\n👥 แยกรายคน:\n${personText}\n` : "") +
                (recentText ? `${"─".repeat(25)}\n📋 รายการล่าสุด:\n${recentText}` : ""),
        },
    ]);
}

async function handleOATransaction(
    event: LineMessageEvent,
    lineUserId: string,
    parsed: { type: "income" | "expense"; amount: number; description: string; }
) {
    // Find user with memberships
    const user = await getOAUser(lineUserId);

    if (!user || user.memberships.length === 0) {
        await replyMessage(event.replyToken!, [
            {
                type: "text",
                text:
                    "❌ คุณยังไม่ได้เข้าร่วมกลุ่มใด\n\n" +
                    "กดลิงก์เชิญจากเว็บเพื่อเข้าร่วมกลุ่มก่อน",
            },
        ]);
        return;
    }

    // If multiple groups and no activeGroupId set, ask to choose
    if (user.memberships.length > 1 && !user.activeGroupId) {
        const lines = user.memberships.map((m, i) => `${i + 1}. ${m.group.name}`).join("\n");
        await replyMessage(event.replyToken!, [
            {
                type: "text",
                text:
                    "คุณอยู่หลายกลุ่ม กรุณาเลือกกลุ่มก่อน:\n\n" +
                    lines +
                    "\n\nพิมพ์ /เลือก [หมายเลข]",
            },
        ]);
        return;
    }

    const groupId = user.activeGroupId ?? user.memberships[0].groupId;

    // Auto-generate description if not provided
    let description = parsed.description;
    if (!description) {
        const count = await prisma.transaction.count({ where: { groupId } });
        description = `รายการ ${count + 1}`;
    }

    await prisma.transaction.create({
        data: {
            type: parsed.type,
            amount: parsed.amount,
            description,
            userId: user.id,
            groupId,
        },
    });

    const groupName = user.memberships.find((m) => m.groupId === groupId)?.group.name ?? "";
    const sign = parsed.type === "income" ? "+" : "-";
    const emoji = parsed.type === "income" ? "💰" : "💸";
    await replyMessage(event.replyToken!, [
        withQuickReply(
            `${emoji} บันทึกแล้ว! [${groupName}]\n` +
            `${parsed.type === "income" ? "รายรับ" : "รายจ่าย"}: ${sign}${formatAmount(parsed.amount)}\n` +
            `รายละเอียด: ${description}`,
            [
                { label: "💰 บันทึกรายรับ", text: "บันทึกรายรับ" },
                { label: "💸 บันทึกรายจ่าย", text: "บันทึกรายจ่าย" },
                { label: "📊 รายงาน", text: "รายงาน" },
            ]
        ),
    ]);
}

async function handleOAJoinGroup(
    event: LineMessageEvent,
    lineUserId: string,
    inviteCode: string
) {
    if (!inviteCode) {
        await replyMessage(event.replyToken!, [
            { type: "text", text: "กรุณาระบุรหัสเชิญ เช่น: /join ABCD12" },
        ]);
        return;
    }

    const group = await prisma.group.findUnique({
        where: { inviteCode: inviteCode.toUpperCase() },
    });
    if (!group) {
        await replyMessage(event.replyToken!, [
            { type: "text", text: "❌ รหัสเชิญไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" },
        ]);
        return;
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { lineUserId } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                lineUserId,
                name: `LINE User (${lineUserId.slice(-4)})`,
            },
        });
    }

    // Check if already a member
    const existing = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: user.id, groupId: group.id } },
    });
    if (existing) {
        // Already member — just set as active
        await prisma.user.update({
            where: { id: user.id },
            data: { activeGroupId: group.id },
        });
        await replyMessage(event.replyToken!, [
            {
                type: "text",
                text:
                    `✅ เปลี่ยนกลุ่มปัจจุบันเป็น "${group.name}" แล้ว\n` +
                    `(คุณเป็นสมาชิกอยู่แล้ว)\n\n` +
                    `บันทึกรายการได้เลย เช่น +500 ค่าขาย`,
            },
        ]);
        return;
    }

    // Add as member
    await prisma.groupMember.create({
        data: { userId: user.id, groupId: group.id, role: "member" },
    });

    // Set as active group
    await prisma.user.update({
        where: { id: user.id },
        data: { activeGroupId: group.id },
    });

    const oaId2 = (process.env.NEXT_PUBLIC_LINE_OA_BASIC_ID || "").replace(/^@/, "");
    const joinCmd2 = `/join ${group.inviteCode}`;
    const inviteLink2 = oaId2
        ? `https://line.me/R/oaMessage/@${oaId2}/${encodeURIComponent(joinCmd2)}`
        : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${group.inviteCode}`;

    await replyMessage(event.replyToken!, [
        withQuickReply(
            `✅ เข้าร่วมกลุ่ม "${group.name}" สำเร็จ!\n` +
            `กลุ่มนี้ถูกตั้งเป็นกลุ่มปัจจุบันแล้ว\n\n` +
            `📎 ชวนเพื่อนเข้าร่วม (กดเพื่อเปิด LINE):\n${inviteLink2}`,
            [
                { label: "💰 บันทึกรายรับ", text: "บันทึกรายรับ" },
                { label: "💸 บันทึกรายจ่าย", text: "บันทึกรายจ่าย" },
                { label: "📊 รายงาน", text: "รายงาน" },
                { label: "👥 กลุ่ม", text: "กลุ่ม" },
            ]
        ),
    ]);
}

async function handleOACreateGroup(
    event: LineMessageEvent,
    lineUserId: string,
    groupName: string
) {
    if (!groupName) {
        await replyMessage(event.replyToken!, [
            { type: "text", text: "กรุณาระบุชื่อกลุ่ม เช่น: /สร้าง ร้านค้า ABC" },
        ]);
        return;
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { lineUserId } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                lineUserId,
                name: `LINE User(${lineUserId.slice(-4)})`,
            },
        });
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
        const existing = await prisma.group.findUnique({ where: { inviteCode } });
        if (!existing) break;
        inviteCode = generateInviteCode();
        attempts++;
    }

    // Create group and add user as admin
    const group = await prisma.group.create({
        data: {
            name: groupName,
            inviteCode,
            members: {
                create: { userId: user.id, role: "admin" },
            },
        },
    });

    // Set as active group
    await prisma.user.update({
        where: { id: user.id },
        data: { activeGroupId: group.id },
    });

    const oaId = (process.env.NEXT_PUBLIC_LINE_OA_BASIC_ID || "").replace(/^@/, "");
    const joinCmd = `/join ${group.inviteCode}`;
    const inviteLink = oaId
        ? `https://line.me/R/oaMessage/@${oaId}/${encodeURIComponent(joinCmd)}`
        : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${group.inviteCode}`;

    await replyMessage(event.replyToken!, [
        withQuickReply(
            `✅ สร้างกลุ่ม "${group.name}" สำเร็จ!\n` +
            `${"─".repeat(25)}\n` +
            `🔑 รหัสเชิญ: ${group.inviteCode}\n\n` +
            `📎 ลิงก์เชิญเพื่อน (กดเพื่อเปิด LINE):\n${inviteLink}\n\n` +
            `ส่งลิงก์นี้ใน LINE ให้เพื่อนกดเข้าร่วมได้เลย`,
            [
                { label: "💰 บันทึกรายรับ", text: "บันทึกรายรับ" },
                { label: "💸 บันทึกรายจ่าย", text: "บันทึกรายจ่าย" },
                { label: "📊 รายงาน", text: "รายงาน" },
                { label: "🌐 เปิดเว็บ", text: "/เปิดเว็บ" },
            ]
        ),
    ]);
}

async function handleOAWebLogin(event: LineMessageEvent, lineUserId: string) {
    const user = await prisma.user.findUnique({ where: { lineUserId } });
    if (!user) {
        await replyMessage(event.replyToken!, [
            {
                type: "text",
                text:
                    "❌ ยังไม่พบบัญชีของคุณ\n\n" +
                    "กดลิงก์เชิญจากเว็บเพื่อเข้าร่วมกลุ่มก่อน",
            },
        ]);
        return;
    }

    // Generate one-time token (valid 10 min)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
        where: { id: user.id },
        data: { webLoginToken: token, webLoginExpiry: expiry },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const loginUrl = `${appUrl}/api/auth/line-login?token=${token}`;

    await replyMessage(event.replyToken!, [
        {
            type: "text",
            text:
                `🌐 ลิงก์เข้าเว็บของคุณ:\n${loginUrl}\n\n` +
                `⏰ ลิงก์นี้ใช้ได้ภายใน 10 นาที และใช้ได้ครั้งเดียว\n` +
                `อย่าแชร์ลิงก์นี้ให้ใคร`,
        },
    ]);
}

async function handleOALeaveGroup(
    event: LineMessageEvent,
    lineUserId: string,
) {
    const user = await getOAUser(lineUserId);
    if (!user || user.memberships.length === 0) {
        await replyMessage(event.replyToken!, [
            withQuickReply("❌ คุณยังไม่ได้เข้าร่วมกลุ่มใด", [
                { label: "📖 คู่มือ", text: "คู่มือ" },
            ])
        ]);
        return;
    }

    const activeId = user.activeGroupId ?? user.memberships[0].groupId;
    const membership = user.memberships.find((m) => m.groupId === activeId);
    if (!membership) return;

    const groupName = membership.group.name;

    await prisma.groupMember.delete({
        where: { userId_groupId: { userId: user.id, groupId: activeId } },
    });

    const remaining = user.memberships.filter((m) => m.groupId !== activeId);
    const nextGroupId = remaining.length > 0 ? remaining[0].groupId : null;
    await prisma.user.update({
        where: { id: user.id },
        data: { activeGroupId: nextGroupId },
    });

    const nextMsg = nextGroupId
        ? `\nกลุ่มปัจจุบันเปลี่ยนเป็น "${remaining[0].group.name}" แล้ว`
        : "\nคุณไม่ได้อยู่ในกลุ่มใดแล้ว";

    await replyMessage(event.replyToken!, [
        {
            type: "text",
            text: `✅ ออกจากกลุ่ม "${groupName}" แล้ว${nextMsg}`,
        },
    ]);
}

async function handleOADeleteGroup(
    event: LineMessageEvent,
    lineUserId: string,
    confirmed: boolean,
) {
    const user = await getOAUser(lineUserId);
    if (!user || user.memberships.length === 0) {
        await replyMessage(event.replyToken!, [
            withQuickReply("❌ คุณยังไม่ได้เข้าร่วมกลุ่มใด", [
                { label: "📖 คู่มือ", text: "คู่มือ" },
            ]),
        ]);
        return;
    }

    const activeId = user.activeGroupId ?? user.memberships[0].groupId;
    const membership = user.memberships.find((m) => m.groupId === activeId);
    if (!membership) return;

    if (membership.role !== "admin") {
        await replyMessage(event.replyToken!, [
            {
                type: "text",
                text:
                    `❌ คุณไม่ใช่แอดมินของกลุ่ม "${membership.group.name}"\n` +
                    `เฉพาะแอดมินเท่านั้นที่สามารถลบกลุ่มได้`,
            },
        ]);
        return;
    }

    const groupName = membership.group.name;

    if (!confirmed) {
        await replyMessage(event.replyToken!, [
            {
                type: "text",
                text:
                    `⚠️ ยืนยันการลบกลุ่ม "${groupName}" ?\n` +
                    `การลบจะลบข้อมูลธุรกรรมทั้งหมดในกลุ่มด้วย\n\n` +
                    `พิมพ์ / ลบกลุ่ม ยืนยัน เพื่อดำเนินการต่อ`,
            },
        ]);
        return;
    }

    // Delete in order: transactions → members → group
    await prisma.transaction.deleteMany({ where: { groupId: activeId } });
    await prisma.groupMember.deleteMany({ where: { groupId: activeId } });
    await prisma.group.delete({ where: { id: activeId } });

    // Clear activeGroupId for all users who had this group set
    await prisma.user.updateMany({
        where: { activeGroupId: activeId },
        data: { activeGroupId: null },
    });

    await replyMessage(event.replyToken!, [
        {
            type: "text",
            text: `🗑️ ลบกลุ่ม "${groupName}" เรียบร้อยแล้ว\nข้อมูลธุรกรรมทั้งหมดถูกลบด้วย`,
        },
    ]);
}

async function handleUserLink(
    event: LineMessageEvent,
    lineUserId: string,
    linkCode: string
) {
    if (!linkCode) {
        await replyMessage(event.replyToken!, [
            { type: "text", text: "กรุณาระบุรหัส เช่น: /mylink 123456" },
        ]);
        return;
    }

    const user = await prisma.user.findUnique({ where: { linkCode } });
    if (!user) {
        await replyMessage(event.replyToken!, [
            { type: "text", text: "❌ รหัสไม่ถูกต้องหรือหมดอายุแล้ว กรุณาสร้างรหัสใหม่บนเว็บ" },
        ]);
        return;
    }

    if (user.lineUserId && user.lineUserId !== lineUserId) {
        await replyMessage(event.replyToken!, [
            { type: "text", text: "❌ บัญชีนี้เชื่อมกับ LINE อื่นแล้ว" },
        ]);
        return;
    }

    // Check if this LINE user already has another web account
    const existingLink = await prisma.user.findUnique({ where: { lineUserId } });
    if (existingLink && existingLink.id !== user.id) {
        await replyMessage(event.replyToken!, [
            { type: "text", text: "❌ LINE นี้เชื่อมกับบัญชีเว็บอื่นแล้ว" },
        ]);
        return;
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { lineUserId, linkCode: null },
    });

    await replyMessage(event.replyToken!, [
        {
            type: "text",
            text: `✅ เชื่อม LINE กับบัญชี "${user.name}" สำเร็จ!\nตอนนี้สามารถบันทึกรายรับ - รายจ่ายผ่าน LINE ได้แล้ว`,
        },
    ]);
}

// Type definitions
interface LineWebhookBody {
    events: LineEvent[];
}

interface LineEvent {
    type: string;
    replyToken?: string;
    source: {
        type: "user" | "group" | "room";
        userId?: string;
        groupId?: string;
    };
    message?: {
        type: string;
        text: string;
    };
}

interface LineMessageEvent extends LineEvent {
    replyToken: string;
    message: {
        type: string;
        text: string;
    };
};
