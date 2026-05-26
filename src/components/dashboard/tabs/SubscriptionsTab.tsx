"use client";

import React, { useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";

export default function SubscriptionsTab({ data }: { data: any }) {
  const [subName, setSubName] = useState(""); 
  const [subCost, setSubCost] = useState(""); 
  const [subDay, setSubDay] = useState("1");
  const [error, setError] = useState("");

  const handleAddSubscription = () => {
    setError("");
    if (!subName.trim()) return setError("Please enter a name.");
    if (!subCost || parseFloat(subCost) <= 0) return setError("Enter a valid cost.");
    data.addSubscription({ name: subName, cost: parseFloat(subCost), billingDay: parseInt(subDay) });
    setSubName(""); setSubCost(""); setSubDay("1");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm h-fit border border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Add Subscription</h2>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
        <div className="space-y-4">
          <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Service Name</label><input type="text" value={subName} onChange={(e) => setSubName(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none mt-1 dark:bg-gray-800 dark:text-white" /></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cost (£)</label><input type="number" value={subCost} onChange={(e) => setSubCost(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none mt-1 dark:bg-gray-800 dark:text-white" /></div><div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Day (1-31)</label><input type="number" min="1" max="31" value={subDay} onChange={(e) => setSubDay(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none mt-1 dark:bg-gray-800 dark:text-white" /></div></div>
          <button onClick={handleAddSubscription} className="w-full bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-lg font-medium hover:bg-gray-800 transition mt-2">Add Subscription</button>
        </div>
        </div>
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Your Fixed Monthly Costs</h2>
          <div className="space-y-3">
            {data.subscriptions.length === 0 && <p className="text-gray-400 text-sm">No subscriptions yet.</p>}
            {data.subscriptions.sort((a:any, b:any) => a.billingDay - b.billingDay).map((sub: any) => (
              <div key={sub.id} className="flex justify-between items-center p-4 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        <span className="text-[10px] uppercase font-semibold leading-none mb-0.5">Day</span>
                        <span className="text-sm font-semibold leading-none text-black dark:text-white">{sub.billingDay}</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-gray-900 dark:text-white">£{sub.cost.toFixed(2)}</span>
                    <button onClick={() => data.removeSubscription(sub.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                  </div>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
}