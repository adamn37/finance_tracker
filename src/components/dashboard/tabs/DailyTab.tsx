"use client"

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Pencil, Check, X, CalendarIcon, ArrowDownLeft, ArrowUpRight, AlertCircle, Trash2 } from "lucide-react";
import { format, parseISO, isFuture, isValid, isBefore, addMonths, subMonths, isSameMonth, isToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

const CATEGORIES = ["Uncategorized", "Groceries", "Transport", "Food", "Entertainment", "Rent", "Hobby", "Investing", "Subscriptions", "Electricity", "WIFI", "Gifts"];
const PRIORITY_COLORS: any = { need: "bg-red-100 text-red-700", want: "bg-yellow-100 text-yellow-700", save: "bg-green-100 text-green-700" };

export default function DailyTab({ data, selectedMonth, setSelectedMonth }: { data: any, selectedMonth: Date, setSelectedMonth: any }) {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]); 
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]); 
  const [priority, setPriority] = useState<"need" | "want" | "save">("want");
  const [selectedBankId, setSelectedBankId] = useState(""); 
  const [error, setError] = useState("");
  const [selectedActivityAccount, setSelectedActivityAccount] = useState<string>("All");
  const [showCalendar, setShowCalendar] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  const currentMonthKey = format(selectedMonth, "yyyy-MM");
  const currentTransactions = data.transactions.filter((tx: any) => isSameMonth(parseISO(tx.date), selectedMonth)).sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const stats = useMemo(() => {
    const income = currentTransactions.filter((t:any) => t.type === "income").reduce((sum:number, t:any) => sum + t.amount, 0);
    const expense = currentTransactions.filter((t:any) => t.type === "expense").reduce((sum:number, t:any) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [currentTransactions]);

  const currentBudget = data.budgets[currentMonthKey] || 0;
  const totalAvailable = currentBudget + stats.income;
  const budgetLeft = totalAvailable - stats.expense;
  const budgetProgress = totalAvailable > 0 ? (stats.expense / totalAvailable) * 100 : 0;
  const monthlyFixedCost = (data.subscriptions || []).reduce((sum: number, sub: any) => sum + sub.cost, 0);

  const handleMonthChange = (direction: "prev" | "next") => { setSelectedMonth((prev: Date) => direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)); setIsEditingBudget(false); };
  
  const handleAddTransaction = (type: "income" | "expense") => {
    setError("");
    if (!amount || parseFloat(amount) <= 0) return setError("Please enter a valid amount greater than £0.");
    data.addTransaction({ date, amount: parseFloat(amount), category: type === 'income' ? 'Salary' : category, type, priority, bankAccountId: selectedBankId || (data.accounts.length > 0 ? data.accounts[0].id : undefined), note });
    setAmount(""); setNote(""); setDate(new Date().toISOString().split("T")[0]); setPriority("want");
  };

  return (
    <div className="animate-in fade-in duration-300">
      {/* Month Header & Budget Stats */}
      <div className="mb-8">
          <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4">
              <button onClick={() => handleMonthChange("prev")} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"><ChevronLeft size={20} /></button>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{format(selectedMonth, "MMMM yyyy")}</h2>
              <button onClick={() => handleMonthChange("next")} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"><ChevronRight size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 relative group">
                <div className="flex justify-between items-start mb-1"><p className="text-gray-500 text-sm">Left to Spend</p><button onClick={() => { setTempBudget(currentBudget.toString()); setIsEditingBudget(true); }} className="text-gray-300 hover:text-black dark:hover:text-white transition"><Pencil size={14} /></button></div>
                {isEditingBudget ? (
                    <div className="flex items-center gap-2 mt-1"><input type="number" value={tempBudget} onChange={(e) => setTempBudget(e.target.value)} className="w-full p-1 border rounded text-lg font-semibold bg-transparent dark:text-white" autoFocus /><button onClick={() => { data.updateBudget(currentMonthKey, parseFloat(tempBudget)); setIsEditingBudget(false); }} className="bg-green-100 text-green-700 p-1.5 rounded-md hover:bg-green-200"><Check size={16}/></button></div>
                ) : (
                    <><h3 className={`text-2xl font-semibold ${budgetLeft < 0 ? 'text-red-600' : 'text-emerald-600'}`}>£{budgetLeft.toFixed(2)}</h3><div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden"><div className={`h-full rounded-full ${budgetProgress > 100 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(budgetProgress, 100)}%` }}></div></div><p className="text-xs text-gray-400 mt-2">Base: £{currentBudget} <span className="text-green-500 font-medium">+{stats.income.toFixed(0)}</span> <span className="text-red-500 font-medium">-{stats.expense.toFixed(0)}</span></p></>
                )}
              </div>
              <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"><p className="text-gray-500 text-sm mb-1">Expenses</p><h3 className="text-2xl font-semibold text-red-600">-£{stats.expense.toFixed(2)}</h3></div>
              <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 border-l-4 border-l-blue-500"><p className="text-gray-500 text-sm mb-1">Fixed Subs</p><h3 className="text-2xl font-semibold text-blue-600">£{monthlyFixedCost.toFixed(2)}</h3></div>
              <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"><p className="text-gray-500 text-sm mb-1">Net Balance</p><h3 className="text-2xl font-semibold text-gray-800 dark:text-white">£{stats.balance.toFixed(2)}</h3></div>
          </div>
      </div>

      {/* Main Grid: Form & Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm h-fit border border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Add Transaction</h2>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
          <div className="space-y-4">
              <div className="relative z-30"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none mt-1 bg-white dark:bg-gray-800 dark:text-white" /></div>
              <div className="relative z-10"><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none dark:bg-gray-800 dark:text-white" placeholder="Amount (£)" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Category</label><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none bg-white dark:bg-gray-800 dark:text-white mt-1">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Pay With</label><select value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none bg-white dark:bg-gray-800 dark:text-white mt-1">{data.accounts.map((acc:any) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
              </div>
              <div className="relative z-10"><input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none dark:bg-gray-800 dark:text-white" placeholder="Note (e.g. Tesco)" /></div>
              <div className="grid grid-cols-2 gap-2 pt-2"><button onClick={() => handleAddTransaction("expense")} className="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 py-2.5 rounded-lg font-medium hover:bg-red-100 transition flex justify-center gap-2"><ArrowDownLeft size={18} /> Expense</button><button onClick={() => handleAddTransaction("income")} className="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 py-2.5 rounded-lg font-medium hover:bg-green-100 transition flex justify-center gap-2"><ArrowUpRight size={18} /> Income</button></div>
          </div>
        </div>

        {/* Feed */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-semibold dark:text-white">Activity</h2><span className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md">{currentTransactions.length} items</span></div>
          <div className="space-y-6"> 
              {currentTransactions.length === 0 ? (<div className="text-center py-10 text-gray-400">No transactions found.</div>) : (
                  currentTransactions.map((tx: any) => (
                      <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg border border-transparent hover:border-gray-100 dark:hover:border-gray-700 group">
                          <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{tx.type === 'income' ? <ArrowUpRight size={18}/> : <ArrowDownLeft size={18}/>}</div>
                              <div>
                                  <div className="flex items-center gap-2"><p className="font-medium text-gray-900 dark:text-white">{tx.note || tx.category}</p></div>
                                  <div className="flex items-center gap-2 text-xs mt-0.5 text-gray-500">{format(parseISO(tx.date), "do MMM")}</div>
                              </div>
                          </div>
                          <div className="flex items-center gap-4">
                              <span className={`font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>{tx.type === 'expense' ? '-' : '+'}£{tx.amount.toFixed(2)}</span>
                              <button onClick={() => data.removeTransaction(tx.id)} className="text-gray-400 hover:text-red-500 transition p-1.5 opacity-0 group-hover:opacity-100"><Trash2 size={15} /></button>
                          </div>
                      </div>
                  ))
              )}
          </div>
        </div>
      </div>
    </div>
  );
}