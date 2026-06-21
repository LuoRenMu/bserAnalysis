import {useEffect, useId, useState, type ReactNode} from "react";

export type DoubleConfirmStep = {
    title: string;
    description?: ReactNode;
    confirmLabel: string;
};

export type DoubleConfirmDialogProps = {
    open: boolean;
    firstStep: DoubleConfirmStep;
    secondStep: DoubleConfirmStep;
    cancelLabel?: string;
    pendingLabel?: string;
    confirmTone?: "primary" | "danger";
    showRememberOption?: boolean;
    onCancel: () => void;
    onConfirm: (remember?: boolean) => void | Promise<void>;
};

export default function DoubleConfirmDialog({
    open,
    firstStep,
    secondStep,
    cancelLabel = "取消",
    pendingLabel = "处理中...",
    confirmTone = "danger",
    showRememberOption = false,
    onCancel,
    onConfirm,
}: DoubleConfirmDialogProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [pending, setPending] = useState(false);
    const [remember, setRemember] = useState(false);
    const titleId = useId();
    const descriptionId = useId();
    const currentStep = step === 1 ? firstStep : secondStep;

    useEffect(() => {
        if (!open) {
            setStep(1);
            setPending(false);
            setRemember(false);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !pending) onCancel();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onCancel, open, pending]);

    if (!open) return null;

    const handlePrimaryClick = async () => {
        if (step === 1) {
            setStep(2);
            return;
        }

        setPending(true);
        try {
            await onConfirm(remember);
        } finally {
            setPending(false);
        }
    };

    const primaryClass =
        confirmTone === "danger"
            ? "bg-red-600 text-white hover:bg-red-500 disabled:bg-red-800/60"
            : "bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-200 dark:disabled:bg-neutral-300";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
            role="presentation"
            onMouseDown={pending ? undefined : onCancel}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={currentStep.description ? descriptionId : undefined}
                className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="mb-4">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            {step}/2
                        </span>
                        <h2 id={titleId} className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
                            {currentStep.title}
                        </h2>
                    </div>
                    {currentStep.description && (
                        <div id={descriptionId} className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                            {currentStep.description}
                        </div>
                    )}
                </div>

                {showRememberOption && step === 2 && (
                    <div className="mb-4 flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="remember-choice"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-2 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800"
                        />
                        <label
                            htmlFor="remember-choice"
                            className="text-sm text-neutral-600 dark:text-neutral-300"
                        >
                            记住我的选择，下次不再询问
                        </label>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        disabled={pending}
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${primaryClass}`}
                        disabled={pending}
                        onClick={handlePrimaryClick}
                    >
                        {pending && step === 2 ? pendingLabel : currentStep.confirmLabel}
                    </button>
                </div>
            </section>
        </div>
    );
}
