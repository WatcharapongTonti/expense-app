export default function HelpPage() {
    return (
        <div className="p-8 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">คู่มือการใช้งาน</h1>
            <p className="text-slate-500 text-sm mb-8">ระบบบันทึกรายรับ-รายจ่ายกลุ่ม</p>

            <div className="space-y-6">
                {/* Web */}
                <Section icon="🌐" title="การใช้งานผ่านเว็บ">
                    <Step n={1} title="สมัครสมาชิก / เข้าสู่ระบบ">
                        ไปที่หน้า <Code>/register</Code> เพื่อสมัคร หรือ <Code>/login</Code> เพื่อเข้าระบบ
                    </Step>
                    <Step n={2} title="สร้างกลุ่ม">
                        ไปที่เมนู <b>กลุ่ม</b> แล้วกด <b>+ สร้างกลุ่มใหม่</b> ตั้งชื่อกลุ่มแล้วกด
                        บันทึก ระบบจะสร้าง <b>รหัสเชิญ</b> ให้อัตโนมัติ
                    </Step>
                    <Step n={3} title="เชิญสมาชิก">
                        ในหน้ากลุ่ม คัดลอก <b>ลิงก์เชิญ LINE OA</b> แล้วส่งให้สมาชิก
                        สมาชิกเปิดลิงก์ใน LINE แล้วกด <b>เข้าร่วมกลุ่ม</b>
                    </Step>
                    <Step n={4} title="บันทึกรายการ">
                        กด <b>+ บันทึกรายการ</b> ในหน้ากลุ่ม เลือกประเภท ใส่จำนวนเงินและรายละเอียด
                        แล้วกด <b>บันทึก</b>
                    </Step>
                </Section>

                {/* LINE OA */}
                <Section icon="💚" title="การใช้งานผ่าน LINE OA">
                    <p className="text-sm text-slate-500 mb-3">
                        แชทกับ LINE OA แบบ 1-on-1 แล้วพิมพ์คำสั่งต่อไปนี้
                    </p>

                    <CommandTable
                        title="บันทึกรายการ"
                        rows={[
                            ["+500 ค่าขาย", "บันทึกรายรับ 500 บาท รายละเอียด 'ค่าขาย'"],
                            ["-200 ค่าอาหาร", "บันทึกรายจ่าย 200 บาท รายละเอียด 'ค่าอาหาร'"],
                        ]}
                    />
                    <CommandTable
                        title="ดูข้อมูล"
                        rows={[
                            ["รายงาน", "ดูสรุปรายรับ-รายจ่าย พร้อมแยกรายคน"],
                            ["กลุ่ม", "ดูรายการกลุ่มทั้งหมด + กลุ่มปัจจุบัน"],
                        ]}
                    />
                    <CommandTable
                        title="จัดการกลุ่ม"
                        rows={[
                            ["/เลือก 2", "เปลี่ยนกลุ่มปัจจุบันเป็นกลุ่มที่ 2 (ดูหมายเลขจาก 'กลุ่ม')"],
                            ["/join ABCD12", "เข้าร่วมกลุ่มด้วยรหัสเชิญ"],
                            ["/สร้าง ชื่อกลุ่ม", "สร้างกลุ่มใหม่และเป็นแอดมิน"],
                            ["/ออก", "ออกจากกลุ่มปัจจุบัน"],
                            ["/ลบกลุ่ม", "ลบกลุ่มปัจจุบัน (เฉพาะแอดมิน)"],
                            ["/ลบกลุ่ม ยืนยัน", "ยืนยันการลบกลุ่ม"],
                        ]}
                    />
                    <CommandTable
                        title="เข้าเว็บ"
                        rows={[
                            ["/เปิดเว็บ", "รับลิงก์เข้าสู่ระบบเว็บแบบ one-click (ใช้ได้ 10 นาที)"],
                            ["/mylink XXXXXX", "เชื่อม LINE กับบัญชีเว็บที่มีอยู่แล้ว (รับรหัสจากหน้าโปรไฟล์)"],
                        ]}
                    />
                    <CommandTable
                        title="อื่นๆ"
                        rows={[
                            ["help หรือ ?", "แสดงรายการคำสั่งทั้งหมด"],
                        ]}
                    />
                </Section>

                {/* LINE Group */}
                <Section icon="👥" title="การใช้งานในกลุ่ม LINE (แบบเก่า)">
                    <p className="text-sm text-slate-500 mb-3">
                        เพิ่มบอทเข้ากลุ่ม LINE แล้วเชื่อมกลุ่มก่อน จึงจะบันทึกรายการได้
                    </p>
                    <CommandTable
                        title="คำสั่ง"
                        rows={[
                            ["/link ABCD12", "เชื่อมกลุ่ม LINE กับกลุ่มเว็บ (ใช้รหัสเชิญจากเว็บ)"],
                            ["+500 ค่าขาย", "บันทึกรายรับ"],
                            ["-200 ค่าอาหาร", "บันทึกรายจ่าย"],
                            ["รายงาน", "ดูสรุปรายรับ-รายจ่ายของกลุ่ม"],
                        ]}
                    />
                </Section>

                {/* Tips */}
                <Section icon="💡" title="เคล็ดลับ">
                    <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
                        <li>สมาชิกสามารถอยู่ได้หลายกลุ่ม ใช้ <Code>กลุ่ม</Code> และ <Code>/เลือก N</Code> เพื่อสลับกลุ่ม</li>
                        <li>หน้ากลุ่มในเว็บแสดงสรุปรายรับ-รายจ่ายแยกรายคนอัตโนมัติ</li>
                        <li>แอดมินสามารถลบรายการของสมาชิกคนใดก็ได้</li>
                        <li>การลบกลุ่มจะลบข้อมูลธุรกรรมทั้งหมดด้วย ไม่สามารถกู้คืนได้</li>
                        <li>ลิงก์ <Code>/เปิดเว็บ</Code> ใช้ได้ครั้งเดียวและหมดอายุใน 10 นาที อย่าแชร์ให้ใคร</li>
                    </ul>
                </Section>
            </div>
        </div>
    );
}

function Section({
    icon,
    title,
    children,
}: {
    icon: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
                <span className="text-xl">{icon}</span>
                <h2 className="font-semibold text-slate-900">{title}</h2>
            </div>
            <div className="px-5 py-4 space-y-4">{children}</div>
        </div>
    );
}

function Step({
    n,
    title,
    children,
}: {
    n: number;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex gap-3">
            <div className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">
                {n}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-900 mb-0.5">{title}</p>
                <p className="text-sm text-slate-500">{children}</p>
            </div>
        </div>
    );
}

function CommandTable({
    title,
    rows,
}: {
    title: string;
    rows: [string, string][];
}) {
    return (
        <div className="mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                {title}
            </p>
            <div className="rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100">
                {rows.map(([cmd, desc]) => (
                    <div key={cmd} className="flex items-start gap-3 px-3 py-2.5">
                        <code className="shrink-0 text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                            {cmd}
                        </code>
                        <span className="text-xs text-slate-500">{desc}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Code({ children }: { children: React.ReactNode; }) {
    return (
        <code className="text-xs bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">
            {children}
        </code>
    );
}
