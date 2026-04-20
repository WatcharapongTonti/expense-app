/** Generate a random invite code (6 alphanumeric uppercase chars) */
export function generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
        code += chars[b % chars.length];
    }
    return code;
}

/** Generate a numeric link code (6 digits) */
export function generateLinkCode(): string {
    const bytes = new Uint8Array(3);
    crypto.getRandomValues(bytes);
    const num = ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) % 1000000;
    return num.toString().padStart(6, "0");
}
