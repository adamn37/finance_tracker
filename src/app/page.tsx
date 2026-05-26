"use client";

import React, { useState, useEffect } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import Header from "@/components/dashboard/Header";
import OverviewTab from "@/components/dashboard/tabs/OverviewTab";
import PortfolioTab from "@/components/dashboard/tabs/PortfolioTab";
import DailyTab from "@/components/dashboard/tabs/DailyTab";
import AnalyticsTab from "@/components/dashboard/tabs/AnalyticsTab";
import SubscriptionsTab from "@/components/dashboard/tabs/SubscriptionsTab";
import CardsTab from "@/components/dashboard/tabs/CardsTab";
import SwitchesTab from "@/components/dashboard/tabs/SwitchesTab";
import TradingTab from "@/components/dashboard/tabs/TradingTab";
import Link from "next/link";

export default function Dashboard() {
  const financeData = useFinanceData();
  const { 
    isLoaded, 
    portfolio, 
    transactions, 
    switches, 
    subscriptions, 
    budgets, 
    accounts,
    propAccounts,
    propTransactions 
  } = financeData;
  
const [activeTab, setActiveTab] = useState<"overview" | "daily" | "analytics" | "subscriptions" | "switches" | "cards" | "portfolio" | "trading">("overview");  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const [hasAutoFetched, setHasAutoFetched] = useState(false);
  useEffect(() => { 
    if (isLoaded && portfolio.length > 0 && !hasAutoFetched) { 
      financeData.refreshPrices(); 
      setHasAutoFetched(true); 
    } 
  }, [isLoaded, portfolio.length, hasAutoFetched, financeData]);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  const exportData = () => {
    const data = { transactions, switches, subscriptions, budgets, accounts, portfolio, propAccounts, propTransactions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `wealthbase_backup.json`; a.click();
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-400">Loading your finances...</div>;

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-800 dark:text-gray-100 flex flex-col transition-colors duration-200">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} exportData={exportData} />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">{greeting} 👋</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here is what's happening with your money today.</p>
        </div>

        {/* --- TABS --- */}
        {activeTab === "overview" && <OverviewTab data={financeData} setActiveTab={setActiveTab} selectedMonth={selectedMonth} />}
        {activeTab === "portfolio" && <PortfolioTab data={financeData} />}
        {activeTab === "daily" && <DailyTab data={financeData} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />}
        {activeTab === "analytics" && <AnalyticsTab data={financeData} selectedMonth={selectedMonth} />}
        {activeTab === "subscriptions" && <SubscriptionsTab data={financeData} />}
        {activeTab === "cards" && <CardsTab data={financeData} />}
        {activeTab === "switches" && <SwitchesTab data={financeData} />}
        {activeTab === "trading" && <TradingTab data={financeData} />} {/* <-- Add this line */}
      </main>
    </div>
  );
}