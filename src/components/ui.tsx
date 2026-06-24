/** 共享 UI 组件：从各 page 抽取的复用图标与控件。 */

export function SearchIcon() {
    return (
        <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="7" cy="7" r="4.5"/>
            <line x1="10.2" y1="10.2" x2="14" y2="14"/>
        </svg>
    );
}

export function RefreshIcon({className = "h-4 w-4"}: { className?: string }) {
    return (
        <svg
            aria-hidden="true"
            className={className}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M13.65 8a5.65 5.65 0 1 1-1.55-3.9"/>
            <path d="M13.6 2.3v2.6H11"/>
        </svg>
    );
}

export function Segmented({
    options,
    value,
    onChange,
    disabled,
}: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}) {
    return (
        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-neutral-200 p-1 dark:bg-neutral-900">
            {options.map((option) => {
                const active = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        disabled={disabled}
                        onClick={() => onChange(option.value)}
                        className={`relative h-8 rounded-md px-3.5 text-xs font-semibold transition-all disabled:cursor-wait disabled:opacity-60 ${
                            active
                                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-50"
                                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
                        }`}
                    >
                        {option.label}
                        {active && <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-[#ca9372]"/>}
                    </button>
                );
            })}
        </div>
    );
}

export function RankBadge({rank, delta}: { rank: number; delta?: number }) {
    const top = rank <= 3;

    return (
        <div className="text-center">
            <div className={`text-base font-black tabular-nums ${top ? "text-[#ca9372]" : "text-neutral-700 dark:text-neutral-300"}`}>
                {rank}
            </div>
            {delta != null && delta !== 0 && (
                <div className={`flex items-center justify-center gap-0.5 text-[10px] font-semibold tabular-nums ${delta > 0 ? "text-emerald-500" : "text-red-500"}`}>
                    <span className="leading-none">{delta > 0 ? "▲" : "▼"}</span>
                    {Math.abs(delta)}
                </div>
            )}
        </div>
    );
}

export function ErrorBanner({message}: { message: string | null | undefined }) {
    if (!message) return null;
    return (
        <div
            className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {message}
        </div>
    );
}

export function PaginationNav({
    page,
    visiblePages,
    loading,
    hasNext,
    nextPage,
    prevLabel = "Prev",
    nextLabel = "Next",
    onPageChange,
    windowSize,
}: {
    page: number;
    visiblePages: number[];
    loading?: boolean;
    hasNext?: boolean;
    nextPage?: number | null;
    prevLabel?: string;
    nextLabel?: string;
    onPageChange: (page: number) => void;
    /** 当前页前后裁剪的按钮半径；不传则显示全部 visiblePages。 */
    windowSize?: number;
}) {
    if (visiblePages.length === 0) return null;

    const pages = typeof windowSize === "number"
        ? visiblePages.slice(Math.max(0, page - windowSize), Math.min(page + windowSize, visiblePages.length))
        : visiblePages;

    return (
        <nav className="mt-5 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
            <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="h-9 rounded border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-200/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
                {prevLabel}
            </button>
            {pages.map((pageNumber) => {
                const active = pageNumber === page;

                return (
                    <button
                        key={pageNumber}
                        type="button"
                        aria-current={active ? "page" : undefined}
                        disabled={loading}
                        onClick={() => onPageChange(pageNumber)}
                        className={`h-9 rounded border px-3 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                            active
                                ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950"
                                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-200/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        }`}
                        style={{minWidth: "2.25rem"}}
                    >
                        {pageNumber}
                    </button>
                );
            })}
            <button
                type="button"
                disabled={loading || !hasNext}
                onClick={() => onPageChange(nextPage ?? page + 1)}
                className="h-9 rounded border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-200/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
                {nextLabel}
            </button>
        </nav>
    );
}
