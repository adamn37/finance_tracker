"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Check, Settings2, Wallet, TrendingUp, PieChart as PieIcon, BarChart3, Layers, Clock, Calendar as CalendarIcon, Activity, Sparkles, ArrowUpRight, ArrowDownLeft, Target, X, CreditCard } from "lucide-react";
import WidgetWrapper from "../WidgetWrapper";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, parseISO, isSameMonth } from "date-fns";
import { useRouter } from "next/navigation";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#06b6d4", "#84cc16"];

const AVAILABLE_WIDGETS = [
  { id: "netWorth", label: "Total Net Worth", icon: Wallet }, 
  { id: "portfolioTotal", label: "Portfolio Performance", icon: TrendingUp }, 
  { id: "allocation", label: "Asset Allocation", icon: PieIcon }, 
  { id: "portfolio", label: "Top Holdings", icon: BarChart3 }, 
  { id: "monthly", label: "Monthly Spending", icon: PieIcon },
  { id: "propTrading", label: "Prop Trading Hub", icon: Target },
  { id: "switches", label: "Active Bonuses", icon: Clock }, 
  { id: "upcoming", label: "Upcoming Payments", icon: CalendarIcon }, 
  { id: "recent", label: "Recent Activity", icon: Activity }, 
  { id: "ai", label: "AI Insights (Pro)", icon: Sparkles }
];

