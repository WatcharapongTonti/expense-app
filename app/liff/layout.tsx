import { Suspense } from "react";

export default function LiffLayout({ children }: { children: React.ReactNode; }) {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-white">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-[#06C755] rounded-full animate-spin" />
                </div>
            }
        >
            {children}
        </Suspense>
    );
}
