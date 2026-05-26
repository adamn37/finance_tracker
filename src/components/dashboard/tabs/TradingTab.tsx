"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Trash2, AlertCircle, Plus, Building, X, Target, Briefcase, DollarSign, Calculator, Percent } from "lucide-react";

const FUTURES_MULTIPLIERS: Record<string, number> = {
    "MNQ (Micro Nasdaq)": 2,
    "NQ (E-Mini Nasdaq)": 20,
    "MES (Micro S&P)": 5,
    "ES (E-Mini S&P)": 50
};

export default function TradingTab({ data }: { data: any }) {
    // Goal State (Tied to Total Funded Capital)
    const [fundingGoal, setFundingGoal] = useState<number>(500000);
    const [isEditingGoal, setIsEditingGoal] = useState(false);

    // Risk Calculator State
    const [riskAmount, setRiskAmount] = useState<string>("300");
    const [riskMode, setRiskMode] = useState<"per_account" | "total">("per_account");
    const [riskAccounts, setRiskAccounts] = useState<string>("5");
    const [riskStopLoss, setRiskStopLoss] = useState<string>("20");
    const [riskAsset, setRiskAsset] = useState<string>("MNQ (Micro Nasdaq)");

    // Daily P&L Input State (keyed by account ID)
    const [pnlInputs, setPnlInputs] = useState<Record<string, string>>({});

    useEffect(() => {
        const savedGoal = localStorage.getItem("wealthbase_funding_goal");
        if (savedGoal) setFundingGoal(Number(savedGoal));
    }, []);

    const handleSaveGoal = (val: number) => {
        const safeVal = val > 0 ? val : 100000;
        setFundingGoal(safeVal);
        localStorage.setItem("wealthbase_funding_goal", safeVal.toString());
    };

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalFirm, setModalFirm] = useState("");
    const [modalSize, setModalSize] = useState("");
    const [modalStatus, setModalStatus] = useState("Evaluation");
    const [modalCost, setModalCost] = useState("");
    const [modalDD, setModalDD] = useState(""); // New: Max Drawdown Limit
    const [modalTarget, setModalTarget] = useState("");
    const [modalConsistency, setModalConsistency] = useState("");
    const [error, setError] = useState("");

    const [collapsedFirms, setCollapsedFirms] = useState<Record<string, boolean>>({});

    const toggleFirm = (name: string) => {
        setCollapsedFirms(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const openModal = (firmName: string = "") => {
        setModalFirm(firmName);
        setIsModalOpen(true);
    };

    const handleAddAccount = () => {
        if (!modalFirm || !modalSize) return setError("Please enter firm name and account size.");
        data.addPropAccount({
            firm_name: modalFirm.trim(),
            account_size: Number(modalSize),
            status: modalStatus,
            cost: Number(modalCost) || 0,
            current_balance: Number(modalSize),
            profit_target: Number(modalTarget) || 0,
            consistency_rule: Number(modalConsistency) || 0,
            max_drawdown_limit: Number(modalDD) || 0,
            high_water_mark: Number(modalSize)
        });
        setModalFirm(""); setModalSize(""); setModalStatus("Evaluation"); 
        setModalCost(""); setModalTarget(""); setModalConsistency(""); setError("");
        setIsModalOpen(false);
    };

    const deleteTrade = async (tradeId: string) => {
        if(window.confirm("Delete this trade record?")) await data.removePropTransaction(tradeId);
    };

    const handleDeleteFirm = async (firmName: string) => {
        if(window.confirm(`Are you sure you want to delete ALL accounts under ${firmName}?`)) {
            const accountsToDelete = (data.propAccounts || []).filter((a: any) => a.firm_name === firmName);
            for (const acc of accountsToDelete) {
                await data.removePropAccount(acc.id);
            }
        }
    };

    // --- Action Handlers ---
    const handleLogPnL = (accId: string) => {
        const val = Number(pnlInputs[accId]);
        if (val !== 0 && !isNaN(val)) {
            data.addPropTransaction({
                account_id: accId,
                transaction_type: "Trade",
                amount: val,
                date: new Date().toISOString()
            });
            setPnlInputs(p => ({ ...p, [accId]: "" })); // clear input
        }
    };

    const handleLogPayout = (accId: string) => {
        const val = prompt("Enter Payout Amount ($):");
        if (val && Number(val) > 0) {
            data.addPropTransaction({
                account_id: accId,
                transaction_type: "Payout",
                amount: Number(val),
                date: new Date().toISOString()
            });
        }
    };

    // --- Risk Calculator Math ---
    const inputRisk = Number(riskAmount) || 0;
    const numAccounts = Number(riskAccounts) || 1;
    const stopLossPoints = Number(riskStopLoss) || 0;
    
    // Determine risk per individual account
    const riskPerAccount = riskMode === "per_account" ? inputRisk : inputRisk / numAccounts;
    const pointValue = FUTURES_MULTIPLIERS[riskAsset];
    const riskPerContract = stopLossPoints * pointValue;
    
    // Round down to the nearest whole contract to ensure copier splits cleanly without rejected orders
    const contractsPerAccount = riskPerContract > 0 ? Math.floor(riskPerAccount / riskPerContract) : 0;
    const totalContracts = contractsPerAccount * numAccounts;

    // --- Data Grouping & Profit Math ---
    const allPayouts = (data.propTransactions || []).filter((t:any) => t.transaction_type === "Payout").reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const allCosts = (data.propAccounts || []).reduce((sum: number, acc: any) => sum + Number(acc.cost || 0), 0) + 
                     (data.propTransactions || []).filter((t:any) => t.transaction_type === "Cost").reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const netPropProfit = allPayouts - allCosts;

    const groupedFirms = (data.propAccounts || []).reduce((acc: any, account: any) => {
        if (!acc[account.firm_name]) {
            acc[account.firm_name] = { name: account.firm_name, accounts: [], totalFunded: 0, totalCosts: 0 };
        }
        acc[account.firm_name].accounts.push(account);
        if (account.status === "Funded") {
            acc[account.firm_name].totalFunded += Number(account.account_size);
        }
        acc[account.firm_name].totalCosts += Number(account.cost || 0);
        return acc;
    }, {});

    const firms = Object.values(groupedFirms);
    const totalFundedCapital = firms.reduce((sum: number, f: any) => sum + f.totalFunded, 0);
    const progressPercent = Math.min((totalFundedCapital / fundingGoal) * 100, 100);

    return (
        <div className="animate-in fade-in duration-300 relative">
            
            {/* TOP BAR: Value & Goal Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                
                {/* LEFT: NET PROFIT & FUNDING GOAL */}
                <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Net Prop Profit</p>
                    <div className="flex items-end gap-4 mb-4">
                        <h2 className={`text-4xl font-bold tracking-tight ${netPropProfit >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                            {netPropProfit >= 0 ? '+' : '-'}${Math.abs(netPropProfit).toLocaleString(undefined, {maximumFractionDigits: 0})}
                        </h2>
                        <div className="flex items-center gap-1.5 mb-1.5 text-sm font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                            <Briefcase size={14}/> ${totalFundedCapital.toLocaleString()} Funded
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-end mb-2 relative z-10">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Target size={14}/> Funded Capital Goal</span>
                            {isEditingGoal ? (
                                <input
                                    type="number"
                                    autoFocus
                                    className="text-xs font-bold bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 outline-none w-24 text-right"
                                    defaultValue={fundingGoal}
                                    onBlur={(e) => { setIsEditingGoal(false); handleSaveGoal(Number(e.target.value)); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditingGoal(false); handleSaveGoal(Number(e.currentTarget.value)); } }}
                                />
                            ) : (
                                <button onClick={() => setIsEditingGoal(true)} className="text-xs font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer flex items-center gap-1">
                                    Target: ${fundingGoal.toLocaleString()} <span className="opacity-50">✎</span>
                                </button>
                            )}
                        </div>
                        
                        <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden flex relative z-10">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-2 relative z-10">
                            <p className="text-[10px] text-gray-400 font-medium">{progressPercent.toFixed(1)}% Completed</p>
                            <p className="text-[10px] text-gray-400 font-medium">${(fundingGoal - totalFundedCapital > 0 ? fundingGoal - totalFundedCapital : 0).toLocaleString(undefined, {maximumFractionDigits: 0})} left</p>
                        </div>
                    </div>
                </div>

                {/* RIGHT: RISK CALCULATOR */}
                <div className="bg-gray-900 dark:bg-black rounded-xl p-5 shadow-lg border border-gray-800 text-white flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2 text-blue-400">
                            <Calculator size={18} />
                            <h3 className="font-bold uppercase tracking-wider text-sm">Trade Risk Calculator</h3>
                        </div>
                        <select 
                            value={riskMode} 
                            onChange={e => setRiskMode(e.target.value as "per_account" | "total")} 
                            className="bg-gray-800 border border-gray-700 text-xs font-bold text-gray-300 rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-gray-700 transition"
                        >
                            <option value="per_account">Risk Per Account</option>
                            <option value="total">Risk Across All</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Risk ($)</label>
                            <input type="number" value={riskAmount} onChange={e => setRiskAmount(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 mt-1 text-sm font-bold focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Copier Accs</label>
                            <input type="number" value={riskAccounts} onChange={e => setRiskAccounts(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 mt-1 text-sm font-bold focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Stop Loss (Pts)</label>
                            <input type="number" value={riskStopLoss} onChange={e => setRiskStopLoss(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 mt-1 text-sm font-bold focus:border-blue-500 outline-none" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-xl border border-gray-800">
                        <select value={riskAsset} onChange={e => setRiskAsset(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs font-bold outline-none flex-1 truncate">
                            {Object.keys(FUTURES_MULTIPLIERS).map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <div className="text-right flex-[1.2]">
                            <div className="flex justify-between items-end gap-2">
                                <div className="text-left border-r border-gray-700 pr-3">
                                   <p className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Total</p>
                                   <p className="text-sm font-bold text-gray-400">{totalContracts.toFixed(0)}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[10px] text-blue-400/70 uppercase font-bold mb-0.5">Per Acc</p>
                                   <p className="text-2xl font-black text-blue-400 leading-none">{contractsPerAccount.toFixed(0)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* QUICK ADD FIRM BAR */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 mb-8 flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-300 mr-2 flex items-center gap-2"><Briefcase size={16}/> Add Prop Firm:</span>
                {["FTMO", "Topstep", "Funding Pips", "Apex", "TradeDay"].map(firm => {
                    return (
                        <button 
                            key={firm}
                            onClick={() => openModal(firm)}
                            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition shadow-sm"
                        >
                            + {firm}
                        </button>
                    );
                })}
                <button onClick={() => openModal("")} className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm">
                    + Custom Firm
                </button>
            </div>

            {/* EMPTY STATE */}
            {firms.length === 0 && (
                <div className="text-center py-24 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-white/50 dark:bg-gray-900/50">
                    <Briefcase className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Prop Accounts Active</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">Click one of the platform buttons above to log your first evaluation or funded account.</p>
                </div>
            )}

            {/* FIRM CARDS LIST (Accordions) */}
            <div className="space-y-6">
                {firms.map((firm: any) => {
                    const isCollapsed = collapsedFirms[firm.name];

                    return (
                        <div key={firm.name} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden transition-all duration-200">
                            
                            {/* COLLAPSIBLE HEADER */}
                            <div 
                                onClick={() => toggleFirm(firm.name)}
                                className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center font-bold text-lg shadow-sm">
                                        {firm.name.substring(0, 1)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{firm.name}</h3>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteFirm(firm.name);
                                            }} 
                                            className="text-xs text-red-500 hover:text-red-700 font-medium mt-0.5"
                                        >
                                            Delete Firm
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                    <div className="text-left sm:text-right flex gap-6">
                                        <div>
                                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5 sm:text-right">Funded Size</p>
                                            <p className="text-xl font-bold text-gray-900 dark:text-white">${firm.totalFunded.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5 sm:text-right">Total Spent</p>
                                            <p className="text-xl font-bold text-rose-600 dark:text-rose-400">-${firm.totalCosts.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-gray-400 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                        {isCollapsed ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                                    </div>
                                </div>
                            </div>

                            {/* FIRM ACCOUNTS */}
                            {!isCollapsed && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <div className="divide-y divide-gray-50 dark:divide-gray-800/50 p-4 space-y-3">
                                        {firm.accounts.map((acc: any) => {
                                            const startSize = Number(acc.account_size);
                                            const target = Number(acc.profit_target || 0);
                                            
                                            // Real-time Balance Math
                                            const accTrades = (data.propTransactions || []).filter((t: any) => t.account_id === acc.id && t.transaction_type === "Trade");
                                            const accPayouts = (data.propTransactions || []).filter((t: any) => t.account_id === acc.id && t.transaction_type === "Payout");
                                            
                                            const totalProfit = accTrades.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
                                            const totalWithdrawn = accPayouts.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
                                            const maxDay = accTrades.length > 0 ? Math.max(...accTrades.map((t: any) => Number(t.amount))) : 0;
                                            
                                            const currentBal = startSize + totalProfit - totalWithdrawn;
                                            const consistencyPercent = totalProfit > 0 ? (maxDay / totalProfit) * 100 : 0;
                                            
                                            const targetBal = startSize + target;
                                            const progress = target > 0 ? Math.max(0, Math.min((totalProfit / target) * 100, 100)) : 0;
                                            const isDrawdown = currentBal < startSize;

                                            return (
                                              <div key={acc.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                                  
                                                  {/* Top Row: Info */}
                                                  <div className="flex flex-wrap justify-between items-center gap-4 mb-3">
                                                      <div className="flex items-center gap-3">
                                                          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg"><Briefcase size={18}/></div>
                                                          <div>
                                                              <div className="flex items-center gap-2">
                                                                <span className="font-black text-gray-900 dark:text-white text-lg">${startSize.toLocaleString()}</span>
                                                              </div>
                                                              <select 
                                                                  value={acc.status}
                                                                  onChange={(e) => data.updatePropAccountStatus(acc.id, e.target.value)}
                                                                  className={`text-xs font-bold px-2 py-0.5 rounded outline-none border border-transparent cursor-pointer transition mt-1
                                                                      ${acc.status === 'Funded' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                                                      acc.status === 'Evaluation' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                                                      'bg-rose-100 text-rose-700 border-rose-200'}`}
                                                              >
                                                                  <option value="Evaluation">Evaluation</option>
                                                                  <option value="Funded">Funded</option>
                                                                  <option value="Blown">Blown</option>
                                                              </select>
                                                          </div>
                                                      </div>
                                                      
                                                      <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Live Balance</p>
                                                            <p className={`font-bold text-lg ${isDrawdown ? 'text-rose-500' : 'text-emerald-500'}`}>${currentBal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                                        </div>
                                                        <button onClick={() => data.removePropAccount(acc.id)} className="text-gray-400 hover:text-red-500 transition p-2 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg">
                                                            <Trash2 size={16} />
                                                        </button>
                                                      </div>
                                                  </div>

                                                  {/* Eval Progress Bar */}
                                                  {target > 0 && acc.status === "Evaluation" && (
                                                      <div className="mt-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                          <div className="flex justify-between text-xs font-bold mb-1.5">
                                                              <span className="text-gray-500">Target: ${targetBal.toLocaleString()}</span>
                                                              <span className={progress >= 100 ? 'text-emerald-500' : 'text-blue-500'}>{progress.toFixed(1)}%</span>
                                                          </div>
                                                          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                              <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }}></div>
                                                          </div>
                                                      </div>
                                                  )}

                                                  {/* Trade & Consistency Actions */}
                                                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4">
                                                      <div className="flex items-center gap-2">
                                                          <div className="relative">
                                                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">$</span>
                                                              <input 
                                                                  type="number"
                                                                  value={pnlInputs[acc.id] || ""}
                                                                  onChange={e => setPnlInputs(p => ({ ...p, [acc.id]: e.target.value }))}
                                                                  placeholder="Daily P&L"
                                                                  className="w-28 pl-6 pr-2 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs font-bold outline-none focus:border-blue-500 transition"
                                                              />
                                                          </div>
                                                          <button 
                                                              onClick={() => handleLogPnL(acc.id)}
                                                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold transition shadow-sm"
                                                          >
                                                              Log Trade
                                                          </button>
                                                      </div>
                                                      
                                                      <div className="flex items-center gap-3">
                                                          {acc.consistency_rule > 0 && totalProfit > 0 && (
                                                              <div className={`text-[10px] font-bold px-2 py-1 rounded border ${consistencyPercent > acc.consistency_rule ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                                                                  Consistency: {consistencyPercent.toFixed(1)}% (Max {acc.consistency_rule}%)
                                                              </div>
                                                          )}
                                                          {acc.status === "Funded" && (
                                                            <button 
                                                                onClick={() => handleLogPayout(acc.id)}
                                                                className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1.5 rounded transition"
                                                            >
                                                                + Log Payout
                                                            </button>
                                                          )}
                                                      </div>
                                                  </div>
                                              </div>
                                            );
                                        })}
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                        <button onClick={() => openModal(firm.name)} className="flex items-center gap-1.5 text-sm font-semibold text-black dark:text-white hover:opacity-70 transition bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                            <Plus size={16} /> Add Account to {firm.name}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* --- RECORD ACCOUNT MODAL OVERLAY --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800">
                        
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                            <h2 className="text-xl font-bold dark:text-white text-gray-900">Add Prop Account</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100"><AlertCircle size={16} /> {error}</div>}
                            
                            <div>
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Prop Firm Name</label>
                                <input type="text" value={modalFirm} onChange={(e) => setModalFirm(e.target.value)} className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 transition" placeholder="e.g. Topstep" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Account Size ($)</label>
                                    <input type="number" step="any" value={modalSize} onChange={(e) => setModalSize(e.target.value)} className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 transition font-mono" placeholder="50000" />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Upfront Cost ($)</label>
                                    <input type="number" step="any" value={modalCost} onChange={(e) => setModalCost(e.target.value)} className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 transition font-mono" placeholder="49.00" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status</label>
                                    <select value={modalStatus} onChange={(e) => setModalStatus(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 font-medium">
                                        <option value="Evaluation">Evaluation</option>
                                        <option value="Funded">Funded</option>
                                        <option value="Blown">Blown</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Profit Target ($)</label>
                                    <input type="number" step="any" value={modalTarget} onChange={(e) => setModalTarget(e.target.value)} className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 transition font-mono" placeholder="3000" />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Consistency Rule (%)</label>
                                <input type="number" step="any" value={modalConsistency} onChange={(e) => setModalConsistency(e.target.value)} className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 transition font-mono" placeholder="e.g. 30" />
                                <p className="text-xs text-gray-500 mt-1">Leave empty if none.</p>
                            </div>
                            
                        </div>
                        
                        <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
                            <button onClick={handleAddAccount} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-md shadow-blue-500/20">Add Account</button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}