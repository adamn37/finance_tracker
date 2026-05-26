"use client";

import React from "react";
import { Wallet, Sun, Moon, DownloadCloud, ChevronRight, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  exportData: () => void;
}

const TAB_NAMES: Record<string, string> = {
  daily: "Daily Activity",
  portfolio: "Portfolio",
  analytics: "Analytics",
  subscriptions: "Subscriptions",
  cards: "Accounts",
  switches: "Bonuses",
  trading: "Prop Trading Hub"
};

export default function Header({ activeTab, setActiveTab, isDarkMode, toggleDarkMode, exportData }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
      return;
    }
    router.push("/auth");
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-8">
        
        {/* Left: Logo & Mobile Actions */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2">
            <div className="bg-black dark:bg-white text-white dark:text-black p-1.5 rounded-lg flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">WealthBase</h1>
          </div>
          
          <div className="md:hidden flex items-center gap-4">
            <button onClick={toggleDarkMode} className="text-gray-400 hover:text-black dark:hover:text-white transition">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={handleLogout} className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Center: Dynamic Breadcrumb Navigation */}
        <nav className="flex items-center w-full md:w-auto overflow-x-auto hide-scrollbar gap-2 pb-1 md:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button 
            onClick={() => setActiveTab("overview")} 
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === "overview" ? "bg-black dark:bg-white text-white dark:text-black shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"}`}
          >
            Dashboard
          </button>
          
          {/* If the user is inside a specific widget view, show the breadcrumb */}
          {activeTab !== "overview" && (
            <>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
              <button className="px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap bg-black dark:bg-white text-white dark:text-black shadow-sm">
                {TAB_NAMES[activeTab] || activeTab}
              </button>
            </>
          )}
        </nav>

        {/* Right: Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button onClick={exportData} className="text-gray-400 hover:text-black dark:hover:text-white transition flex items-center gap-1.5 text-sm font-medium">
            <DownloadCloud size={16} /> Backup
          </button>
          
          <button onClick={toggleDarkMode} className="text-gray-400 hover:text-black dark:hover:text-white transition flex items-center gap-1.5 text-sm font-medium">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
          
          <button onClick={handleLogout} className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition flex items-center gap-1.5 text-sm font-medium mr-1">
            <LogOut size={16} /> <span className="hidden lg:inline">Log Out</span>
          </button>
          
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
              JS
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}