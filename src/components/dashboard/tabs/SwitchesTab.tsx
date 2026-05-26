"use client";

import React, { useState } from "react";
import { Plus, AlertCircle, CheckCircle2, XCircle, Clock, Trash2, Wallet, CreditCard as CardIcon } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

export default function SwitchesTab({ data }: { data: any }) {
  const [swBankName, setSwBankName] = useState(""); 
  const [swBonus, setSwBonus] = useState(""); 
  const [swDate, setSwDate] = useState(new Date().toISOString().split("T")[0]);
  const [swPayIn, setSwPayIn] = useState(""); 
  const [swDeadline, setSwDeadline] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]); 
  const [swDDs, setSwDDs] = useState("0");
  const [error, setError] = useState("");

  const handleAddSwitch = () => {
    setError("");
    if (!swBankName.trim()) return setError("Enter bank name.");
    if (!swBonus) return setError("Enter bonus amount.");
    data.addSwitch({ bankName: swBankName, bonusAmount: parseFloat(swBonus), switchDate: swDate, status: "active", requirements: { payInAmount: parseFloat(swPayIn || "0"), payInDeadline: swDeadline, directDebitsNeeded: parseInt(swDDs || "0") } });
    setSwBankName(""); setSwBonus(""); setSwPayIn(""); setSwDDs("0");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm h-fit border border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Add Switch Tracker</h2>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
            <div className="space-y-4">
                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bank Name</label><input type="text" value={swBankName} onChange={(e) => setSwBankName(e.target.value)} className="w-full p-2 border rounded-lg mt-1 dark:bg-gray-800 dark:border-gray-700 dark:text-white" /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bonus (£)</label><input type="number" value={swBonus} onChange={(e) => setSwBonus(e.target.value)} className="w-full p-2 border rounded-lg mt-1 dark:bg-gray-800 dark:border-gray-700 dark:text-white" /></div><div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label><input type="date" value={swDate} onChange={(e) => setSwDate(e.target.value)} className="w-full p-2 border rounded-lg mt-1 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div></div>
                <div className="border-t dark:border-gray-800 pt-4 mt-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Requirements</p>
                    <div className="space-y-3">
                        <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pay In Amount (£)</label><input type="number" value={swPayIn} onChange={(e) => setSwPayIn(e.target.value)} className="w-full p-2 border rounded-lg mt-1 dark:bg-gray-800 dark:border-gray-700 dark:text-white" /></div>
                        <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Required Direct Debits</label><input type="number" value={swDDs} onChange={(e) => setSwDDs(e.target.value)} className="w-full p-2 border rounded-lg mt-1 dark:bg-gray-800 dark:border-gray-700 dark:text-white" /></div>
                        <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Deadline Date</label><input type="date" value={swDeadline} onChange={(e) => setSwDeadline(e.target.value)} className="w-full p-2 border rounded-lg mt-1 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
                    </div>
                </div>
                <button onClick={handleAddSwitch} className="w-full bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-lg font-medium hover:bg-gray-800 transition mt-4 flex items-center justify-center gap-2"><Plus size={18} /> Track Switch</button>
            </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          {data.switches.length === 0 && (<div className="bg-white dark:bg-gray-900 p-10 rounded-xl shadow-sm border border-gray-100 text-center text-gray-400">No active switches.</div>)}
          {data.switches.map((sw: any) => {
            const isCompleted = sw.status === "completed"; const isFailed = sw.status === "failed"; const isActive = sw.status === "active";
            const daysLeft = differenceInDays(new Date(sw.requirements.payInDeadline), new Date());
            return (
              <div key={sw.id} className={`border rounded-xl p-5 transition bg-white dark:bg-gray-900 shadow-sm ${isCompleted ? 'border-green-200' : isFailed ? 'border-red-200' : 'border-gray-200 dark:border-gray-800'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className={`font-semibold text-xl ${isCompleted ? 'text-green-700' : isFailed ? 'text-red-700' : 'dark:text-white'}`}>{sw.bankName}</h3>
                            {isCompleted && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><CheckCircle2 size={12}/> Paid</span>}
                            {isFailed && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><XCircle size={12}/> Failed</span>}
                            {isActive && <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Clock size={12}/> Active</span>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm mt-3">
                            {sw.requirements.payInAmount > 0 && (<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"><Wallet size={16} /> Pay in £{sw.requirements.payInAmount}</div>)}
                            {sw.requirements.directDebitsNeeded > 0 && (<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"><CardIcon size={16} /> {sw.requirements.directDebitsNeeded} Direct Debits</div>)}
                        </div>
                    </div>
                    <div className="mt-5 md:mt-0 flex gap-2">
                        {isActive && (<><button onClick={() => data.updateSwitchStatus(sw.id, "completed")} className="text-sm font-medium bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg transition"><CheckCircle2 size={16} /></button><button onClick={() => data.updateSwitchStatus(sw.id, "failed")} className="text-sm font-medium bg-white text-gray-500 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 px-4 py-2 rounded-lg transition"><XCircle size={16} /></button></>)}
                        <button onClick={() => data.removeSwitch(sw.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg transition"><Trash2 size={18} /></button>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
}