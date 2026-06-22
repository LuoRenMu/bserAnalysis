import {NavLink} from "react-router-dom";
import {useAtomValue} from "jotai";
import {useTranslation} from "react-i18next";
import {injectAtom} from "../store";
import {useState} from "react";

export default function Sidebar() {
    const {t} = useTranslation();
    const injected = useAtomValue(injectAtom);
    const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);

    return (
        <aside
            className="flex flex-col w-48 h-full select-none
                       bg-neutral-50 dark:bg-neutral-900
                       border-r border-neutral-200 dark:border-neutral-800"
        >
            {/* nav links */}
            <nav className="flex flex-col gap-0.5 p-2">
                <NavLink to="/" end
                         className="flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors
                                    text-neutral-600 dark:text-neutral-400
                                    hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60
                                    aria-[current=page]:bg-neutral-200/80 aria-[current=page]:dark:bg-neutral-800/80
                                    aria-[current=page]:text-neutral-900 aria-[current=page]:dark:text-neutral-100">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                         strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1.5" y="1.5" width="13" height="13" rx="1"/>
                        <line x1="1.5" y1="5.5" x2="14.5" y2="5.5"/>
                        <line x1="5.5" y1="1.5" x2="5.5" y2="14.5"/>
                    </svg>
                    {t('nav.overlay')}
                </NavLink>
                <NavLink to="/search"
                         className="flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors
                                    text-neutral-600 dark:text-neutral-400
                                    hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60
                                    aria-[current=page]:bg-neutral-200/80 aria-[current=page]:dark:bg-neutral-800/80
                                    aria-[current=page]:text-neutral-900 aria-[current=page]:dark:text-neutral-100">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                         strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="7" cy="7" r="4.5"/>
                        <line x1="10.2" y1="10.2" x2="14" y2="14"/>
                    </svg>
                    {t('nav.search')}
                </NavLink>
                <NavLink to="/characters"
                         className="flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors
                                    text-neutral-600 dark:text-neutral-400
                                    hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60
                                    aria-[current=page]:bg-neutral-200/80 aria-[current=page]:dark:bg-neutral-800/80
                                    aria-[current=page]:text-neutral-900 aria-[current=page]:dark:text-neutral-100">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                         strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="5" r="3"/>
                        <path d="M2.5 14a5.5 5.5 0 0 1 11 0"/>
                    </svg>
                    {t('nav.characters')}
                </NavLink>

                {/* Leaderboard with submenu */}
                <div>
                    <button
                        onClick={() => setLeaderboardExpanded(!leaderboardExpanded)}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm rounded transition-colors
                                   text-neutral-600 dark:text-neutral-400
                                   hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
                    >
                        <div className="flex items-center gap-2">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                                 strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="8" width="3" height="6" rx="0.5"/>
                                <rect x="6.5" y="3.5" width="3" height="10.5" rx="0.5"/>
                                <rect x="11" y="10" width="3" height="4" rx="0.5"/>
                            </svg>
                            {t('nav.leaderboard')}
                        </div>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
                             strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                             className={`transition-transform ${leaderboardExpanded ? "rotate-180" : ""}`}>
                            <path d="M3 4.5L6 7.5L9 4.5"/>
                        </svg>
                    </button>

                    {leaderboardExpanded && (
                        <div className="flex flex-col gap-0.5 ml-4 mt-0.5">
                            <NavLink to="/leaderboard"
                                     className="flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors
                                                text-neutral-600 dark:text-neutral-400
                                                hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60
                                                aria-[current=page]:bg-neutral-200/80 aria-[current=page]:dark:bg-neutral-800/80
                                                aria-[current=page]:text-neutral-900 aria-[current=page]:dark:text-neutral-100">
                                {t('leaderboard.playerRank')}
                            </NavLink>
                            <NavLink to="/character-leaderboard"
                                     className="flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors
                                                text-neutral-600 dark:text-neutral-400
                                                hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60
                                                aria-[current=page]:bg-neutral-200/80 aria-[current=page]:dark:bg-neutral-800/80
                                                aria-[current=page]:text-neutral-900 aria-[current=page]:dark:text-neutral-100">
                                {t('leaderboard.heroRank')}
                            </NavLink>
                            <NavLink to="/character-stats"
                                     className="flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors
                                                text-neutral-600 dark:text-neutral-400
                                                hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60
                                                aria-[current=page]:bg-neutral-200/80 aria-[current=page]:dark:bg-neutral-800/80
                                                aria-[current=page]:text-neutral-900 aria-[current=page]:dark:text-neutral-100">
                                {t('leaderboard.heroStats')}
                            </NavLink>
                        </div>
                    )}
                </div>

                <NavLink to="/settings"
                         className="flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors
                                    text-neutral-600 dark:text-neutral-400
                                    hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60
                                    aria-[current=page]:bg-neutral-200/80 aria-[current=page]:dark:bg-neutral-800/80
                                    aria-[current=page]:text-neutral-900 aria-[current=page]:dark:text-neutral-100">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                         strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="8" cy="8" r="2.5"/>
                        <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/>
                    </svg>
                    {t('nav.settings')}
                </NavLink>
            </nav>

            {/* spacer */}
            <div className="flex-1"/>

            {/* injected status — bottom */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-neutral-200 dark:border-neutral-800">
                <span className={`inline-block w-2 h-2 rounded-full ${injected ? "bg-green-500" : "bg-red-500"}`}/>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 select-none">
                    {injected ? t('common.active') : t('common.inactive')}
                </span>
            </div>
        </aside>
    );
}
