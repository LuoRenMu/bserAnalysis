export default function AboutSection() {
    return (
        <section
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <h2 className="text-sm font-bold text-neutral-950 dark:text-neutral-50">关于</h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    bserAnalysis
                </p>
            </div>

            <div className="space-y-3 p-4 text-sm">
                <div>
                    <span className="text-neutral-500 dark:text-neutral-400">版本：</span>
                    <span className="font-mono">0.1.0</span>
                </div>
                <div>
                    <span className="text-neutral-500 dark:text-neutral-400">仓库：</span>
                    <span className="font-mono">
                         <a
                             href="https://github.com/luorenmu/bseranalysis"
                             target="_blank"
                             rel="noopener noreferrer"
                             className="text-blue-600 hover:underline dark:text-blue-400"
                         >
                        BserAnalysis
                    </a>
                    </span>
                </div>
                <div>
                    <span className="text-neutral-500 dark:text-neutral-400">数据源：</span>
                    <a
                        href="https://dak.gg/er"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                        Dak.gg
                    </a>
                </div>
                <div>
                    <span className="text-neutral-500 dark:text-neutral-400">反馈：</span>
                    <a
                        href="https://github.com/luorenmu/bseranalysis/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                        反馈
                    </a>
                </div>
            </div>
        </section>
    );
}