export default function OverviewTab({ data, setActiveTab, selectedMonth }: { data: any, setActiveTab: any, selectedMonth: Date }) {
  const router = useRouter();
  const [isEditingDashboard, setIsEditingDashboard] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(["netWorth", "portfolioTotal", "allocation", "portfolio", "upcoming", "monthly"]);
  const [draggedWidgetIdx, setDraggedWidgetIdx] = useState<number | null>(null);

  // New Modal State
  const [isNetWorthModalOpen, setIsNetWorthModalOpen] = useState(false);

  useEffect(() => {
    const savedWidgets = localStorage.getItem("dashboardLayout");
    if (savedWidgets) setVisibleWidgets(JSON.parse(savedWidgets));
  }, []);

  const toggleWidget = (id: string) => {
    setVisibleWidgets(prev => {
      const newLayout = prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id];
      localStorage.setItem("dashboardLayout", JSON.stringify(newLayout));
      return newLayout;
    });
  };

  const handleDragStart = (index: number) => setDraggedWidgetIdx(index);
  const handleDragEnter = (index: number) => {
    if (draggedWidgetIdx === null || draggedWidgetIdx === index) return;
    setVisibleWidgets((prev) => {
      const newLayout = [...prev];
      const draggedItem = newLayout[draggedWidgetIdx];
      newLayout.splice(draggedWidgetIdx, 1);
      newLayout.splice(index, 0, draggedItem);
      localStorage.setItem("dashboardLayout", JSON.stringify(newLayout));
      setDraggedWidgetIdx(index); 
      return newLayout;
    });
  };
  const handleDragEnd = () => setDraggedWidgetIdx(null);

  // Data calculations for widgets
  const currentTransactions = data.transactions.filter((tx: any) => isSameMonth(parseISO(tx.date), selectedMonth));
  const stats = useMemo(() => {
    const income = currentTransactions.filter((t: any) => t.type === "income").reduce((sum: number, t: any) => sum + t.amount, 0);
    const expense = currentTransactions.filter((t: any) => t.type === "expense").reduce((sum: number, t: any) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [currentTransactions]);

  const totalAccountsBalance = data.accounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
  const totalBrokerCash = (data.brokerages || []).reduce((sum: number, b: any) => sum + Number(b.cash_balance || 0), 0);
  
  const groupedAssets = data.portfolio.reduce((acc: any, item: any) => {
    if (!acc[item.symbol]) { acc[item.symbol] = { symbol: item.symbol, name: item.name, type: item.type, imageUrl: item.imageUrl, totalAmount: 0, totalCost: 0 }; }
    acc[item.symbol].totalAmount += item.amount;
    acc[item.symbol].totalCost += (item.amount * (item.purchasePrice || 0));
    return acc;
  }, {});

  const portfolioWithMetrics = Object.values(groupedAssets).filter((a: any) => a.totalAmount > 0.000001).map((asset: any) => {
      const currentPriceToUse = data.livePrices[asset.symbol] || (asset.totalAmount > 0 ? (asset.totalCost / asset.totalAmount) : 0); 
      const liveValue = asset.totalAmount * currentPriceToUse;
      const profitLoss = liveValue - asset.totalCost;
      const ror = asset.totalCost > 0 ? (profitLoss / asset.totalCost) * 100 : 0;
      return { ...asset, liveValue, profitLoss, ror, isProfit: profitLoss >= 0 }
  });

  const totalPortfolioCost = portfolioWithMetrics.reduce((sum: number, a: any) => sum + a.totalCost, 0);
  const totalPortfolioValue = portfolioWithMetrics.reduce((sum: number, a: any) => sum + a.liveValue, 0);
  const totalPortfolioPL = totalPortfolioValue - totalPortfolioCost;
  const totalPortfolioROR = totalPortfolioCost > 0 ? (totalPortfolioPL / totalPortfolioCost) * 100 : 0;
  
  // Adjusted to include uninvested broker cash
  const netWorth = totalPortfolioValue + totalAccountsBalance + totalBrokerCash;
  
  const topHoldings = [...portfolioWithMetrics].sort((a, b) => b.liveValue - a.liveValue).slice(0, 3);
  const upcomingSubs = [...data.subscriptions].sort((a, b) => {
    let diffA = a.billingDay - new Date().getDate(); if(diffA < 0) diffA += 30; 
    let diffB = b.billingDay - new Date().getDate(); if(diffB < 0) diffB += 30;
    return diffA - diffB;
  });
  const activeSwitches = data.switches.filter((sw: any) => sw.status === "active").sort((a: any, b: any) => new Date(a.requirements.payInDeadline).getTime() - new Date(b.requirements.payInDeadline).getTime());

  const renderWidget = (id: string, index: number) => {
    const dragProps = isEditingDashboard ? { draggable: true, onDragStart: () => handleDragStart(index), onDragEnter: () => handleDragEnter(index), onDragEnd: handleDragEnd } : {};
    
    switch (id) {
      case "netWorth":
        return (
          <WidgetWrapper key={id} title="Total Net Worth" icon={Wallet} onClick={() => setIsNetWorthModalOpen(true)} isEditing={isEditingDashboard} onRemove={() => toggleWidget("netWorth")} {...dragProps}>
            <h2 className="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight">£{netWorth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
              <div><p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-0.5">Accounts</p><p className="font-medium text-gray-700 dark:text-gray-300">£{totalAccountsBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div>
              <div><p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-0.5">Invested</p><p className="font-medium text-gray-700 dark:text-gray-300">£{(totalPortfolioValue + totalBrokerCash).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div>
            </div>
          </WidgetWrapper>
        );
      case "portfolioTotal":
        return (
          <WidgetWrapper key={id} title="Portfolio Performance" icon={TrendingUp} onClick={() => setActiveTab("portfolio")} isEditing={isEditingDashboard} onRemove={() => toggleWidget("portfolioTotal")} {...dragProps}>
             <h2 className="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight mb-2">£{totalPortfolioValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
             {totalPortfolioCost > 0 ? (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold w-fit ${totalPortfolioPL >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                   {totalPortfolioPL >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}
                   {totalPortfolioPL >= 0 ? '+' : '-'}£{Math.abs(totalPortfolioPL).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                   <span className="opacity-70 font-medium ml-1">({Math.abs(totalPortfolioROR).toFixed(2)}%)</span>
                </div>
             ) : (<p className="text-sm text-gray-400">No assets added yet.</p>)}
          </WidgetWrapper>
        );
      case "allocation":
        const allocationData = portfolioWithMetrics.map(a => ({ name: a.symbol, value: a.liveValue })).filter(a => a.value > 0);
        return (
          <WidgetWrapper key={id} title="Asset Allocation" icon={PieIcon} onClick={() => setActiveTab("portfolio")} isEditing={isEditingDashboard} onRemove={() => toggleWidget("allocation")} {...dragProps}>
             <div className="h-[140px] w-full mt-2">
                 {allocationData.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                             <Pie data={allocationData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
                                 {allocationData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                             </Pie>
                         </PieChart>
                     </ResponsiveContainer>
                 ) : <p className="text-gray-400 text-sm text-center flex items-center justify-center h-full">No assets added.</p>}
             </div>
          </WidgetWrapper>
        );
      case "monthly":
        return (
          <WidgetWrapper key={id} title={`This Month (${format(selectedMonth, "MMM")})`} icon={PieIcon} onClick={() => setActiveTab("daily")} isEditing={isEditingDashboard} onRemove={() => toggleWidget("monthly")} {...dragProps}>
            <div className="flex justify-between items-end">
              <div><p className="text-sm text-gray-500 mb-1 font-medium">Spent so far</p><h3 className="text-2xl font-semibold text-red-600 dark:text-red-500">-£{stats.expense.toFixed(2)}</h3></div>
              <div className="text-right"><p className="text-sm text-gray-500 mb-1 font-medium">Income</p><h3 className="text-xl font-semibold text-green-600 dark:text-green-500">+£{stats.income.toFixed(2)}</h3></div>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full mt-4 overflow-hidden flex"><div className="bg-red-500 h-full rounded-l-full" style={{ width: `${Math.min((stats.expense / (stats.income || 1)) * 100, 100)}%` }}></div></div>
          </WidgetWrapper>
        );
      case "portfolio":
        return (
          <WidgetWrapper key={id} title="Top Holdings" icon={BarChart3} onClick={() => setActiveTab("portfolio")} isEditing={isEditingDashboard} onRemove={() => toggleWidget("portfolio")} {...dragProps}>
            {topHoldings.length === 0 ? (<p className="text-gray-400 text-sm mt-4 text-center">No investments added.</p>) : (
               <div className="space-y-3 mt-2">
                 {topHoldings.map(asset => (
                   <div key={asset.symbol} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-800 pb-2 last:border-0 last:pb-0">
                     <div className="flex items-center gap-3">
                        {asset.imageUrl ? (<img src={asset.imageUrl} alt={asset.name} className="w-8 h-8 rounded-full shadow-sm bg-white" />) : (<div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-xs">{asset.symbol.substring(0,2)}</div>)}
                        <div><p className="font-semibold text-gray-800 dark:text-gray-200 leading-none truncate max-w-[100px]">{asset.name}</p><p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{asset.symbol}</p></div>
                     </div>
                     <div className="text-right">
                        {/* Enforced 2 decimal places here */}
                        <span className="font-semibold text-gray-900 dark:text-white block">£{asset.liveValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </WidgetWrapper>
        );
      case "propTrading":
        const costs = data.propTransactions?.filter((t: any) => t.transaction_type === "Cost").reduce((acc: number, t: any) => acc + Number(t.amount), 0) || 0;
        const payouts = data.propTransactions?.filter((t: any) => t.transaction_type === "Payout").reduce((acc: number, t: any) => acc + Number(t.amount), 0) || 0;
        const profit = payouts - costs;
        const active = data.propAccounts?.filter((a: any) => a.status === "Evaluation" || a.status === "Funded").length || 0;

        return (
          <WidgetWrapper key={id} title="Prop Trading Hub" icon={Target} onClick={() => setActiveTab("trading")} isEditing={isEditingDashboard} onRemove={() => toggleWidget("propTrading")} {...dragProps}>
             <h2 className={`text-4xl font-semibold tracking-tight ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
               {profit >= 0 ? "+" : "-"}£{Math.abs(profit).toLocaleString()}
             </h2>
             <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
               <div><p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-0.5">Active Accs</p><p className="font-medium text-gray-700 dark:text-gray-300">{active}</p></div>
               <div><p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-0.5">Total Payouts</p><p className="font-medium text-gray-700 dark:text-gray-300">£{payouts.toLocaleString()}</p></div>
             </div>
          </WidgetWrapper>
        );
      case "upcoming":
        // Dynamically slice the top 3 upcoming payments
        const topUpcoming = upcomingSubs.slice(0, 3);
        return (
          <WidgetWrapper key={id} title="Upcoming Payments" icon={CalendarIcon} onClick={() => setActiveTab("subscriptions")} isEditing={isEditingDashboard} onRemove={() => toggleWidget("upcoming")} {...dragProps}>
            {topUpcoming.length === 0 ? (
              <p className="text-gray-400 text-sm mt-4 text-center">No upcoming subs.</p>
            ) : (
               <div className="space-y-3 mt-2">
                 {topUpcoming.map((sub: any) => {
                   let diff = sub.billingDay - new Date().getDate(); 
                   if (diff < 0) diff += 30; // Account for next month
                   
                   const timeText = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `In ${diff} days`;

                   return (
                     <div key={sub.id} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-800 pb-2 last:border-0 last:pb-0">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold text-xs">
                            {sub.billingDay}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 leading-none truncate max-w-[120px]">{sub.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{timeText}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <span className="font-semibold text-gray-900 dark:text-white block">£{Number(sub.cost).toFixed(2)}</span>
                       </div>
                     </div>
                   );
                 })}
               </div>
            )}
          </WidgetWrapper>
        );
      case "recent":
         return <WidgetWrapper key={id} title="Recent Activity" icon={Activity} onClick={() => setActiveTab("daily")} isEditing={isEditingDashboard} onRemove={() => toggleWidget("recent")} {...dragProps}><p className="text-sm text-gray-500">{data.transactions.length} total transactions.</p></WidgetWrapper>
      case "switches":
         return <WidgetWrapper key={id} title="Active Bonuses" icon={Clock} onClick={() => setActiveTab("switches")} isEditing={isEditingDashboard} onRemove={() => toggleWidget("switches")} {...dragProps}><p className="text-sm text-gray-500">{activeSwitches.length} active switches.</p></WidgetWrapper>
      default:
        return null;
    }
  };

  return (
    <div className="animate-in fade-in duration-300 relative">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Dashboard</h2>
         <button onClick={() => setIsEditingDashboard(!isEditingDashboard)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isEditingDashboard ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
            {isEditingDashboard ? <><Check size={16}/> Done Editing</> : <><Settings2 size={16}/> Customize</>}
         </button>
      </div>
      
      {isEditingDashboard && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-5 mb-6 shadow-inner">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 text-sm uppercase tracking-wider mb-3">Add Widgets to Dashboard</h3>
          <div className="flex flex-wrap gap-3">
            {AVAILABLE_WIDGETS.map(w => {
              const isAdded = visibleWidgets.includes(w.id);
              return (<button key={w.id} onClick={() => toggleWidget(w.id)} disabled={isAdded} className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 transition-all ${isAdded ? 'bg-white/50 dark:bg-gray-800/50 border-blue-200/50 dark:border-blue-800/50 text-blue-300 dark:text-blue-500 cursor-not-allowed' : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-100 hover:shadow-sm'}`}><Plus size={16} /> {w.label}</button>)
            })}
          </div>
        </div>
      )}

      {visibleWidgets.length === 0 && !isEditingDashboard && (
         <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900"><p className="text-gray-500 mb-4">Your dashboard is empty.</p><button onClick={() => setIsEditingDashboard(true)} className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg font-medium">Add Widgets</button></div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleWidgets.map((widgetId, index) => renderWidget(widgetId, index))}
      </div>

      {/* --- NET WORTH SELECTION MODAL --- */}
      {isNetWorthModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800">
            
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-xl font-bold dark:text-white text-gray-900">Net Worth Breakdown</h2>
              <button onClick={() => setIsNetWorthModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <button 
                onClick={() => { setActiveTab("portfolio"); setIsNetWorthModalOpen(false); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left group shadow-sm"
              >
                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <PieIcon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Brokerages & Portfolio</h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">Manage your stocks, crypto & cash</p>
                </div>
              </button>

              <button 
                onClick={() => { setActiveTab("cards"); setIsNetWorthModalOpen(false); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left group shadow-sm"
              >
                <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Bank Accounts</h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">Manage cards, savings & accounts</p>
                </div>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}