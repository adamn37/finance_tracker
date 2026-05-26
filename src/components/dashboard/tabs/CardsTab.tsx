"use client";

import React, { useState } from "react";
import { CreditCard, Check, X, Trash2, Pencil, TrendingUp, Wallet, Building, Sparkles, AlertCircle } from "lucide-react";

const ACCOUNT_TYPES = [
  { id: "debit", label: "Current Account" },
  { id: "savings", label: "Savings" },
  { id: "credit", label: "Credit Card" },
  { id: "investment", label: "Investment" },
  { id: "pension", label: "Pension" }
];

export default function CardsTab({ data }: { data: any }) {
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isYieldModalOpen, setIsYieldModalOpen] = useState(false);
  const [error, setError] = useState("");
  
  // Form State
  const [accName, setAccName] = useState(""); 
  const [accType, setAccType] = useState<string>("debit");
  const [accBalance, setAccBalance] = useState("");
  const [accNotes, setAccNotes] = useState("");
  const [accInterest, setAccInterest] = useState("");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  const handleAddAccount = () => { 
    if(!accName.trim()) return setError("Account name is required."); 
    const colors = ["bg-blue-100 text-blue-600", "bg-emerald-100 text-emerald-600", "bg-purple-100 text-purple-600", "bg-orange-100 text-orange-600", "bg-rose-100 text-rose-600"];
    
    data.addBankAccount({
        name: accName.trim(), 
        type: accType, 
        balance: parseFloat(accBalance || "0"), 
        notes: accNotes, 
        interest_rate: parseFloat(accInterest || "0"),
        color: colors[Math.floor(Math.random() * colors.length)]
    }); 
    
    setAccName(""); setAccBalance(""); setAccNotes(""); setAccInterest(""); setError(""); setIsModalOpen(false);
  };

  const saveEdits = (id: string) => {
    // Parse the strings to floats right before saving to prevent NaN crashes
    const payload = {
      ...editValues,
      balance: parseFloat(editValues.balance?.toString() || "0"),
      interest_rate: parseFloat(editValues.interest_rate?.toString() || "0")
    };

    if (data.updateBankAccount) {
      data.updateBankAccount(id, payload);
    }
    setEditingId(null);
  };

  // --- PRO-LEVEL CALCULATIONS ---
  const accountsSafe = data.accounts?.filter(Boolean) || [];
  const totalBalance = accountsSafe.reduce((sum: number, acc: any) => sum + Number(acc?.balance || 0), 0);
  const netCashflow = (data.transactions || []).reduce((acc: number, tx: any) => acc + (tx?.type === 'income' ? Number(tx?.amount || 0) : -Number(tx?.amount || 0)), 0);
  
  // The Passive Income Engine
  const yieldGeneratingAccounts = accountsSafe.filter((acc: any) => Number(acc?.balance) > 0 && Number(acc?.interest_rate) > 0);
  const expectedAnnualInterest = yieldGeneratingAccounts.reduce((sum: number, acc: any) => {
      return sum + (Number(acc.balance) * (Number(acc.interest_rate) / 100));
  }, 0);

  // Auto-Grouping Logic
  const groupedAccounts = accountsSafe.reduce((accGroup: any, acc: any) => {
      if (!accGroup[acc.type]) accGroup[acc.type] = [];
      accGroup[acc.type].push(acc);
      return accGroup;
  }, {});

  return (
    <div className="animate-in fade-in duration-300 relative">
      
      {/* TOP BAR: Advanced Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Account Wealth</p>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                  £{totalBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </h2>
          </div>
          
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm flex justify-between items-center">
             <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1"><TrendingUp size={14}/> Monthly Cashflow</span>
                <h3 className={`text-2xl font-bold ${netCashflow >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                    {netCashflow >= 0 ? "+" : "-"}£{Math.abs(netCashflow).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </h3>
             </div>
          </div>

          <div 
            onClick={() => setIsYieldModalOpen(true)}
            className="bg-gradient-to-br from-indigo-500 to-purple-600 border border-indigo-400/50 p-4 rounded-xl shadow-md flex justify-between items-center text-white relative overflow-hidden cursor-pointer hover:shadow-lg transition group"
          >
             <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500"></div>
             <div className="relative z-10">
                <span className="text-xs font-bold text-indigo-100 uppercase tracking-wider flex items-center gap-1.5 mb-1"><Sparkles size={14}/> Expected Annual Yield</span>
                <h3 className="text-2xl font-bold">
                    +£{expectedAnnualInterest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </h3>
             </div>
             <p className="text-[10px] font-bold text-indigo-200 uppercase bg-black/20 px-2 py-1 rounded-md relative z-10 group-hover:bg-black/30 transition">View Breakdown</p>
          </div>
      </div>

      {/* QUICK ADD BAR */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 mb-8 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-blue-900 dark:text-blue-300 mr-2 flex items-center gap-2"><Building size={16}/> Quick Add:</span>
        {ACCOUNT_TYPES.slice(0, 4).map(type => (
          <button 
            key={type.id}
            onClick={() => { setAccType(type.id); setIsModalOpen(true); }}
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition shadow-sm"
          >
            + {type.label}
          </button>
        ))}
        <button onClick={() => { setAccType("debit"); setIsModalOpen(true); }} className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm">
          Custom Account
        </button>
      </div>

      {/* ACCOUNTS LIST (Auto-Grouped) */}
      <div className="space-y-8">
        {accountsSafe.length === 0 && (
          <div className="text-center py-24 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-white/50 dark:bg-gray-900/50">
            <CreditCard className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Accounts Added</h3>
            <p className="text-gray-500 max-w-sm mx-auto">Click one of the buttons above to add your first bank account, savings, or pension.</p>
          </div>
        )}

        {ACCOUNT_TYPES.map(groupType => {
            const groupAccs = groupedAccounts[groupType.id];
            if (!groupAccs || groupAccs.length === 0) return null;

            return (
                <div key={groupType.id} className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider pl-1 border-b border-gray-200 dark:border-gray-800 pb-2">{groupType.label}</h3>
                    
                    {groupAccs.map((acc: any) => {
                      const isEditing = editingId === acc.id;
                      
                      return (
                        <div key={acc.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden transition-all duration-200 p-5">
                          {isEditing ? (
                              <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                          <label className="text-xs font-bold text-gray-500 uppercase">Account Name</label>
                                          <input type="text" value={editValues.name || ""} onChange={e => setEditValues({...editValues, name: e.target.value})} className="w-full mt-1 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:border-blue-500" />
                                      </div>
                                      <div>
                                          <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                                          <select value={editValues.type || "debit"} onChange={e => setEditValues({...editValues, type: e.target.value})} className="w-full mt-1 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:border-blue-500">
                                            {ACCOUNT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                          </select>
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <label className="text-xs font-bold text-gray-500 uppercase">Balance (£)</label>
                                          {/* FIX: Keep as raw string during onChange to prevent NaN backspace crashes */}
                                          <input type="number" step="any" value={editValues.balance ?? ""} onChange={e => setEditValues({...editValues, balance: e.target.value})} className="w-full mt-1 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:border-blue-500 font-mono" />
                                      </div>
                                      <div>
                                          <label className="text-xs font-bold text-gray-500 uppercase">Interest Rate (%)</label>
                                          <input type="number" step="any" value={editValues.interest_rate ?? ""} onChange={e => setEditValues({...editValues, interest_rate: e.target.value})} className="w-full mt-1 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:border-blue-500 font-mono" />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-gray-500 uppercase">Notes</label>
                                      <input type="text" value={editValues.notes || ""} onChange={e => setEditValues({...editValues, notes: e.target.value})} className="w-full mt-1 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:border-blue-500" />
                                  </div>
                                  <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                      <button onClick={() => saveEdits(acc.id)} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition"><Check size={16}/> Save Changes</button>
                                      <button onClick={() => setEditingId(null)} className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"><X size={16}/> Cancel</button>
                                  </div>
                              </div>
                          ) : (
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                  <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm flex-shrink-0 ${acc.color || 'bg-gray-100 text-gray-600'}`}>
                                          <Building size={20} />
                                      </div>
                                      <div>
                                          <h3 className="font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                                              {acc.name}
                                              {Number(acc.interest_rate) > 0 && (
                                                  <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                      {acc.interest_rate}% APR
                                                  </span>
                                              )}
                                          </h3>
                                          <p className="text-sm text-gray-500 font-medium mt-0.5">{acc.notes || <span className="italic opacity-50">No notes</span>}</p>
                                      </div>
                                  </div>

                                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                      <div className="text-left sm:text-right">
                                          <p className="font-bold text-xl text-gray-900 dark:text-white">£{Number(acc.balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                          {Number(acc.interest_rate) > 0 && (
                                            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase">
                                              Yields ~£{((Number(acc.balance) * Number(acc.interest_rate)) / 100).toLocaleString(undefined, {maximumFractionDigits: 0})} / yr
                                            </p>
                                          )}
                                      </div>
                                      <div className="flex flex-col gap-1">
                                          <button onClick={() => { setEditValues({ name: acc.name, type: acc.type, balance: acc.balance, interest_rate: acc.interest_rate, notes: acc.notes }); setEditingId(acc.id); }} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 bg-gray-50 dark:bg-gray-800 rounded transition"><Pencil size={14}/></button>
                                          <button onClick={() => { if(window.confirm(`Delete ${acc.name}?`)) data.removeBankAccount(acc.id); }} className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 bg-gray-50 dark:bg-gray-800 rounded transition"><Trash2 size={14}/></button>
                                      </div>
                                  </div>
                              </div>
                          )}
                        </div>
                      );
                    })}
                </div>
            );
        })}
      </div>

      {/* --- YIELD BREAKDOWN MODAL --- */}
      {isYieldModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800 bg-indigo-50 dark:bg-indigo-900/20">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-bold dark:text-white text-gray-900">Passive Income Breakdown</h2>
              </div>
              <button onClick={() => setIsYieldModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-0 max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 font-bold">Account</th>
                            <th scope="col" className="px-6 py-3 font-bold text-right">Balance</th>
                            <th scope="col" className="px-6 py-3 font-bold text-right">Yield</th>
                        </tr>
                    </thead>
                    <tbody>
                        {yieldGeneratingAccounts.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                                    No accounts with active interest rates found. Edit an account to add an APR.
                                </td>
                            </tr>
                        ) : (
                            yieldGeneratingAccounts.map((acc: any) => {
                                const yieldVal = Number(acc.balance) * (Number(acc.interest_rate) / 100);
                                return (
                                    <tr key={acc.id} className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                                            {acc.name}
                                            <span className="block text-[10px] text-gray-400 uppercase mt-0.5">{acc.interest_rate}% APR</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono">£{Number(acc.balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">+£{yieldVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
               <span className="text-sm font-bold text-gray-500 uppercase">Total Expected Yearly</span>
               <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">+£{expectedAnnualInterest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD ACCOUNT MODAL OVERLAY --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-xl font-bold dark:text-white text-gray-900">Add Account</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100"><AlertCircle size={16} /> {error}</div>}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Account Name</label>
                <input type="text" value={accName} onChange={(e) => setAccName(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 transition" placeholder="e.g. Monzo Joint" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Type</label>
                <select value={accType} onChange={(e) => setAccType(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 font-medium">
                  {ACCOUNT_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Balance (£)</label>
                  <input type="number" step="any" value={accBalance} onChange={(e) => setAccBalance(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 transition font-mono" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Interest / Yield (%)</label>
                  <input type="number" step="any" value={accInterest} onChange={(e) => setAccInterest(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 transition font-mono" placeholder="e.g. 4.5" />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notes (Optional)</label>
                <input type="text" value={accNotes} onChange={(e) => setAccNotes(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 transition" placeholder="e.g. Fixed until Jan 2025" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex gap-3">
               <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm">Cancel</button>
               <button onClick={handleAddAccount} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-md shadow-blue-500/20">Add Account</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}