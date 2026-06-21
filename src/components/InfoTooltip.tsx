import { useState, type ReactNode } from "react";

/**
 * 通用悬浮提示：包裹任意图标，鼠标移入显示 标题 + 说明 卡片。
 * 卡片用 fixed 定位跟随鼠标，避免被父容器 overflow 裁剪。
 */
export default function InfoTooltip({
    title,
    body,
    children,
}: {
    title: string;
    body?: string;
    children: ReactNode;
}) {
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

    if (!title) return <>{children}</>;

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={(e) => setPos({ x: e.clientX, y: e.clientY })}
            onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setPos(null)}
        >
            {children}
            {pos && (
                <div
                    className="pointer-events-none fixed z-50 w-64 -translate-x-1/2 -translate-y-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-left shadow-xl"
                    style={{ left: pos.x, top: pos.y - 12 }}
                >
                    <div className="mb-1 text-sm font-bold text-neutral-50">{title}</div>
                    {body && (
                        <div className="whitespace-pre-line text-xs leading-relaxed text-neutral-300">{body}</div>
                    )}
                </div>
            )}
        </div>
    );
}
