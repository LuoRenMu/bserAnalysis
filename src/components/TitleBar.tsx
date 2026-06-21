import {ReactNode, useState} from "react";
import {getCurrentWindow} from "@tauri-apps/api/window";

const win = getCurrentWindow();

export default function TitleBar({theme, onToggleTheme}: {
    theme: "light" | "dark";
    onToggleTheme: () => void;
}) {
    const [maximized, setMaximized] = useState(false);

    const toggleMaximize = async () => {
        const m = await win.toggleMaximize();
        setMaximized(m ?? !maximized);
    };

    return (
        <header
            data-tauri-drag-region
            className="flex items-center justify-between h-11 select-none
                 bg-white/80 dark:bg-neutral-950/80
                 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800"
        >
            {/* left — app title */}
            <div className="flex items-center gap-2 pl-3">
                <span
                    className="text-xs font-semibold tracking-wide text-neutral-500 dark:text-neutral-400  select-none">
                  BSER Analysis
                </span>
            </div>

            {/* right — theme toggle + window controls */}
            <div className="flex h-full">
                {/* theme toggle */}
                <WindowButton onClick={onToggleTheme} label="Toggle theme">
                    {theme === "dark" ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                             strokeWidth="1.2" strokeLinecap="round">
                            <circle cx="8" cy="8" r="3"/>
                            <line x1="8" y1="1" x2="8" y2="3"/>
                            <line x1="8" y1="13" x2="8" y2="15"/>
                            <line x1="1" y1="8" x2="3" y2="8"/>
                            <line x1="13" y1="8" x2="15" y2="8"/>
                            <line x1="3.05" y1="3.05" x2="4.46" y2="4.46"/>
                            <line x1="11.54" y1="11.54" x2="12.95" y2="12.95"/>
                            <line x1="3.05" y1="12.95" x2="4.46" y2="11.54"/>
                            <line x1="11.54" y1="4.46" x2="12.95" y2="3.05"/>
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                             strokeWidth="1.2" strokeLinecap="round">
                            <path d="M10.5 2.5A5.5 5.5 0 1 0 13.5 8a4 4 0 0 1-3-5.5z"/>
                        </svg>
                    )}
                </WindowButton>
                <WindowButton onClick={() => win.minimize()} label="Minimize">
                    <MinimizeIcon/>
                </WindowButton>
                <WindowButton onClick={toggleMaximize} label="Maximize">
                    {maximized ? <RestoreIcon/> : <MaximizeIcon/>}
                </WindowButton>
                <WindowButton onClick={() => win.close()} label="Close" close>
                    <CloseIcon/>
                </WindowButton>
            </div>
        </header>
    );
}

/* ---------- window-control button ---------- */

function WindowButton({onClick, label, close, children,}: {
    onClick: () => void;
    label: string;
    close?: boolean;
    children: ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            className="flex items-center justify-center w-11 h-full
                 transition-colors duration-150
                 hover:bg-neutral-200/80 dark:hover:bg-neutral-800/80
                 data-close:hover:bg-red-500 data-close:hover:text-white
                 text-neutral-500 dark:text-neutral-400"
            data-close={close || undefined}
        >
            {children}
        </button>
    );
}

/* ---------- inline SVG icons (16px, 1px stroke) ---------- */

function MinimizeIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1"
             strokeLinecap="round">
            <line x1="3" y1="12.5" x2="13" y2="12.5"/>
        </svg>
    );
}

function MaximizeIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="2" y="2" width="12" height="12" rx="1"/>
        </svg>
    );
}

function RestoreIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="5.5" y="2" width="9" height="9" rx="1"/>
            <path d="M3 5.5h3v4h4v3"/>
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1"
             strokeLinecap="round">
            <line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/>
            <line x1="12.5" y1="3.5" x2="3.5" y2="12.5"/>
        </svg>
    );
}
