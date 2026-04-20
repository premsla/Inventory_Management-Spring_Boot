import React from "react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
    title: string;
    subtitle: string;
    searchPlaceholder?: string;
    icon?: string;
    children?: React.ReactNode;
    searchValue?: string;
    onSearchChange?: (val: string) => void;
}

const Header: React.FC<HeaderProps> = ({
    title,
    subtitle,
    searchPlaceholder = "Search enterprise vitals...",
    icon = "search",
    children,
    searchValue,
    onSearchChange
}) => {
    const navigate = useNavigate();
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const businessContext = user?.business?.name || "All Branches";
    const userName: string = user?.name || "U";

    return (
        <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl flex justify-between items-center px-8 z-40">
            <div className="flex items-center gap-4 flex-1">
                <div className="relative w-full max-w-md group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                    <input
                        className="w-full bg-slate-200/30 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#C6FF3D]/50 transition-all outline-none"
                        placeholder={searchPlaceholder}
                        type="text"
                        value={searchValue || ""}
                        onChange={(e) => onSearchChange?.(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden lg:flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg text-sm font-medium text-[#496400]">
                    <span className="material-symbols-outlined text-base">location_on</span>
                    <span>Branch: {businessContext}</span>
                    <span className="material-symbols-outlined text-base cursor-pointer">expand_more</span>
                </div>

                {children}

                <button
                    onClick={() => navigate("/profile")}
                    className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-[#C6FF3D] font-bold text-sm border-2 border-[#C6FF3D]/30 hover:border-[#C6FF3D] transition-all hover:scale-105 shrink-0"
                    title="Profile"
                >
                    {userName.charAt(0).toUpperCase()}
                </button>
            </div>
        </header>
    );
};

export default Header;
