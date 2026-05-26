"use client";

import React, { useMemo } from "react";
import { BarChart3, PieChart as PieIcon } from "lucide-react";
import { format, parseISO, isSameMonth } from "date-fns";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, PieChart, Pie, Cell } from "recharts";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#06b6d4", "#84cc16"];

export default function AnalyticsTab({ data, selectedMonth }: { data: any, selectedMonth: Date }) {
  const historyData = data.getMonthlyHistory();
  const currentTransactions = data.transactions.filter((tx: any) => isSameMonth(parseISO(tx.date), selectedMonth));
  
  const pieData = useMemo(() => {
    const expenseTx = currentTransactions.filter((t:any) => t.type === 'expense');
    const categoryTotals: Record<string, number> = {};
    expenseTx.forEach((tx:any) => { categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount; });
    return Object.keys(categoryTotals).map(cat => ({ name: cat, value: categoryTotals[cat] }));
  }, [currentTransactions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-6"><BarChart3 size={20} className="text-gray-500"/><h2 className="text-xl font-semibold dark:text-white">Monthly History</h2></div>
          <div className="h-[300px] w-full">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historyData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" /><XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} stroke="#9CA3AF" /><YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `£${value}`} stroke="#9CA3AF" /><Tooltip formatter={(value:any) => `£${value}`} cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1F2937', border: 'none', color: '#fff'}} /><Legend /><Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} /><Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4, 4, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400">Add transactions to compare months!</div>}
          </div>
      </div>
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-6 w-full"><PieIcon size={20} className="text-gray-500"/><h2 className="text-xl font-semibold dark:text-white">Category Breakdown ({format(selectedMonth, "MMM")})</h2></div>
          <div className="h-[300px] w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">{pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie><Tooltip formatter={(value:any) => `£${value}`} contentStyle={{backgroundColor: '#1F2937', border: 'none', color: '#fff'}} /><Legend /></PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400">No expenses this month.</div>}
          </div>
      </div>
    </div>
  );
}