"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useFinanceData, Transaction } from "@/hooks/useFinanceData";
import { Plus, Wallet, ArrowUpRight, ArrowDownLeft, Trash2, PieChart as PieIcon, BarChart3, AlertCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pencil, Check, X, CreditCard as CardIcon, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, RefreshCw, Search } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { differenceInDays, parseISO, isFuture, isValid, isBefore, addMonths, subMonths, format, isSameMonth, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from "date-fns";

const CATEGORIES = [
  "Groceries", "Transport", "Food", "Entertainment", "Rent", "Hobby", 
  "Investing", "Subscriptions", "Electricity", "WIFI", "Gifts"
];

const PIE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", 
  "#6366f1", "#14b8a6", "#f97316", "#06b6d4", "#84cc16"
];

const PRIORITY_COLORS = {
  need: "bg-red-100 text-red-700 border-red-200",
  want: "bg-yellow-100 text-yellow-700 border-yellow-200",
  save: "bg-green-100 text-green-700 border-green-200",
};

export default function Dashboard() {
  const { 
    transactions, switches, subscriptions, budgets, accounts,
    addTransaction, removeTransaction, editTransaction,
    addSwitch, removeSwitch, updateSwitchStatus, 
    addSubscription, removeSubscription, updateBudget,
    addAccount, removeAccount,
    getMonthlyHistory, isLoaded,
    portfolio, livePrices, addPortfolioItem, removePortfolioItem, refreshPrices, isRefreshing
  } = useFinanceData();
  
  const [activeTab, setActiveTab] = useState<"daily" | "analytics" | "subscriptions" | "switches" | "cards" | "portfolio">("daily");
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState("");

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]); 
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]); 
  const [priority, setPriority] = useState<"need" | "want" | "save">("want");
  const [selectedBankId, setSelectedBankId] = useState(""); 
  
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{
    amount: string, category: string, note: string, date: string, priority: "need" | "want" | "save", bankAccountId: string
  } | null>(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  const [subName, setSubName] = useState("");
  const [subCost, setSubCost] = useState("");
  const [subDay, setSubDay] = useState("1");

  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<"debit" | "credit">("debit");

  const [swBankName, setSwBankName] = useState("");
  const [swBonus, setSwBonus] = useState("");
  const [swDate, setSwDate] = useState(new Date().toISOString().split("T")[0]);
  const [swPayIn, setSwPayIn] = useState("");
  const [swDeadline, setSwDeadline] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [swDDs, setSwDDs] = useState("0");

  // Portfolio State
  const [portName, setPortName] = useState("");
  const [portSymbol, setPortSymbol] = useState(""); 
  const [portAmount, setPortAmount] = useState("");
  const [portType, setPortType] = useState<"crypto" | "stock">("crypto"); 
  const [portPurchasePrice, setPortPurchasePrice] = useState("");
  const [portImageUrl, setPortImageUrl] = useState("");
  const [portPlatform, setPortPlatform] = useState(""); 
  const [portDate, setPortDate] = useState(new Date().toISOString().split("T")[0]);

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Accordion & Filter State
  const [expandedSymbols, setExpandedSymbols] = useState<Record<string, boolean>>({});
  const [selectedPlatform, setSelectedPlatform] = useState<string>("All");

  // --- SMART LOGO FINDER (Powered by Google Favicons) ---
  const getSmartLogo = (symbol: string, name: string) => {
    const n = name.toLowerCase();
    const s = symbol.toUpperCase().split('.')[0]; // Clean symbol (AAPL.L -> AAPL)

    // Helper to get Google Icon URL
    const getGoogleIcon = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

    // 1. FUND PROVIDERS (The big ones!)
    if (n.includes("vanguard")) return getGoogleIcon("vanguard.co.uk");
    if (n.includes("ishares")) return getGoogleIcon("ishares.com");
    if (n.includes("invesco")) return getGoogleIcon("invesco.com");
    if (n.includes("hsbc")) return getGoogleIcon("hsbc.com");
    if (n.includes("legal & general") || n.includes("l&g")) return getGoogleIcon("legalandgeneral.com");
    if (n.includes("amundi")) return getGoogleIcon("amundi.com");
    if (n.includes("wisdomtree")) return getGoogleIcon("wisdomtree.eu");
    if (n.includes("x-trackers") || n.includes("xtrackers")) return getGoogleIcon("etf.dws.com");

    // 2. POPULAR COMPANIES (Add more as you need them!)
    if (n.includes("apple")) return getGoogleIcon("apple.com");
    if (n.includes("tesla")) return getGoogleIcon("tesla.com");
    if (n.includes("microsoft")) return getGoogleIcon("microsoft.com");
    if (n.includes("amazon")) return getGoogleIcon("amazon.com");
    if (n.includes("netflix")) return getGoogleIcon("netflix.com");
    if (n.includes("meta") || n.includes("facebook")) return getGoogleIcon("meta.com");
    if (n.includes("google") || n.includes("alphabet")) return getGoogleIcon("abc.xyz");
    if (n.includes("nvidia")) return getGoogleIcon("nvidia.com");
    if (n.includes("greggs")) return getGoogleIcon("greggs.co.uk");
    if (n.includes("sainsbury")) return getGoogleIcon("about.sainsburys.co.uk");
    if (n.includes("tesco")) return getGoogleIcon("tescoplc.com");
    if (n.includes("lloyds")) return getGoogleIcon("lloydsbankinggroup.com");
    if (n.includes("barclays")) return getGoogleIcon("home.barclays");
    if (n.includes("natwest")) return getGoogleIcon("natwest.com");
    if (n.includes("rolls-royce") || n.includes("rolls royce")) return getGoogleIcon("rolls-royce.com");
    if (n.includes("unilever")) return getGoogleIcon("unilever.com");
    if (n.includes("shell")) return getGoogleIcon("shell.com");
    if (n.includes("bp p.l.c") || n.includes(" bp ")) return getGoogleIcon("bp.com");
    if (n.includes("astrazeneca")) return getGoogleIcon("astrazeneca.com");
    if (n.includes("vodafone")) return getGoogleIcon("astrazeneca.com");

    // 3. Fallback: Try Financial Modeling Prep for generic US stocks
    return `https://financialmodelingprep.com/image-stock/${s}.png`;
  };

  // Live Asset Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (portSymbol.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        if (portType === "crypto") {
          const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${portSymbol}`);
          const data = await res.json();
          setSearchResults(data.coins?.slice(0, 5) || []);
        } else {
          // Yahoo Finance Search via Local API
          const res = await fetch(`/api/search?q=${portSymbol}`);
          if (!res.ok) throw new Error("Search failed");
          const data = await res.json();
          
          let mappedResults = (data.quotes || [])
             .filter((q: any) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
             .map((q: any) => ({
                symbol: q.symbol,
                name: q.shortname || q.longname || q.symbol,
                exchange: q.exchDisp || "Unknown",
                type: q.quoteType,
                // Add a flag to help UI identify UK stocks
                isUK: (q.exchDisp === "London" || q.symbol.endsWith(".L"))
             }));

          // --- SMART SORTING ---
          // This forces "London" results to the top of the list for you!
          mappedResults.sort((a: any, b: any) => {
             // 1. Exact match goes first
             if (a.symbol === portSymbol.toUpperCase()) return -1;
             if (b.symbol === portSymbol.toUpperCase()) return 1;
             // 2. UK Stocks go second
             if (a.isUK && !b.isUK) return -1;
             if (!a.isUK && b.isUK) return 1;
             return 0;
          });

          setSearchResults(mappedResults.slice(0, 6)); // Show top 6
        }
      } catch (err) {
        console.error("Search failed:", err);
      }
      setIsSearching(false);
    }, 400); 

    return () => clearTimeout(delayDebounceFn);
  }, [portSymbol, portType]);

  const currentMonthKey = format(selectedMonth, "yyyy-MM");
  const currentTransactions = transactions.filter((tx) => 
    isSameMonth(parseISO(tx.date), selectedMonth)
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const stats = useMemo(() => {
    const income = currentTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expense = currentTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [currentTransactions]);

  const pieData = useMemo(() => {
    const expenseTx = currentTransactions.filter(t => t.type === 'expense');
    const categoryTotals: Record<string, number> = {};
    expenseTx.forEach(tx => {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
    });
    return Object.keys(categoryTotals).map(cat => ({ name: cat, value: categoryTotals[cat] }));
  }, [currentTransactions]);

  // THIS IS THE ONLY EARLY RETURN
  if (!isLoaded) return <div className="p-10 text-center">Loading your finances...</div>;

  const monthlyFixedCost = (subscriptions || []).reduce((sum, sub) => sum + sub.cost, 0);
  const historyData = getMonthlyHistory();

  const currentBudget = budgets[currentMonthKey] || 0;
  const totalAvailable = currentBudget + stats.income;
  const budgetLeft = totalAvailable - stats.expense;
  const budgetProgress = totalAvailable > 0 ? (stats.expense / totalAvailable) * 100 : 0;

  // --- PORTFOLIO GROUPING LOGIC ---
  const allPlatforms = Array.from(new Set((portfolio || []).map(p => p.platform).filter(Boolean)));
  
  const filteredPortfolio = (portfolio || []).filter(item => 
    selectedPlatform === "All" || item.platform === selectedPlatform
  );

  const groupedPortfolio = filteredPortfolio.reduce((acc, item) => {
    if (!acc[item.symbol]) {
        acc[item.symbol] = {
            symbol: item.symbol,
            name: item.name,
            type: item.type,
            imageUrl: item.imageUrl,
            totalAmount: 0,
            totalCost: 0,
            lots: []
        };
    }
    acc[item.symbol].totalAmount += item.amount;
    acc[item.symbol].totalCost += (item.amount * (item.purchasePrice || 0));
    acc[item.symbol].lots.push(item);
    return acc;
  }, {} as Record<string, any>);

  const groupedAssets = Object.values(groupedPortfolio);
  const totalPortfolioValue = groupedAssets.reduce((sum, asset) => sum + (asset.totalAmount * (livePrices[asset.symbol] || 0)), 0);

  const toggleExpand = (symbol: string) => {
    setExpandedSymbols(prev => ({ ...prev, [symbol]: !prev[symbol] }));
  };

  const handleSelectSearchResult = (asset: any) => {
    if (portType === "crypto") {
      setPortSymbol(asset.api_symbol || asset.id); 
      setPortName(asset.name);
      setPortImageUrl(asset.thumb);
    } else {
      setPortSymbol(asset.symbol);
      setPortName(asset.name);
      // Use the new Google Favicon Smart Finder
      setPortImageUrl(getSmartLogo(asset.symbol, asset.name)); 
    }
    setSearchResults([]);
  };

  const handleAddPortfolio = () => {
    if (!portName || !portSymbol || !portAmount || !portPurchasePrice || !portPlatform) return setError("Please fill all fields.");
    addPortfolioItem({ 
      name: portName, 
      symbol: portType === "crypto" ? portSymbol.toLowerCase().trim() : portSymbol.toUpperCase().trim(), 
      amount: parseFloat(portAmount),
      purchasePrice: parseFloat(portPurchasePrice),
      imageUrl: portImageUrl,
      type: portType,
      date: portDate,
      platform: portPlatform.trim()
    });
    setPortName(""); setPortSymbol(""); setPortAmount(""); setPortPurchasePrice(""); setPortImageUrl(""); setSearchResults([]); setPortPlatform("");
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    setSelectedMonth(prev => direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1));
    setIsEditingBudget(false); 
    setEditingTxId(null);
  };

  const handleBudgetSave = () => {
    if (tempBudget && parseFloat(tempBudget) >= 0) {
      updateBudget(currentMonthKey, parseFloat(tempBudget));
      setIsEditingBudget(false);
    }
  };

  const handleAddTransaction = (type: "income" | "expense") => {
    setError("");
    if (!amount || parseFloat(amount) <= 0) return setError("Please enter a valid amount greater than £0.");
    const selectedDate = parseISO(date);
    if (!isValid(selectedDate) || isFuture(selectedDate) || isBefore(selectedDate, parseISO("2020-01-01"))) {
        return setError("Please enter a valid past/present date.");
    }

    addTransaction({
      date: date,
      amount: parseFloat(amount),
      category: type === 'income' ? 'Salary' : category,
      type,
      priority: priority, 
      bankAccountId: selectedBankId || (accounts.length > 0 ? accounts[0].id : undefined), 
      note,
    });
    setAmount(""); setNote(""); setDate(new Date().toISOString().split("T")[0]); setPriority("want");
  };

  const startEditingTx = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setEditFields({
        amount: tx.amount.toString(),
        category: tx.category,
        note: tx.note || "",
        date: tx.date,
        priority: tx.priority || "want",
        bankAccountId: tx.bankAccountId || (accounts.length > 0 ? accounts[0].id : "")
    });
  };

  const saveEditedTx = () => {
    if (!editFields || !editingTxId) return;
    if (!editFields.amount || parseFloat(editFields.amount) <= 0) return;
    
    editTransaction(editingTxId, {
        amount: parseFloat(editFields.amount),
        category: editFields.category,
        note: editFields.note,
        date: editFields.date,
        priority: editFields.priority,
        bankAccountId: editFields.bankAccountId
    });
    setEditingTxId(null);
    setEditFields(null);
  };

  const handleAddSubscription = () => {
    setError("");
    if (!subName.trim()) return setError("Please enter a subscription name.");
    if (!subCost || parseFloat(subCost) <= 0) return setError("Please enter a valid cost.");
    const day = parseInt(subDay);
    if (day < 1 || day > 31) return setError("Billing day must be between 1 and 31.");
    addSubscription({ name: subName, cost: parseFloat(subCost), billingDay: day });
    setSubName(""); setSubCost(""); setSubDay("1");
  };

  const handleAddAccount = () => {
    if(!accName.trim()) return;
    addAccount(accName, accType);
    setAccName("");
  };

  const handleAddSwitch = () => {
    setError("");
    if (!swBankName.trim()) return setError("Please enter a bank name.");
    if (!swBonus || parseFloat(swBonus) <= 0) return setError("Please enter a valid bonus amount.");
    if (!swDeadline) return setError("Please select a deadline.");

    addSwitch({
      bankName: swBankName,
      bonusAmount: parseFloat(swBonus),
      switchDate: swDate,
      status: "active",
      requirements: {
        payInAmount: parseFloat(swPayIn || "0"),
        payInDeadline: swDeadline,
        directDebitsNeeded: parseInt(swDDs || "0"),
      }
    });

    setSwBankName(""); setSwBonus(""); setSwPayIn(""); setSwDDs("0");
  };

  const renderCalendar = () => {
    const start = startOfWeek(startOfMonth(pickerDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(pickerDate), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const colHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mt-2 shadow-lg absolute z-20 w-full max-w-[320px] top-full left-0">
            <div className="flex justify-between items-center mb-4">
                <button onClick={(e) => { e.preventDefault(); setPickerDate(subMonths(pickerDate, 1)); }} className="p-1.5 hover:bg-gray-100 rounded-full transition text-gray-600"><ChevronLeft size={18} /></button>
                <span className="font-bold text-gray-800">{format(pickerDate, "MMMM yyyy")}</span>
                <button onClick={(e) => { e.preventDefault(); setPickerDate(addMonths(pickerDate, 1)); }} className="p-1.5 hover:bg-gray-100 rounded-full transition text-gray-600"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 mb-2 place-items-center">
                {colHeaders.map(d => <span key={d} className="text-[10px] uppercase font-bold text-gray-400 w-8 text-center">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1 place-items-center">
                {days.map(day => {
                    const isSelected = isSameDay(day, parseISO(date));
                    const isFutureDate = isFuture(day);
                    const isDiffMonth = !isSameMonth(day, pickerDate);
                    const isTodayDate = isToday(day);
                    
                    return (
                        <button
                            key={day.toString()}
                            disabled={isFutureDate}
                            onClick={(e) => { e.preventDefault(); if (!isFutureDate) { setDate(format(day, "yyyy-MM-dd")); setShowCalendar(false); } }}
                            className={`h-9 w-9 text-sm rounded-full flex items-center justify-center transition
                                ${isSelected ? "bg-black text-white font-bold shadow-md" : "text-gray-700 hover:bg-gray-100"}
                                ${isFutureDate ? "opacity-20 cursor-not-allowed" : "cursor-pointer"}
                                ${isDiffMonth ? "opacity-30 text-gray-400" : ""}
                                ${isTodayDate && !isSelected ? "ring-2 ring-black font-bold" : ""}
                            `}
                        >
                            {format(day, "d")}
                        </button>
                    )
                })}
            </div>
        </div>
    );
  };

  const NavButton = ({ id, label }: { id: typeof activeTab, label: string }) => (
    <button onClick={() => { setActiveTab(id); setError(""); setEditingTxId(null); }} className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === id ? "bg-black text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}>{label}</button>
  );

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FinanceHub</h1>
          <p className="text-gray-500">Track spending & bank bonuses</p>
        </div>
        <div className="flex flex-wrap gap-2 bg-white p-1 rounded-lg border border-gray-200">
           <NavButton id="daily" label="Daily" />
           <NavButton id="analytics" label="Analytics" />
           <NavButton id="subscriptions" label="Subscriptions" />
           <NavButton id="portfolio" label="Portfolio" />
           <NavButton id="cards" label="My Cards" />
           <NavButton id="switches" label="Bonuses" />
        </div>
      </header>

      {(activeTab === "daily" || activeTab === "analytics") && (
        <div className="mb-8">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <button onClick={() => handleMonthChange("prev")} className="p-2 hover:bg-gray-100 rounded-full transition"><ChevronLeft size={20} /></button>
                <h2 className="text-xl font-bold text-gray-900">{format(selectedMonth, "MMMM yyyy")}</h2>
                <button onClick={() => handleMonthChange("next")} className="p-2 hover:bg-gray-100 rounded-full transition"><ChevronRight size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group">
                <div className="flex justify-between items-start mb-1">
                    <p className="text-gray-500 text-sm">Left to Spend</p>
                    {!isEditingBudget && (
                    <button onClick={() => { setTempBudget(currentBudget.toString()); setIsEditingBudget(true); }} className="text-gray-300 hover:text-black transition"><Pencil size={14} /></button>
                    )}
                </div>
                {isEditingBudget ? (
                    <div className="flex items-center gap-2 mt-1">
                    <input type="number" value={tempBudget} onChange={(e) => setTempBudget(e.target.value)} className="w-full p-1 border rounded text-lg font-bold" placeholder="Base Budget" autoFocus />
                    <button onClick={handleBudgetSave} className="bg-green-100 text-green-700 p-1.5 rounded-md hover:bg-green-200"><Check size={16}/></button>
                    <button onClick={() => setIsEditingBudget(false)} className="bg-red-100 text-red-700 p-1.5 rounded-md hover:bg-red-200"><X size={16}/></button>
                    </div>
                ) : (
                    <>
                    <h3 className={`text-2xl font-bold ${budgetLeft < 0 ? 'text-red-600' : 'text-emerald-600'}`}>£{budgetLeft.toFixed(2)}</h3>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className={`h-full rounded-full ${budgetProgress > 100 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(budgetProgress, 100)}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Base: £{currentBudget} <span className="text-green-500 font-medium">+{stats.income.toFixed(0)}</span> <span className="text-red-500 font-medium">-{stats.expense.toFixed(0)}</span>
                    </p>
                    </>
                )}
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><p className="text-gray-500 text-sm mb-1">Expenses ({format(selectedMonth, "MMM")})</p><h3 className="text-2xl font-bold text-red-600">-£{stats.expense.toFixed(2)}</h3></div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500"><p className="text-gray-500 text-sm mb-1">Fixed Subs</p><h3 className="text-2xl font-bold text-blue-600">£{monthlyFixedCost.toFixed(2)}</h3></div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><p className="text-gray-500 text-sm mb-1">Net Balance</p><h3 className="text-2xl font-bold text-gray-800">£{stats.balance.toFixed(2)}</h3></div>
            </div>
        </div>
      )}

      {activeTab === "daily" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm h-fit border border-gray-100 overflow-visible relative">
            <h2 className="text-lg font-bold mb-4">Add Transaction</h2>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100"><AlertCircle size={16} /> {error}</div>}
            <div className="space-y-4">
              
              <div className="relative z-30">
                <label className="text-sm font-medium text-gray-700">Date</label>
                <div className="relative">
                    <button onClick={() => setShowCalendar(!showCalendar)} className="w-full p-2 border rounded-lg outline-none mt-1 text-left flex items-center gap-2 bg-white hover:bg-gray-50 transition">
                        <CalendarIcon size={16} className="text-gray-500" />
                        <span>{format(parseISO(date), "EEEE, d MMMM yyyy")}</span>
                    </button>
                    {showCalendar && renderCalendar()}
                </div>
              </div>

              <div className="relative z-10">
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 border rounded-lg outline-none" placeholder="Amount (£)" />
              </div>

              <div className="grid grid-cols-2 gap-2 relative z-10">
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border rounded-lg outline-none bg-white mt-1">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Pay With</label>
                    <select value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)} className="w-full p-2 border rounded-lg outline-none bg-white mt-1">
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                 </div>
              </div>
              
              <div className="relative z-10">
                <label className="text-xs font-bold text-gray-500 uppercase">Priority / Goal</label>
                <div className="flex gap-2 mt-1">
                    {["need", "want", "save"].map((p) => (
                        <button key={p} onClick={(e) => { e.preventDefault(); setPriority(p as any); }} className={`flex-1 py-1.5 rounded-md text-xs font-bold capitalize border transition ${priority === p ? 'bg-black text-white border-black shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{p}</button>
                    ))}
                </div>
              </div>

              <div className="relative z-10">
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-2 border rounded-lg outline-none" placeholder="Note (e.g. Tesco)" />
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-2 relative z-10">
                <button onClick={() => handleAddTransaction("expense")} className="bg-red-50 text-red-600 py-2.5 rounded-lg font-medium hover:bg-red-100 transition flex justify-center gap-2"><ArrowDownLeft size={18} /> Expense</button>
                <button onClick={() => handleAddTransaction("income")} className="bg-green-50 text-green-600 py-2.5 rounded-lg font-medium hover:bg-green-100 transition flex justify-center gap-2"><ArrowUpRight size={18} /> Income</button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative z-0">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Activity in {format(selectedMonth, "MMMM")}</h2>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{currentTransactions.length} items</span>
            </div>
            <div className="space-y-3">
              {currentTransactions.length === 0 && <div className="text-center py-10 text-gray-400">No transactions found for this month.</div>}
              {currentTransactions.map((tx) => {
                const txAccount = accounts.find(a => a.id === tx.bankAccountId) || accounts[0];
                
                if (editingTxId === tx.id && editFields) {
                    return (
                        <div key={tx.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3 shadow-inner">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold uppercase text-gray-500">Edit Transaction</span>
                                <div className="flex gap-2">
                                    <button onClick={saveEditedTx} className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600"><Check size={16}/></button>
                                    <button onClick={() => setEditingTxId(null)} className="p-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"><X size={16}/></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                <input type="date" value={editFields.date} onChange={(e) => setEditFields({...editFields, date: e.target.value})} className="p-1.5 border rounded text-sm outline-none focus:border-black" />
                                <input type="number" value={editFields.amount} onChange={(e) => setEditFields({...editFields, amount: e.target.value})} className="p-1.5 border rounded text-sm outline-none focus:border-black" />
                                <select value={editFields.category} onChange={(e) => setEditFields({...editFields, category: e.target.value})} className="p-1.5 border rounded text-sm outline-none bg-white">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select value={editFields.priority} onChange={(e) => setEditFields({...editFields, priority: e.target.value as any})} className="p-1.5 border rounded text-sm outline-none bg-white capitalize">
                                    <option value="need">Need</option><option value="want">Want</option><option value="save">Save</option>
                                </select>
                                <select value={editFields.bankAccountId} onChange={(e) => setEditFields({...editFields, bankAccountId: e.target.value})} className="p-1.5 border rounded text-sm outline-none bg-white">
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                                <input type="text" value={editFields.note} onChange={(e) => setEditFields({...editFields, note: e.target.value})} className="p-1.5 border rounded text-sm outline-none focus:border-black md:col-span-1 col-span-2" placeholder="Note" />
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition group border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{tx.type === 'income' ? <ArrowUpRight size={18}/> : <ArrowDownLeft size={18}/>}</div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{tx.note || tx.category}</p>
                                {tx.type === 'expense' && tx.priority && PRIORITY_COLORS[tx.priority] && (
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[tx.priority]}`}>{tx.priority}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs mt-0.5">
                                <span className="text-gray-500">{tx.date}</span>
                                {txAccount && (
                                    <span className={`px-1.5 py-0.5 rounded text-white ${txAccount.color} bg-opacity-90`}>{txAccount.name}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>{tx.type === 'expense' ? '-' : '+'}£{tx.amount.toFixed(2)}</span>
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                            <button onClick={() => startEditingTx(tx)} className="text-gray-400 hover:text-blue-500 transition p-1.5 rounded-md hover:bg-blue-50"><Pencil size={15} /></button>
                            <button onClick={() => removeTransaction(tx.id)} className="text-gray-400 hover:text-red-500 transition p-1.5 rounded-md hover:bg-red-50"><Trash2 size={15} /></button>
                        </div>
                    </div>
                    </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-6"><BarChart3 size={20} className="text-gray-500"/><h2 className="text-xl font-bold">Monthly History</h2></div>
                <div className="h-[300px] w-full">
                  {historyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `£${value}`} />
                            <Tooltip formatter={(value) => `£${value}`} cursor={{fill: 'transparent'}} />
                            <Legend />
                            <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center text-gray-400">Add transactions in different months to compare!</div>}
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-6 w-full"><PieIcon size={20} className="text-gray-500"/><h2 className="text-xl font-bold">Category Breakdown ({format(selectedMonth, "MMM")})</h2></div>
                <div className="h-[300px] w-full">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value) => `£${value}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center text-gray-400">No expenses for {format(selectedMonth, "MMMM")}.</div>}
                </div>
            </div>
        </div>
      )}

      {/* SUBSCRIPTIONS TAB */}
      {activeTab === "subscriptions" && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm h-fit border border-gray-100">
            <h2 className="text-lg font-bold mb-4">Add Subscription</h2>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100"><AlertCircle size={16} /> {error}</div>}
            <div className="space-y-4">
              <div><label className="text-sm font-medium text-gray-700">Service Name</label><input type="text" value={subName} onChange={(e) => setSubName(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1" /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-gray-700">Cost (£)</label><input type="number" value={subCost} onChange={(e) => setSubCost(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1" /></div><div><label className="text-sm font-medium text-gray-700">Day (1-31)</label><input type="number" min="1" max="31" value={subDay} onChange={(e) => setSubDay(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1" /></div></div>
              <button onClick={handleAddSubscription} className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition mt-2">Add Subscription</button>
            </div>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h2 className="text-lg font-bold mb-4">Your Fixed Monthly Costs</h2>
               <div className="space-y-3">
                 {subscriptions.length === 0 && <p className="text-gray-400 text-sm">No subscriptions yet.</p>}
                 {subscriptions.sort((a,b) => a.billingDay - b.billingDay).map(sub => (
                   <div key={sub.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex flex-col items-center justify-center text-gray-600 border border-gray-200">
                            <span className="text-[10px] uppercase font-bold leading-none mb-0.5">Day</span>
                            <span className="text-sm font-black leading-none text-black">{sub.billingDay}</span>
                        </div>
                        <span className="font-bold text-gray-900">{sub.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-900">£{sub.cost.toFixed(2)}</span>
                        <button onClick={() => removeSubscription(sub.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
         </div>
      )}
      
      {/* PORTFOLIO TAB */}
      {activeTab === "portfolio" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Asset Sidebar */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm h-fit border border-gray-100">
              <h2 className="text-lg font-bold mb-4">Record Trade</h2>
              {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100"><AlertCircle size={16} /> {error}</div>}
              <div className="space-y-4">
                  
                  <div>
                      <label className="text-sm font-medium text-gray-700">Asset Type</label>
                      <div className="flex gap-2 mt-1">
                          <button onClick={() => { setPortType("crypto"); setSearchResults([]); setPortSymbol(""); }} className={`flex-1 py-2 rounded-md text-sm border font-medium ${portType === "crypto" ? 'bg-black text-white' : 'bg-white text-gray-600'}`}>Crypto</button>
                          <button onClick={() => { setPortType("stock"); setSearchResults([]); setPortSymbol(""); }} className={`flex-1 py-2 rounded-md text-sm border font-medium ${portType === "stock" ? 'bg-black text-white' : 'bg-white text-gray-600'}`}>Stock / ETF</button>
                      </div>
                  </div>

                  {/* Search Input */}
                  <div className="relative z-20">
                      <label className="text-sm font-medium text-gray-700">Search Symbol or Name</label>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" value={portSymbol} onChange={(e) => setPortSymbol(e.target.value)} className="w-full pl-9 pr-2 py-2 border rounded-lg outline-none focus:border-black transition" placeholder={portType === "crypto" ? "e.g. bitcoin" : "e.g. Greggs or GRG.L"} />
                      </div>
                      
                      {searchResults.length > 0 && (
                          <div className="absolute w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-50">
                              {searchResults.map((asset, i) => (
                                  <button key={i} onClick={() => handleSelectSearchResult(asset)} className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3 border-b last:border-b-0 transition">
                                      {asset.thumb ? (
                                          <img src={asset.thumb} alt="logo" className="w-8 h-8 rounded-full" />
                                      ) : (
                                          <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-xs font-bold uppercase tracking-wider ${asset.type === 'crypto' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                              {asset.symbol.substring(0, 2)}
                                          </div>
                                      )}
                                      <div className="flex flex-col overflow-hidden">
                                          <span className="font-bold text-sm text-gray-900 truncate">{asset.name}</span>
                                          <div className="flex items-center gap-2 text-xs text-gray-500">
                                              <span className="font-mono text-black">{asset.symbol}</span>
                                              {/* SHOW EXCHANGE BADGE */}
                                              {asset.exchange && (
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${asset.exchange === 'London' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {asset.exchange}
                                                </span>
                                              )}
                                          </div>
                                      </div>
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>

                  <div>
                      <label className="text-sm font-medium text-gray-700">Display Name</label>
                      <input type="text" value={portName} onChange={(e) => setPortName(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-sm font-medium text-gray-700">{portType === "crypto" ? "Coins Bought" : "Shares Bought"}</label>
                          <input type="number" step="any" value={portAmount} onChange={(e) => setPortAmount(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1" placeholder="0.00" />
                      </div>
                      <div>
                          <label className="text-sm font-medium text-gray-700">Purchase Price (£)</label>
                          <input type="number" step="any" value={portPurchasePrice} onChange={(e) => setPortPurchasePrice(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1" placeholder="Cost per share" />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-sm font-medium text-gray-700">Platform</label>
                          <input type="text" value={portPlatform} onChange={(e) => setPortPlatform(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1" placeholder="e.g. Vanguard" />
                      </div>
                      <div>
                          <label className="text-sm font-medium text-gray-700">Date Bought</label>
                          <input type="date" value={portDate} onChange={(e) => setPortDate(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1" />
                      </div>
                  </div>

                  <button onClick={handleAddPortfolio} className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition">Record Trade</button>
              </div>
          </div>

          {/* Master-Detail List */}
          <div className="lg:col-span-2 space-y-4">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Live Holdings</h2>
                    <p className="text-sm text-gray-500">
                      Total Value: <span className="font-bold text-black text-lg">£{totalPortfolioValue.toFixed(2)}</span>
                    </p>
                  </div>
                  <button onClick={refreshPrices} disabled={isRefreshing} className="w-full md:w-auto justify-center bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition flex items-center gap-2 shadow-sm disabled:opacity-50">
                     {isRefreshing ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                     {isRefreshing ? "Updating..." : "Refresh Prices"}
                  </button>
              </div>

              {/* Platform Filter */}
              {allPlatforms.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <button onClick={() => setSelectedPlatform("All")} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${selectedPlatform === "All" ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                    All Platforms
                  </button>
                  {allPlatforms.map(platform => (
                    <button key={platform} onClick={() => setSelectedPlatform(platform)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${selectedPlatform === platform ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                      {platform}
                    </button>
                  ))}
                </div>
              )}

              {groupedAssets.length === 0 && (
                <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center text-gray-400">
                    No trades found. Add some assets to start tracking!
                </div>
              )}

              {/* Mapped Accordion Rows */}
              {groupedAssets.map(asset => {
                  const currentPrice = livePrices[asset.symbol] || 0;
                  const totalValue = asset.totalAmount * currentPrice;
                  
                  // Weighted Average Math
                  const avgPrice = asset.totalAmount > 0 ? (asset.totalCost / asset.totalAmount) : 0;
                  const profitLoss = totalValue - asset.totalCost;
                  const ror = asset.totalCost > 0 ? (profitLoss / asset.totalCost) * 100 : 0;
                  const isProfit = profitLoss >= 0;
                  
                  const isExpanded = expandedSymbols[asset.symbol];

                  return (
                    <div key={asset.symbol} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-300 transition overflow-hidden">
                      
                      {/* Master Row (Click to expand) */}
                      <div onClick={() => toggleExpand(asset.symbol)} className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 cursor-pointer gap-4">
                          <div className="flex items-center gap-4 relative">
                              {/* 1. The Fallback Badge (Always rendered, sits behind the image) */}
                              <div className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex-shrink-0 ${asset.type === 'crypto' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {asset.symbol.substring(0, 2)}
                              </div>

                              {/* 2. The Real Image (Sits on top. If it fails, we hide it.) */}
                              {asset.imageUrl && (
                                  <img 
                                      src={asset.imageUrl} 
                                      alt={asset.name} 
                                      className="w-10 h-10 rounded-full border border-gray-100 shadow-sm object-contain bg-white absolute top-0 left-0"
                                      onError={(e) => {
                                          e.currentTarget.style.display = 'none'; // Hide broken image so fallback shows
                                      }}
                                  />
                              )}

                              {/* 3. Text Info */}
                              <div className="ml-2"> 
                                  <h3 className="font-bold text-lg text-gray-900 leading-tight flex items-center gap-2">
                                      {asset.name} 
                                  </h3>
                                  <p className="text-sm text-gray-500 font-mono mt-0.5">{Number(asset.totalAmount.toFixed(8))} {asset.symbol.toUpperCase()}</p>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0">
                              <div className="text-left md:text-right">
                                  <p className="font-bold text-xl text-gray-900">£{totalValue.toFixed(2)}</p>
                                  <p className="text-xs text-gray-400 mb-1">Live: £{currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2})} • Avg: £{avgPrice.toFixed(2)}</p>
                                  
                                  {asset.totalCost > 0 && currentPrice > 0 && (
                                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${isProfit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                          {isProfit ? <ArrowUpRight size={12}/> : <ArrowDownLeft size={12}/>}
                                          £{Math.abs(profitLoss).toFixed(2)} ({Math.abs(ror).toFixed(2)}%)
                                      </div>
                                  )}
                              </div>
                              <div className="text-gray-400 bg-gray-50 p-2 rounded-lg">
                                  {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                              </div>
                          </div>
                      </div>

                      {/* Detail Rows (Specific Trades) */}
                      {isExpanded && (
                          <div className="bg-gray-50 border-t border-gray-100 p-4 space-y-2">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Tax Lots / Trades</h4>
                              {asset.lots.map((lot: any) => {
                                  const lotCost = lot.amount * (lot.purchasePrice || 0);
                                  const lotValue = lot.amount * currentPrice;
                                  const lotPL = lotValue - lotCost;
                                  const lotProfit = lotPL >= 0;

                                  return (
                                      <div key={lot.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm">
                                          <div>
                                              <div className="flex items-center gap-2">
                                                  <span className="font-bold">{Number(lot.amount.toFixed(8))} {asset.type === 'crypto' ? 'Coins' : 'Shares'}</span>
                                                  <span className="text-gray-400">@ £{lot.purchasePrice}</span>
                                              </div>
                                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                  <span className="bg-gray-100 px-2 py-0.5 rounded">{lot.platform || "Unknown"}</span>
                                                  <span>{lot.date ? format(parseISO(lot.date), "dd MMM yyyy") : "No date"}</span>
                                              </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-4">
                                              {currentPrice > 0 && (
                                                  <span className={`font-bold ${lotProfit ? 'text-green-600' : 'text-red-600'}`}>
                                                      {lotProfit ? '+' : '-'}£{Math.abs(lotPL).toFixed(2)}
                                                  </span>
                                              )}
                                              <button onClick={() => removePortfolioItem(lot.id)} className="text-gray-400 hover:text-red-500 transition p-1.5 hover:bg-red-50 rounded-md">
                                                  <Trash2 size={16}/>
                                              </button>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                    </div>
                  )
              })}
          </div>
        </div>
      )}

      {/* CARDS TAB */}
      {activeTab === "cards" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm h-fit border border-gray-100">
                <h2 className="text-lg font-bold mb-4">Add Bank / Card</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Bank Name</label>
                        <input type="text" value={accName} onChange={(e) => setAccName(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1" placeholder="e.g. Monzo" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Type</label>
                        <div className="flex gap-2 mt-1">
                            <button onClick={() => setAccType("debit")} className={`flex-1 py-2 rounded-md text-sm border ${accType === "debit" ? 'bg-black text-white' : 'bg-white text-gray-600'}`}>Debit</button>
                            <button onClick={() => setAccType("credit")} className={`flex-1 py-2 rounded-md text-sm border ${accType === "credit" ? 'bg-black text-white' : 'bg-white text-gray-600'}`}>Credit</button>
                        </div>
                    </div>
                    <button onClick={handleAddAccount} className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition">Add Card</button>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {accounts.map(acc => (
                        <div key={acc.id} className={`${acc.color} text-white p-6 rounded-xl shadow-md relative overflow-hidden group`}>
                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <p className="text-white/70 text-sm uppercase font-bold tracking-wider">{acc.type}</p>
                                    <h3 className="text-2xl font-bold mt-1">{acc.name}</h3>
                                </div>
                                <CardIcon className="text-white/50" size={32} />
                            </div>
                            <div className="relative z-10 mt-8 flex justify-between items-end">
                                <p className="font-mono text-white/80 tracking-widest">•••• ••••</p>
                                <button onClick={() => removeAccount(acc.id)} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg backdrop-blur-sm transition"><Trash2 size={16} /></button>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="absolute top-10 -left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* SWITCHES TAB */}
      {activeTab === "switches" && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm h-fit border border-gray-100">
                <h2 className="text-lg font-bold mb-4">Add Switch Tracker</h2>
                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100"><AlertCircle size={16} /> {error}</div>}
                
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Bank Name</label>
                        <input type="text" value={swBankName} onChange={(e) => setSwBankName(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1" placeholder="e.g. NatWest" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Bonus (£)</label>
                            <input type="number" value={swBonus} onChange={(e) => setSwBonus(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1" placeholder="175" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Start Date</label>
                            <input type="date" value={swDate} onChange={(e) => setSwDate(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1 text-sm" />
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Requirements</p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Pay In Amount (£)</label>
                                <input type="number" value={swPayIn} onChange={(e) => setSwPayIn(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1" placeholder="e.g. 1000" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Required Direct Debits</label>
                                <input type="number" value={swDDs} onChange={(e) => setSwDDs(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1" placeholder="e.g. 2" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Deadline Date</label>
                                <input type="date" value={swDeadline} onChange={(e) => setSwDeadline(e.target.value)} className="w-full p-2 border rounded-lg outline-none mt-1 text-sm" />
                            </div>
                        </div>
                    </div>

                    <button onClick={handleAddSwitch} className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition mt-4 flex items-center justify-center gap-2">
                        <Plus size={18} /> Track Bank Switch
                    </button>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {switches.length === 0 && (
                <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center text-gray-400">
                    No active switches. Start hunting those bonuses!
                </div>
              )}

              {switches.map((sw) => {
                const isCompleted = sw.status === "completed";
                const isFailed = sw.status === "failed";
                const isActive = sw.status === "active";
                const daysLeft = differenceInDays(new Date(sw.requirements.payInDeadline), new Date());
                const isUrgent = isActive && daysLeft < 7 && daysLeft >= 0;
                const isOverdue = isActive && daysLeft < 0;

                return (
                  <div key={sw.id} className={`border rounded-xl p-5 transition bg-white shadow-sm ${isCompleted ? 'border-green-200' : isFailed ? 'border-red-200' : 'border-gray-200'}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className={`font-bold text-xl ${isCompleted ? 'text-green-700' : isFailed ? 'text-red-700' : 'text-gray-900'}`}>
                                    {sw.bankName}
                                </h3>
                                
                                {isCompleted && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Paid</span>}
                                {isFailed && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><XCircle size={12}/> Failed</span>}
                                {isActive && <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Clock size={12}/> In Progress</span>}
                                
                                <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-gray-200">
                                    Reward: £{sw.bonusAmount}
                                </span>
                            </div>
                            
                            <p className="text-sm text-gray-500 mb-4">Switch started: {format(parseISO(sw.switchDate), "do MMM yyyy")}</p>
                            
                            <div className="flex flex-wrap gap-3 text-sm">
                                {sw.requirements.payInAmount > 0 && (
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${isCompleted ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
                                        <Wallet size={16} /> Pay in £{sw.requirements.payInAmount}
                                    </div>
                                )}
                                {sw.requirements.directDebitsNeeded > 0 && (
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${isCompleted ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
                                        <CardIcon size={16} /> {sw.requirements.directDebitsNeeded} Direct Debits
                                    </div>
                                )}
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium
                                    ${isCompleted ? 'bg-green-50 border-green-100 text-green-700' : 
                                      isFailed ? 'bg-red-50 border-red-100 text-red-700' : 
                                      isOverdue ? 'bg-red-100 border-red-200 text-red-700' :
                                      isUrgent ? 'bg-orange-100 border-orange-200 text-orange-700' : 
                                      'bg-blue-50 border-blue-100 text-blue-700'}`}
                                >
                                    <AlertCircle size={16} /> 
                                    {isCompleted ? "Goal Reached" : 
                                     isFailed ? "Deadline Missed" : 
                                     isOverdue ? "Deadline Passed!" : 
                                     `${daysLeft} days left (Due ${format(parseISO(sw.requirements.payInDeadline), "do MMM")})`}
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 md:mt-0 flex flex-row md:flex-col gap-2 w-full md:w-auto">
                            {isActive && (
                                <>
                                    <button onClick={() => updateSwitchStatus(sw.id, "completed")} className="flex-1 md:flex-none text-sm font-medium bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-4 py-2 rounded-lg transition flex items-center justify-center gap-2">
                                        <CheckCircle2 size={16} /> Mark Paid
                                    </button>
                                    <button onClick={() => updateSwitchStatus(sw.id, "failed")} className="flex-1 md:flex-none text-sm font-medium bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 px-4 py-2 rounded-lg transition">
                                        Mark Failed
                                    </button>
                                </>
                            )}
                            <button onClick={() => removeSwitch(sw.id)} className="flex-none p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition flex items-center justify-center">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
         </div>
      )}
    </main>
  );
}