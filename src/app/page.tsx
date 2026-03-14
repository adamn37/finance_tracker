"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useFinanceData, Transaction } from "@/hooks/useFinanceData";
import { Plus, Wallet, ArrowUpRight, ArrowDownLeft, Trash2, PieChart as PieIcon, BarChart3, AlertCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pencil, Check, X, CreditCard as CardIcon, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, RefreshCw, Search, Lock, Sparkles, Settings2, Activity, DownloadCloud, GripHorizontal, TrendingUp, Layers, Upload, Moon, Sun } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { differenceInDays, parseISO, isFuture, isValid, isBefore, addMonths, subMonths, format, isSameMonth, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from "date-fns";

const CATEGORIES = ["Uncategorized", "Groceries", "Transport", "Food", "Entertainment", "Rent", "Hobby", "Investing", "Subscriptions", "Electricity", "WIFI", "Gifts"];
const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#06b6d4", "#84cc16"];
const PRIORITY_COLORS = { need: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800", want: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800", save: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" };

// --- REUSABLE WIDGET WRAPPER ---
const WidgetWrapper = ({ title, icon: Icon, onClick, children, isPremium = false, isEditing = false, onRemove = undefined, draggable = false, onDragStart, onDragEnter, onDragEnd }: any) => (
  <div 
    draggable={draggable} onDragStart={onDragStart} onDragEnter={onDragEnter} onDragEnd={onDragEnd} onDragOver={(e) => e.preventDefault()} onClick={!isEditing ? onClick : undefined}
    className={`bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border transition-all h-full flex flex-col relative overflow-hidden group 
      ${isEditing ? 'border-dashed border-2 border-blue-300 dark:border-blue-700 scale-[0.98] cursor-grab active:cursor-grabbing hover:bg-blue-50/50 dark:hover:bg-blue-900/20' : 'border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'}`}
  >
    {isEditing && (
      <div className="absolute top-0 left-0 w-full h-full z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/40 dark:bg-black/40 backdrop-blur-[1px]">
         <div className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 p-2 rounded-full shadow-lg flex items-center gap-2 font-semibold text-sm"><GripHorizontal size={18} /> Drag to move</div>
      </div>
    )}
    {isEditing && onRemove && (
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute top-3 right-3 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-1.5 rounded-full z-20 hover:bg-red-200 dark:hover:bg-red-900 transition-colors shadow-sm"><X size={14} strokeWidth={3} /></button>
    )}
    <div className="flex justify-between items-center mb-4 relative z-0">
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 text-sm uppercase tracking-wider">{Icon && <Icon size={16} className={isEditing ? "text-blue-400" : "text-gray-400 dark:text-gray-500"} />}{title}</h3>
      {!isEditing && (
        isPremium ? <span className="bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 text-[10px] font-bold uppercase px-2 py-1 rounded-full flex items-center gap-1 shadow-sm"><Lock size={10} /> Pro</span> : onClick && <ArrowUpRight size={18} className="text-gray-300 dark:text-gray-600 group-hover:text-black dark:group-hover:text-white transition-colors" />
      )}
    </div>
    <div className={`flex-1 flex flex-col justify-center relative z-0 ${isEditing ? 'opacity-50 grayscale transition-all' : ''}`}>{children}</div>
  </div>
);

const AVAILABLE_WIDGETS = [
  { id: "netWorth", label: "Total Net Worth", icon: Wallet }, { id: "portfolioTotal", label: "Portfolio Performance", icon: TrendingUp }, 
  { id: "allocation", label: "Asset Allocation", icon: PieIcon }, { id: "portfolio", label: "Top Holdings", icon: BarChart3 }, 
  { id: "assetCarousel", label: "Asset Carousel", icon: Layers }, { id: "monthly", label: "Monthly Spending", icon: PieIcon },
  { id: "switches", label: "Active Bonuses", icon: Clock }, { id: "upcoming", label: "Upcoming Payments", icon: CalendarIcon }, 
  { id: "recent", label: "Recent Activity", icon: Activity }, { id: "ai", label: "AI Insights (Pro)", icon: Sparkles }
];

export default function Dashboard() {
  const { 
    transactions, switches, subscriptions, budgets, accounts, addTransaction, removeTransaction, editTransaction,
    addSwitch, removeSwitch, updateSwitchStatus, addSubscription, removeSubscription, updateBudget, addAccount, removeAccount,
    getMonthlyHistory, isLoaded, portfolio, livePrices, addPortfolioItem, removePortfolioItem, refreshPrices, isRefreshing, useExtendedHours, setUseExtendedHours 
  } = useFinanceData();
  
  const [activeTab, setActiveTab] = useState<"overview" | "daily" | "analytics" | "subscriptions" | "switches" | "cards" | "portfolio">("overview");
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // DARK MODE STATE
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

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

  const [isEditingDashboard, setIsEditingDashboard] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(["netWorth", "portfolioTotal", "allocation", "portfolio", "upcoming", "monthly"]);
  const [draggedWidgetIdx, setDraggedWidgetIdx] = useState<number | null>(null);

  const [hasAutoFetched, setHasAutoFetched] = useState(false);
  useEffect(() => { if (isLoaded && portfolio.length > 0 && !hasAutoFetched) { refreshPrices(); setHasAutoFetched(true); } }, [isLoaded, portfolio.length, hasAutoFetched]);

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

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]); 
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]); 
  const [priority, setPriority] = useState<"need" | "want" | "save">("want");
  const [selectedBankId, setSelectedBankId] = useState(""); 
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<any>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  const [subName, setSubName] = useState(""); const [subCost, setSubCost] = useState(""); const [subDay, setSubDay] = useState("1");
  const [accName, setAccName] = useState(""); const [accType, setAccType] = useState<"debit" | "credit">("debit");
  const [swBankName, setSwBankName] = useState(""); const [swBonus, setSwBonus] = useState(""); const [swDate, setSwDate] = useState(new Date().toISOString().split("T")[0]);
  const [swPayIn, setSwPayIn] = useState(""); const [swDeadline, setSwDeadline] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]); const [swDDs, setSwDDs] = useState("0");

  const [portName, setPortName] = useState(""); const [portSymbol, setPortSymbol] = useState(""); const [portAmount, setPortAmount] = useState("");
  const [portType, setPortType] = useState<"crypto" | "stock">("crypto"); const [portPurchasePrice, setPortPurchasePrice] = useState("");
  const [portImageUrl, setPortImageUrl] = useState(""); const [portPlatform, setPortPlatform] = useState(""); const [portDate, setPortDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchResults, setSearchResults] = useState<any[]>([]); const [isSearching, setIsSearching] = useState(false);
  const [selectedActivityAccount, setSelectedActivityAccount] = useState<string>("All");
  const [expandedSymbols, setExpandedSymbols] = useState<Record<string, boolean>>({});
  const [selectedPlatform, setSelectedPlatform] = useState<string>("All");

  const getSmartLogo = (symbol: string, name: string) => {
    const n = name.toLowerCase(); const s = symbol.toUpperCase().split('.')[0]; 
    const getGoogleIcon = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    if (n.includes("vanguard")) return getGoogleIcon("vanguard.co.uk");
    if (n.includes("ishares")) return getGoogleIcon("ishares.com");
    if (n.includes("apple")) return getGoogleIcon("apple.com");
    if (n.includes("tesla")) return getGoogleIcon("tesla.com");
    if (n.includes("greggs")) return getGoogleIcon("greggs.co.uk");
    return `https://financialmodelingprep.com/image-stock/${s}.png`;
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (portSymbol.length < 2) { setSearchResults([]); return; }
      setIsSearching(true);
      try {
        if (portType === "crypto") {
          const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${portSymbol}`);
          const data = await res.json(); setSearchResults(data.coins?.slice(0, 5) || []);
        } else {
          const res = await fetch(`/api/search?q=${portSymbol}`);
          if (!res.ok) throw new Error("Search failed");
          const data = await res.json();
          let mappedResults = (data.quotes || []).filter((q: any) => q.quoteType === "EQUITY" || q.quoteType === "ETF").map((q: any) => ({
                symbol: q.symbol, name: q.shortname || q.longname || q.symbol, exchange: q.exchDisp || "Unknown", type: q.quoteType, isUK: (q.exchDisp === "London" || q.symbol.endsWith(".L"))
          }));
          mappedResults.sort((a: any, b: any) => {
             if (a.symbol === portSymbol.toUpperCase()) return -1; if (b.symbol === portSymbol.toUpperCase()) return 1;
             if (a.isUK && !b.isUK) return -1; if (!a.isUK && b.isUK) return 1; return 0;
          });
          setSearchResults(mappedResults.slice(0, 6)); 
        }
      } catch (err) { console.error("Search failed:", err); }
      setIsSearching(false);
    }, 400); 
    return () => clearTimeout(delayDebounceFn);
  }, [portSymbol, portType]);

  useEffect(() => {
    const n = note.toLowerCase();
    if (n.includes("tesco") || n.includes("aldi") || n.includes("asda") || n.includes("sainsbury")) setCategory("Groceries");
    else if (n.includes("uber") || n.includes("train") || n.includes("tfl") || n.includes("petrol")) setCategory("Transport");
    else if (n.includes("mcdonalds") || n.includes("kfc") || n.includes("restaurant") || n.includes("coffee") || n.includes("starbucks") || n.includes("deliveroo")) setCategory("Food");
    else if (n.includes("netflix") || n.includes("spotify") || n.includes("amazon prime")) setCategory("Subscriptions");
    else if (n.includes("rent") || n.includes("mortgage")) setCategory("Rent");
    else if (n === "") setCategory("Uncategorized"); 
  }, [note]);

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        const lines = text.split('\n');
        if (lines.length < 2) return setError("CSV file seems empty.");

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
        const actionIdx = headers.findIndex(h => h.includes('action'));
        const tickerIdx = headers.findIndex(h => h.includes('ticker'));
        const nameIdx = headers.findIndex(h => h.includes('name'));
        const sharesIdx = headers.findIndex(h => h.includes('no. of shares') || h === 'shares');
        const priceIdx = headers.findIndex(h => h.includes('price / share') || h === 'price');
        const timeIdx = headers.findIndex(h => h.includes('time') || h === 'date');
        const currIdx = headers.findIndex(h => h.includes('currency (price'));
        const fxRateIdx = headers.findIndex(h => h.includes('exchange rate'));

        if (tickerIdx === -1 || sharesIdx === -1 || priceIdx === -1) return setError("Invalid CSV format.");

        let importCount = 0;
        lines.slice(1).forEach(line => {
            if (!line.trim()) return;
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, '').trim());
            if (cols.length <= Math.max(tickerIdx, sharesIdx, priceIdx)) return;

            const action = actionIdx >= 0 ? cols[actionIdx].toLowerCase() : 'buy';
            
            if (action.includes('buy') || action.includes('sell')) {
                let symbol = cols[tickerIdx];
                const name = nameIdx >= 0 ? cols[nameIdx] : symbol;
                let shares = parseFloat(cols[sharesIdx]);
                let price = parseFloat(cols[priceIdx]);
                const currency = currIdx >= 0 ? cols[currIdx] : '';
                let fxRate = fxRateIdx >= 0 ? parseFloat(cols[fxRateIdx]) : 1;
                
                if (isNaN(shares) || isNaN(price)) return;
                if (isNaN(fxRate) || fxRate === 0) fxRate = 1;
                if (action.includes('sell')) shares = -Math.abs(shares);

                if (symbol === 'ASML') symbol = 'ASML.AS';
                else if (symbol === 'VHVG') symbol = 'VHVG.AS';
                else if (symbol === 'VFEG') symbol = 'VFEG.AS';
                else if (currency === 'GBX' || currency === 'GBP') {
                    if (!symbol.includes('.')) symbol += '.L'; 
                } else if (currency === 'EUR') {
                    if (symbol === 'HEIA') symbol = 'HEIA.AS'; 
                    else if (symbol === 'BMW') symbol = 'BMW.DE';
                    else if (!symbol.includes('.')) symbol += '.DE'; 
                }

                let purchasePriceGBP = price;
                if (currency === 'GBX') purchasePriceGBP = price / 100; 
                else if (currency === 'USD' || currency === 'EUR') purchasePriceGBP = price / fxRate; 

                if (symbol) {
                    addPortfolioItem({
                        name: name || symbol, symbol: symbol, amount: shares, purchasePrice: purchasePriceGBP,
                        imageUrl: getSmartLogo(symbol, name || symbol), type: 'stock',
                        date: timeIdx >= 0 && cols[timeIdx] ? cols[timeIdx].split(' ')[0] : new Date().toISOString().split('T')[0],
                        platform: 'Trading 212'
                    });
                    importCount++;
                }
            }
        });
        alert(`Successfully synced ${importCount} trades from Trading 212! Click "Refresh Prices" to see live data.`);
        e.target.value = ''; 
    };
    reader.readAsText(file);
  };

  // --- DATA CALCULATIONS ---
  const currentMonthKey = format(selectedMonth, "yyyy-MM");
  const currentTransactions = transactions.filter((tx) => isSameMonth(parseISO(tx.date), selectedMonth)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const stats = useMemo(() => {
    const income = currentTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expense = currentTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [currentTransactions]);

  const pieData = useMemo(() => {
    const expenseTx = currentTransactions.filter(t => t.type === 'expense');
    const categoryTotals: Record<string, number> = {};
    expenseTx.forEach(tx => { categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount; });
    return Object.keys(categoryTotals).map(cat => ({ name: cat, value: categoryTotals[cat] }));
  }, [currentTransactions]);

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-400">Loading your finances...</div>;

  const monthlyFixedCost = (subscriptions || []).reduce((sum, sub) => sum + sub.cost, 0);
  const historyData = getMonthlyHistory();
  const currentBudget = budgets[currentMonthKey] || 0;
  const totalAvailable = currentBudget + stats.income;
  const budgetLeft = totalAvailable - stats.expense;
  const budgetProgress = totalAvailable > 0 ? (stats.expense / totalAvailable) * 100 : 0;

  const allPlatforms = Array.from(new Set((portfolio || []).map(p => p.platform).filter(Boolean)));
  const filteredPortfolio = (portfolio || []).filter(item => selectedPlatform === "All" || item.platform === selectedPlatform);

  const groupedPortfolio = filteredPortfolio.reduce((acc, item) => {
    if (!acc[item.symbol]) { acc[item.symbol] = { symbol: item.symbol, name: item.name, type: item.type, imageUrl: item.imageUrl, totalAmount: 0, totalCost: 0, lots: [] }; }
    acc[item.symbol].totalAmount += item.amount;
    acc[item.symbol].totalCost += (item.amount * (item.purchasePrice || 0));
    acc[item.symbol].lots.push(item);
    return acc;
  }, {} as Record<string, any>);

  const groupedAssets = Object.values(groupedPortfolio);
  
  const portfolioWithMetrics = groupedAssets
      .filter(asset => asset.totalAmount > 0.000001) 
      .map(asset => {
          const avgPrice = asset.totalAmount > 0 ? (asset.totalCost / asset.totalAmount) : 0;
          const currentPriceToUse = livePrices[asset.symbol] || avgPrice; 
          const liveValue = asset.totalAmount * currentPriceToUse;
          const profitLoss = liveValue - asset.totalCost;
          const ror = asset.totalCost > 0 ? (profitLoss / asset.totalCost) * 100 : 0;
          return { ...asset, liveValue, profitLoss, ror, isProfit: profitLoss >= 0 }
      });

  const topHoldings = [...portfolioWithMetrics].sort((a, b) => b.liveValue - a.liveValue).slice(0, 3);
  const totalPortfolioCost = portfolioWithMetrics.reduce((sum, a) => sum + a.totalCost, 0);
  const totalPortfolioValue = portfolioWithMetrics.reduce((sum, a) => sum + a.liveValue, 0);
  const totalPortfolioPL = totalPortfolioValue - totalPortfolioCost;
  const totalPortfolioROR = totalPortfolioCost > 0 ? (totalPortfolioPL / totalPortfolioCost) * 100 : 0;
  const isPortProfit = totalPortfolioPL >= 0;

  const totalCash = transactions.reduce((sum, tx) => sum + (tx.type === "income" ? tx.amount : -tx.amount), 0);
  const netWorth = totalPortfolioValue + totalCash;

  const todayDay = new Date().getDate();
  const upcomingSubs = [...subscriptions].sort((a, b) => {
    let diffA = a.billingDay - todayDay; if(diffA < 0) diffA += 30; 
    let diffB = b.billingDay - todayDay; if(diffB < 0) diffB += 30;
    return diffA - diffB;
  });

  const activeSwitches = switches.filter(sw => sw.status === "active").sort((a, b) => new Date(a.requirements.payInDeadline).getTime() - new Date(b.requirements.payInDeadline).getTime());
  const toggleExpand = (symbol: string) => setExpandedSymbols(prev => ({ ...prev, [symbol]: !prev[symbol] }));

  const handleSelectSearchResult = (asset: any) => {
    if (portType === "crypto") { setPortSymbol(asset.api_symbol || asset.id); setPortName(asset.name); setPortImageUrl(asset.thumb); } 
    else { setPortSymbol(asset.symbol); setPortName(asset.name); setPortImageUrl(getSmartLogo(asset.symbol, asset.name)); }
    setSearchResults([]);
  };

  const handleAddPortfolio = () => {
    if (!portName || !portSymbol || !portAmount || !portPurchasePrice || !portPlatform) return setError("Please fill all fields.");
    addPortfolioItem({ name: portName, symbol: portType === "crypto" ? portSymbol.toLowerCase().trim() : portSymbol.toUpperCase().trim(), amount: parseFloat(portAmount), purchasePrice: parseFloat(portPurchasePrice), imageUrl: portImageUrl, type: portType, date: portDate, platform: portPlatform.trim() });
    setPortName(""); setPortSymbol(""); setPortAmount(""); setPortPurchasePrice(""); setPortImageUrl(""); setSearchResults([]); setPortPlatform("");
  };

  const handleMonthChange = (direction: "prev" | "next") => { setSelectedMonth(prev => direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)); setIsEditingBudget(false); setEditingTxId(null); };
  const handleBudgetSave = () => { if (tempBudget && parseFloat(tempBudget) >= 0) { updateBudget(currentMonthKey, parseFloat(tempBudget)); setIsEditingBudget(false); } };
  
  const handleAddTransaction = (type: "income" | "expense") => {
    setError("");
    if (!amount || parseFloat(amount) <= 0) return setError("Please enter a valid amount greater than £0.");
    const selectedDate = parseISO(date);
    if (!isValid(selectedDate) || isFuture(selectedDate) || isBefore(selectedDate, parseISO("2020-01-01"))) return setError("Please enter a valid past/present date.");
    addTransaction({ date, amount: parseFloat(amount), category: type === 'income' ? 'Salary' : category, type, priority, bankAccountId: selectedBankId || (accounts.length > 0 ? accounts[0].id : undefined), note });
    setAmount(""); setNote(""); setDate(new Date().toISOString().split("T")[0]); setPriority("want");
  };

  const startEditingTx = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setEditFields({ amount: tx.amount.toString(), category: tx.category, note: tx.note || "", date: tx.date, priority: tx.priority || "want", bankAccountId: tx.bankAccountId || (accounts.length > 0 ? accounts[0].id : "") });
  };

  const saveEditedTx = () => {
    if (!editFields || !editingTxId) return;
    if (!editFields.amount || parseFloat(editFields.amount) <= 0) return;
    editTransaction(editingTxId, { amount: parseFloat(editFields.amount), category: editFields.category, note: editFields.note, date: editFields.date, priority: editFields.priority, bankAccountId: editFields.bankAccountId });
    setEditingTxId(null); setEditFields(null);
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

  const handleAddAccount = () => { if(!accName.trim()) return; addAccount(accName, accType); setAccName(""); };

  const handleAddSwitch = () => {
    setError("");
    if (!swBankName.trim()) return setError("Please enter a bank name.");
    if (!swBonus || parseFloat(swBonus) <= 0) return setError("Please enter a valid bonus amount.");
    if (!swDeadline) return setError("Please select a deadline.");
    addSwitch({ bankName: swBankName, bonusAmount: parseFloat(swBonus), switchDate: swDate, status: "active", requirements: { payInAmount: parseFloat(swPayIn || "0"), payInDeadline: swDeadline, directDebitsNeeded: parseInt(swDDs || "0") } });
    setSwBankName(""); setSwBonus(""); setSwPayIn(""); setSwDDs("0");
  };

  const exportData = () => {
    const data = { transactions, switches, subscriptions, budgets, accounts, portfolio };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `wealthbase_backup_${format(new Date(), "yyyy-MM-dd")}.json`; a.click();
  };

  const renderCalendar = () => {
    const start = startOfWeek(startOfMonth(pickerDate), { weekStartsOn: 1 }); const end = endOfWeek(endOfMonth(pickerDate), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const colHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mt-2 shadow-lg absolute z-20 w-full max-w-[320px] top-full left-0">
            <div className="flex justify-between items-center mb-4">
                <button onClick={(e) => { e.preventDefault(); setPickerDate(subMonths(pickerDate, 1)); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-gray-600 dark:text-gray-300"><ChevronLeft size={18} /></button>
                <span className="font-semibold text-gray-800 dark:text-gray-100">{format(pickerDate, "MMMM yyyy")}</span>
                <button onClick={(e) => { e.preventDefault(); setPickerDate(addMonths(pickerDate, 1)); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-gray-600 dark:text-gray-300"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 mb-2 place-items-center">
                {colHeaders.map(d => <span key={d} className="text-[10px] uppercase font-semibold text-gray-400 w-8 text-center">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1 place-items-center">
                {days.map(day => {
                    const isSelected = isSameDay(day, parseISO(date)); const isFutureDate = isFuture(day); const isDiffMonth = !isSameMonth(day, pickerDate); const isTodayDate = isToday(day);
                    return (
                        <button key={day.toString()} disabled={isFutureDate} onClick={(e) => { e.preventDefault(); if (!isFutureDate) { setDate(format(day, "yyyy-MM-dd")); setShowCalendar(false); } }}
                            className={`h-9 w-9 text-sm rounded-full flex items-center justify-center transition ${isSelected ? "bg-black dark:bg-white text-white dark:text-black font-semibold shadow-md" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"} ${isFutureDate ? "opacity-20 cursor-not-allowed" : "cursor-pointer"} ${isDiffMonth ? "opacity-30" : ""} ${isTodayDate && !isSelected ? "ring-2 ring-black dark:ring-white font-semibold" : ""}`}
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
    <button onClick={() => { setActiveTab(id); setError(""); setEditingTxId(null); }} className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${activeTab === id ? "bg-black dark:bg-white text-white dark:text-black shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
      {label}
    </button>
  );

  const renderWidget = (id: string, index: number) => {
    const dragProps = isEditingDashboard ? { draggable: true, onDragStart: () => handleDragStart(index), onDragEnter: () => handleDragEnter(index), onDragEnd: handleDragEnd } : {};

    switch (id) {
      case "netWorth":
        return (
          <WidgetWrapper key={id} title="Total Net Worth" icon={Wallet} onClick={() => setActiveTab("portfolio")} isEditing={isEditingDashboard} onRemove={() => toggleWidget("netWorth")} {...dragProps}>
            <h2 className="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight">£{netWorth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
              <div><p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-0.5">Cash</p><p className="font-medium text-gray-700 dark:text-gray-300">£{totalCash.toLocaleString(undefined, {minimumFractionDigits: 2})}</p></div>
              <div><p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-0.5">Invested</p><p className="font-medium text-gray-700 dark:text-gray-300">£{totalPortfolioValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p></div>
            </div>
          </WidgetWrapper>
        );

      case "portfolioTotal":
        return (
          <WidgetWrapper key={id} title="Portfolio Performance" icon={TrendingUp} onClick={() => setActiveTab("portfolio")} isEditing={isEditingDashboard} onRemove={() => toggleWidget("portfolioTotal")} {...dragProps}>
             <h2 className="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight mb-2">£{totalPortfolioValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
             {totalPortfolioCost > 0 ? (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold w-fit ${isPortProfit ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                   {isPortProfit ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}
                   {isPortProfit ? '+' : '-'}£{Math.abs(totalPortfolioPL).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                   <span className="opacity-70 font-medium ml-1">({Math.abs(totalPortfolioROR).toFixed(2)}%)</span>
                </div>
             ) : (<p className="text-sm text-gray-400">No assets added yet.</p>)}
          </WidgetWrapper>
        );

      // --- THE NEW ASSET ALLOCATION CHART ---
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
                             <Tooltip formatter={(value: number) => `£${value.toFixed(2)}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
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
                        {asset.imageUrl ? (<img src={asset.imageUrl} alt={asset.name} className="w-8 h-8 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm bg-white" />) : (<div className={`w-8 h-8 flex items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-wider shadow-sm ${asset.type === 'crypto' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{asset.symbol.substring(0, 2)}</div>)}
                        <div><p className="font-semibold text-gray-800 dark:text-gray-200 leading-none truncate max-w-[100px]">{asset.name}</p><p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{asset.symbol}</p></div>
                     </div>
                     <div className="text-right">
                        <span className="font-semibold text-gray-900 dark:text-white block">£{asset.liveValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        {asset.totalCost > 0 && (
                           <span className={`text-[10px] font-bold mt-0.5 inline-block px-1.5 py-0.5 rounded ${asset.isProfit ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {asset.isProfit ? '+' : '-'}£{Math.abs(asset.profitLoss).toFixed(2)} ({Math.abs(asset.ror).toFixed(2)}%)
                           </span>
                        )}
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </WidgetWrapper>
        );

      case "assetCarousel":
        return (
          <WidgetWrapper key={id} title="Your Assets" icon={Layers} onClick={() => setActiveTab("portfolio")} isEditing={isEditingDashboard} onRemove={() => toggleWidget("assetCarousel")} {...dragProps}>
             {portfolioWithMetrics.length === 0 ? (<p className="text-gray-400 text-sm mt-4 text-center">No investments added.</p>) : (
                <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 pt-2 -mx-2 px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                   {portfolioWithMetrics.map(asset => (
                      <div key={asset.symbol} className="min-w-[110px] flex-shrink-0 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center transition hover:bg-gray-100 dark:hover:bg-gray-800">
                         {asset.imageUrl ? (<img src={asset.imageUrl} alt={asset.name} className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm bg-white mb-2" />) : (<div className={`w-10 h-10 flex items-center justify-center rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm mb-2 ${asset.type === 'crypto' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{asset.symbol.substring(0, 2)}</div>)}
                         <p className="font-bold text-gray-800 dark:text-gray-200 text-xs truncate w-full">{asset.symbol.toUpperCase()}</p>
                         <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-0.5">£{asset.liveValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                      </div>
                   ))}
                </div>
             )}
          </WidgetWrapper>
        );

      case "switches":
        return (
          <WidgetWrapper key={id} title="Active Bonuses" icon={Clock} onClick={() => setActiveTab("switches")} isEditing={isEditingDashboard} onRemove={() => toggleWidget("switches")} {...dragProps}>
             {activeSwitches.length === 0 ? (<p className="text-gray-400 text-sm mt-4 text-center">No active bank switches.</p>) : (
               <div className="space-y-3 mt-2">
                 {activeSwitches.slice(0, 3).map(sw => {
                   const daysLeft = differenceInDays(new Date(sw.requirements.payInDeadline), new Date()); const isUrgent = daysLeft < 7 && daysLeft >= 0;
                   return (
                     <div key={sw.id} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-800 pb-2 last:border-0 last:pb-0">
                       <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full shadow-sm ${isUrgent ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></div>
                          <div><p className="font-medium text-gray-700 dark:text-gray-300 leading-none">{sw.bankName}</p><p className={`text-[10px] uppercase font-semibold mt-1 ${isUrgent ? 'text-red-500' : 'text-gray-400'}`}>{daysLeft < 0 ? 'Passed' : `${daysLeft} Days Left`}</p></div>
                       </div>
                       <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">£{sw.bonusAmount}</span>
                     </div>
                   )
                 })}
               </div>
             )}
          </WidgetWrapper>
        );

      case "upcoming":
        return (
          <WidgetWrapper key={id} title="Upcoming Payments" icon={CalendarIcon} onClick={() => setActiveTab("subscriptions")} isEditing={isEditingDashboard} onRemove={() => toggleWidget("upcoming")} {...dragProps}>
            {upcomingSubs.length === 0 ? (<p className="text-gray-400 text-sm mt-4 text-center">No subscriptions added.</p>) : (
              <div className="space-y-3 mt-2">
                {upcomingSubs.slice(0, 3).map(sub => {
                  let diff = sub.billingDay - todayDay; if (diff < 0) diff += 30;
                  return (
                    <div key={sub.id} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-800 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shadow-sm ${diff <= 2 ? 'bg-red-500' : 'bg-orange-400'}`}></div>
                        <div><p className="font-medium text-gray-700 dark:text-gray-300 leading-none">{sub.name}</p><p className="text-[10px] text-gray-400 uppercase font-semibold mt-1">{diff === 0 ? 'Due Today' : `Due in ${diff} days`}</p></div>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">£{sub.cost.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </WidgetWrapper>
        );

      case "recent":
        return (
          <WidgetWrapper key={id} title="Recent Activity" icon={Activity} onClick={() => setActiveTab("daily")} isEditing={isEditingDashboard} onRemove={() => toggleWidget("recent")} {...dragProps}>
            <div className="space-y-3 mt-2">
              {transactions.length === 0 ? (<p className="text-gray-400 text-sm mt-4 text-center">No transactions logged.</p>) : (
                transactions.slice(0, 3).map(tx => (
                  <div key={tx.id} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-800 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>{tx.type === 'income' ? <ArrowUpRight size={12}/> : <ArrowDownLeft size={12}/>}</div>
                        <div><p className="font-medium text-gray-700 dark:text-gray-300 leading-none">{tx.note || tx.category}</p><p className="text-[10px] text-gray-400 font-semibold mt-1">{format(parseISO(tx.date), "MMM do")}</p></div>
                    </div>
                    <span className={`font-semibold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>{tx.type === 'expense' ? '-' : '+'}£{tx.amount.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </WidgetWrapper>
        );

      case "ai":
        return (
          <WidgetWrapper key={id} title="AI Wealth Insights" icon={Sparkles} isPremium={true} isEditing={isEditingDashboard} onRemove={() => toggleWidget("ai")} {...dragProps}>
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/40 dark:via-purple-900/40 dark:to-pink-900/40 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-inner group-hover:shadow-md transition-shadow relative overflow-hidden h-full flex flex-col justify-center">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/40 dark:bg-white/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
              <p className="text-sm text-indigo-950 dark:text-indigo-100 font-medium leading-relaxed relative z-10">
                  You hold <span className="font-semibold">£{totalCash > 0 ? totalCash.toLocaleString() : "5,000"}</span> in cash. 
                  Moving this to a 5.1% High-Yield Cash ISA could earn you an extra <span className="font-semibold text-indigo-700 dark:text-indigo-300 border-b border-indigo-200 dark:border-indigo-700 pb-0.5 cursor-pointer">£{((totalCash > 0 ? totalCash : 5000) * 0.051).toFixed(0)}/yr</span>.
              </p>
              <button className="mt-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors text-white px-4 py-2.5 rounded-lg w-full shadow-sm flex items-center justify-center gap-2 relative z-10">
                  View Recommended Accounts <ArrowUpRight size={14}/>
              </button>
            </div>
          </WidgetWrapper>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-800 dark:text-gray-100 flex flex-col transition-colors duration-200">
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-8">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2"><div className="bg-black dark:bg-white text-white dark:text-black p-1.5 rounded-lg flex items-center justify-center"><Wallet size={20} /></div><h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">WealthBase</h1></div>
            <div className="md:hidden flex items-center gap-3">
              <button onClick={toggleDarkMode} className="text-gray-400 hover:text-black dark:hover:text-white transition">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs shadow-sm cursor-pointer">JS</div>
            </div>
          </div>
          <nav className="flex w-full md:w-auto overflow-x-auto hide-scrollbar gap-1 pb-1 md:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
             <NavButton id="overview" label="Overview" /><NavButton id="daily" label="Daily Activity" /><NavButton id="portfolio" label="Portfolio" /><NavButton id="analytics" label="Analytics" /><NavButton id="subscriptions" label="Subscriptions" /><NavButton id="cards" label="Cards" /><NavButton id="switches" label="Bonuses" />
          </nav>
          <div className="hidden md:flex items-center gap-4">
             <button onClick={exportData} className="text-gray-400 hover:text-black dark:hover:text-white transition flex items-center gap-1.5 text-sm font-medium"><DownloadCloud size={16} /> Backup</button>
             <button onClick={toggleDarkMode} className="text-gray-400 hover:text-black dark:hover:text-white transition flex items-center gap-1.5 text-sm font-medium">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
             <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
             <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"><div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs shadow-sm">JS</div></div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-8"><h2 className="text-3xl font-semibold text-gray-900 dark:text-white">{greeting} 👋</h2><p className="text-gray-500 dark:text-gray-400 mt-1">Here is what's happening with your money today.</p></div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Dashboard</h2>
               <button onClick={() => setIsEditingDashboard(!isEditingDashboard)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isEditingDashboard ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  {isEditingDashboard ? <><Check size={16}/> Done Editing</> : <><Settings2 size={16}/> Customize</>}
               </button>
            </div>
            {isEditingDashboard && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-5 mb-6 animate-in fade-in slide-in-from-top-2 shadow-inner">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 text-sm uppercase tracking-wider mb-3">Add Widgets to Dashboard</h3>
                <div className="flex flex-wrap gap-3">
                  {AVAILABLE_WIDGETS.map(w => {
                    const isAdded = visibleWidgets.includes(w.id);
                    return (<button key={w.id} onClick={() => toggleWidget(w.id)} disabled={isAdded} className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 transition-all ${isAdded ? 'bg-white/50 dark:bg-gray-800/50 border-blue-200/50 dark:border-blue-800/50 text-blue-300 dark:text-blue-500 cursor-not-allowed' : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:shadow-sm'}`}><Plus size={16} /> {w.label}</button>)
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
          </div>
        )}

        {/* DAILY / ANALYTICS TOP STATS */}
        {(activeTab === "daily" || activeTab === "analytics") && (
          <div className="mb-8">
              <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4">
                  <button onClick={() => handleMonthChange("prev")} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"><ChevronLeft size={20} /></button>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{format(selectedMonth, "MMMM yyyy")}</h2>
                  <button onClick={() => handleMonthChange("next")} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"><ChevronRight size={20} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 relative group">
                  <div className="flex justify-between items-start mb-1"><p className="text-gray-500 text-sm">Left to Spend</p>{!isEditingBudget && (<button onClick={() => { setTempBudget(currentBudget.toString()); setIsEditingBudget(true); }} className="text-gray-300 hover:text-black dark:hover:text-white transition"><Pencil size={14} /></button>)}</div>
                  {isEditingBudget ? (
                      <div className="flex items-center gap-2 mt-1"><input type="number" value={tempBudget} onChange={(e) => setTempBudget(e.target.value)} className="w-full p-1 border rounded text-lg font-semibold bg-transparent dark:text-white" placeholder="Base Budget" autoFocus /><button onClick={handleBudgetSave} className="bg-green-100 text-green-700 p-1.5 rounded-md hover:bg-green-200"><Check size={16}/></button><button onClick={() => setIsEditingBudget(false)} className="bg-red-100 text-red-700 p-1.5 rounded-md hover:bg-red-200"><X size={16}/></button></div>
                  ) : (
                      <><h3 className={`text-2xl font-semibold ${budgetLeft < 0 ? 'text-red-600' : 'text-emerald-600'}`}>£{budgetLeft.toFixed(2)}</h3><div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden"><div className={`h-full rounded-full ${budgetProgress > 100 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(budgetProgress, 100)}%` }}></div></div><p className="text-xs text-gray-400 mt-2">Base: £{currentBudget} <span className="text-green-500 font-medium">+{stats.income.toFixed(0)}</span> <span className="text-red-500 font-medium">-{stats.expense.toFixed(0)}</span></p></>
                  )}
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"><p className="text-gray-500 text-sm mb-1">Expenses ({format(selectedMonth, "MMM")})</p><h3 className="text-2xl font-semibold text-red-600">-£{stats.expense.toFixed(2)}</h3></div>
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 border-l-4 border-l-blue-500 dark:border-l-blue-500"><p className="text-gray-500 text-sm mb-1">Fixed Subs</p><h3 className="text-2xl font-semibold text-blue-600">£{monthlyFixedCost.toFixed(2)}</h3></div>
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"><p className="text-gray-500 text-sm mb-1">Net Balance</p><h3 className="text-2xl font-semibold text-gray-800 dark:text-white">£{stats.balance.toFixed(2)}</h3></div>
              </div>
          </div>
        )}

        {/* DAILY TAB */}
        {activeTab === "daily" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm h-fit border border-gray-100 dark:border-gray-800 overflow-visible relative">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Add Transaction</h2>
              {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100"><AlertCircle size={16} /> {error}</div>}
              <div className="space-y-4">
                <div className="relative z-30"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</label><div className="relative"><button onClick={() => setShowCalendar(!showCalendar)} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none mt-1 text-left flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 transition"><CalendarIcon size={16} className="text-gray-500" /><span className="dark:text-white">{format(parseISO(date), "EEEE, d MMMM yyyy")}</span></button>{showCalendar && renderCalendar()}</div></div>
                <div className="relative z-10"><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddTransaction("expense") }} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none dark:bg-gray-800 dark:text-white" placeholder="Amount (£)" /></div>
                <div className="grid grid-cols-2 gap-2 relative z-10">
                  <div><label className="text-xs font-semibold text-gray-500 uppercase">Category</label><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none bg-white dark:bg-gray-800 dark:text-white mt-1">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label className="text-xs font-semibold text-gray-500 uppercase">Pay With</label><select value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none bg-white dark:bg-gray-800 dark:text-white mt-1">{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
                </div>
                <div className="relative z-10"><label className="text-xs font-semibold text-gray-500 uppercase">Priority / Goal</label><div className="flex gap-2 mt-1">{["need", "want", "save"].map((p) => (<button key={p} onClick={(e) => { e.preventDefault(); setPriority(p as any); }} className={`flex-1 py-1.5 rounded-md text-xs font-semibold capitalize border transition ${priority === p ? 'bg-black text-white dark:bg-white dark:text-black border-black shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}>{p}</button>))}</div></div>
                <div className="relative z-10"><input type="text" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddTransaction("expense") }} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none dark:bg-gray-800 dark:text-white" placeholder="Note (e.g. Tesco)" /></div>
                <div className="grid grid-cols-2 gap-2 pt-2 relative z-10"><button onClick={() => handleAddTransaction("expense")} className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 py-2.5 rounded-lg font-medium hover:bg-red-100 transition flex justify-center gap-2"><ArrowDownLeft size={18} /> Expense</button><button onClick={() => handleAddTransaction("income")} className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 py-2.5 rounded-lg font-medium hover:bg-green-100 transition flex justify-center gap-2"><ArrowUpRight size={18} /> Income</button></div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 relative z-0">
              <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-semibold dark:text-white">Activity in {format(selectedMonth, "MMMM")}</h2><span className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md">{currentTransactions.filter(tx => selectedActivityAccount === "All" || tx.bankAccountId === selectedActivityAccount).length} items</span></div>
              {accounts.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <button onClick={() => setSelectedActivityAccount("All")} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${selectedActivityAccount === "All" ? "bg-black dark:bg-white text-white dark:text-black border-black" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50"}`}>All Cards</button>
                  {accounts.map(acc => (<button key={acc.id} onClick={() => setSelectedActivityAccount(acc.id)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition flex items-center gap-2 ${selectedActivityAccount === acc.id ? "bg-black dark:bg-white text-white dark:text-black border-black" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50"}`}><span className={`w-2 h-2 rounded-full ${acc.color.replace('bg-', 'bg-')}`}></span>{acc.name}</button>))}
                </div>
              )}
              <div className="space-y-6"> 
                {currentTransactions.filter(tx => selectedActivityAccount === "All" || tx.bankAccountId === selectedActivityAccount).length === 0 && (<div className="text-center py-10 text-gray-400">No transactions found.</div>)}
                {(() => {
                  const filteredTx = currentTransactions.filter(tx => selectedActivityAccount === "All" || tx.bankAccountId === selectedActivityAccount);
                  const grouped = filteredTx.reduce((acc, tx) => { if (!acc[tx.date]) acc[tx.date] = []; acc[tx.date].push(tx); return acc; }, {} as Record<string, Transaction[]>);
                  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                  return sortedDates.map(dateStr => (
                      <div key={dateStr} className="space-y-2">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1 border-b border-gray-100 dark:border-gray-800 pb-2 mb-3 flex items-center gap-2">{format(parseISO(dateStr), "do MMMM")}{isToday(parseISO(dateStr)) && <span className="bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 rounded text-[9px] leading-none">TODAY</span>}</h3>
                          <div className="space-y-2">
                              {grouped[dateStr].map(tx => {
                                  const txAccount = accounts.find(a => a.id === tx.bankAccountId) || accounts[0];
                                  if (editingTxId === tx.id && editFields) {
                                      return (
                                          <div key={tx.id} className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 shadow-inner">
                                              <div className="flex justify-between items-center mb-2"><span className="text-xs font-semibold uppercase text-gray-500">Edit Transaction</span><div className="flex gap-2"><button onClick={saveEditedTx} className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600"><Check size={16}/></button><button onClick={() => setEditingTxId(null)} className="p-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"><X size={16}/></button></div></div>
                                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                  <input type="date" value={editFields.date} onChange={(e) => setEditFields({...editFields, date: e.target.value})} className="p-1.5 border dark:border-gray-600 rounded text-sm outline-none dark:bg-gray-700 dark:text-white" />
                                                  <input type="number" value={editFields.amount} onChange={(e) => setEditFields({...editFields, amount: e.target.value})} className="p-1.5 border dark:border-gray-600 rounded text-sm outline-none dark:bg-gray-700 dark:text-white" />
                                                  <select value={editFields.category} onChange={(e) => setEditFields({...editFields, category: e.target.value})} className="p-1.5 border dark:border-gray-600 rounded text-sm outline-none bg-white dark:bg-gray-700 dark:text-white">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                                  <select value={editFields.priority} onChange={(e) => setEditFields({...editFields, priority: e.target.value as any})} className="p-1.5 border dark:border-gray-600 rounded text-sm outline-none bg-white dark:bg-gray-700 dark:text-white capitalize"><option value="need">Need</option><option value="want">Want</option><option value="save">Save</option></select>
                                                  <select value={editFields.bankAccountId} onChange={(e) => setEditFields({...editFields, bankAccountId: e.target.value})} className="p-1.5 border dark:border-gray-600 rounded text-sm outline-none bg-white dark:bg-gray-700 dark:text-white">{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select>
                                                  <input type="text" value={editFields.note} onChange={(e) => setEditFields({...editFields, note: e.target.value})} className="p-1.5 border dark:border-gray-600 rounded text-sm outline-none dark:bg-gray-700 dark:text-white md:col-span-1 col-span-2" placeholder="Note" />
                                              </div>
                                          </div>
                                      );
                                  }
                                  return (
                                      <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition group border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                          <div className="flex items-center gap-3">
                                              <div className={`p-2.5 rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>{tx.type === 'income' ? <ArrowUpRight size={18}/> : <ArrowDownLeft size={18}/>}</div>
                                              <div>
                                                  <div className="flex items-center gap-2"><p className="font-medium text-gray-900 dark:text-white">{tx.note || tx.category}</p>{tx.type === 'expense' && tx.priority && PRIORITY_COLORS[tx.priority] && (<span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[tx.priority]}`}>{tx.priority}</span>)}</div>
                                                  <div className="flex items-center gap-2 text-xs mt-0.5">{txAccount && (<span className={`px-1.5 py-0.5 rounded text-white ${txAccount.color} bg-opacity-90`}>{txAccount.name}</span>)}</div>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                              <span className={`font-semibold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>{tx.type === 'expense' ? '-' : '+'}£{tx.amount.toFixed(2)}</span>
                                              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1"><button onClick={() => startEditingTx(tx)} className="text-gray-400 hover:text-blue-500 transition p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-gray-700"><Pencil size={15} /></button><button onClick={() => removeTransaction(tx.id)} className="text-gray-400 hover:text-red-500 transition p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-gray-700"><Trash2 size={15} /></button></div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  ))
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-6"><BarChart3 size={20} className="text-gray-500"/><h2 className="text-xl font-semibold dark:text-white">Monthly History</h2></div>
                  <div className="h-[300px] w-full">
                    {historyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={historyData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" /><XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} stroke="#9CA3AF" /><YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `£${value}`} stroke="#9CA3AF" /><Tooltip formatter={(value) => `£${value}`} cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1F2937', border: 'none', color: '#fff'}} /><Legend /><Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} /><Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4, 4, 0, 0]} /></BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-gray-400">Add transactions in different months to compare!</div>}
                  </div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-6 w-full"><PieIcon size={20} className="text-gray-500"/><h2 className="text-xl font-semibold dark:text-white">Category Breakdown ({format(selectedMonth, "MMM")})</h2></div>
                  <div className="h-[300px] w-full">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">{pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => `£${value}`} contentStyle={{backgroundColor: '#1F2937', border: 'none', color: '#fff'}} /><Legend /></PieChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-gray-400">No expenses for {format(selectedMonth, "MMMM")}.</div>}
                  </div>
              </div>
          </div>
        )}

        {/* SUBSCRIPTIONS TAB */}
        {activeTab === "subscriptions" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
              <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm h-fit border border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Add Subscription</h2>
              {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100"><AlertCircle size={16} /> {error}</div>}
              <div className="space-y-4">
                <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Service Name</label><input type="text" value={subName} onChange={(e) => setSubName(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none mt-1 dark:bg-gray-800 dark:text-white" /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cost (£)</label><input type="number" value={subCost} onChange={(e) => setSubCost(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none mt-1 dark:bg-gray-800 dark:text-white" /></div><div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Day (1-31)</label><input type="number" min="1" max="31" value={subDay} onChange={(e) => setSubDay(e.target.value)} className="w-full p-2 border dark:border-gray-700 rounded-lg outline-none mt-1 dark:bg-gray-800 dark:text-white" /></div></div>
                <button onClick={handleAddSubscription} className="w-full bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-lg font-medium hover:bg-gray-800 transition mt-2">Add Subscription</button>
              </div>
              </div>
              <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="text-lg font-semibold mb-4 dark:text-white">Your Fixed Monthly Costs</h2>
                <div className="space-y-3">
                  {subscriptions.length === 0 && <p className="text-gray-400 text-sm">No subscriptions yet.</p>}
                  {subscriptions.sort((a,b) => a.billingDay - b.billingDay).map(sub => (
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm h-fit border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold dark:text-white">Record Trade</h2>
                  <div>
                    <input type="file" id="csvUpload" accept=".csv" className="hidden" onChange={handleCsvImport} />
                    <label htmlFor="csvUpload" className="cursor-pointer bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-blue-200 dark:border-blue-800">
                       <Upload size={12} /> Import T212 CSV
                    </label>
                  </div>
                </div>
                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100"><AlertCircle size={16} /> {error}</div>}
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Asset Type</label><div className="flex gap-2 mt-1"><button onClick={() => { setPortType("crypto"); setSearchResults([]); setPortSymbol(""); }} className={`flex-1 py-2 rounded-md text-sm border font-medium ${portType === "crypto" ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 dark:border-gray-700'}`}>Crypto</button><button onClick={() => { setPortType("stock"); setSearchResults([]); setPortSymbol(""); }} className={`flex-1 py-2 rounded-md text-sm border font-medium ${portType === "stock" ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 dark:border-gray-700'}`}>Stock / ETF</button></div></div>
                    <div className="relative z-20">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search Symbol or Name</label>
                        <div className="relative mt-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" value={portSymbol} onChange={(e) => setPortSymbol(e.target.value)} className="w-full pl-9 pr-2 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none focus:border-black transition" placeholder={portType === "crypto" ? "e.g. bitcoin" : "e.g. Greggs or GRG.L"} /></div>
                        {searchResults.length > 0 && (
                            <div className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                                {searchResults.map((asset, i) => (
                                    <button key={i} onClick={() => handleSelectSearchResult(asset)} className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 border-b dark:border-gray-700 last:border-b-0 transition">
                                        {asset.thumb ? (<img src={asset.thumb} alt="logo" className="w-8 h-8 rounded-full" />) : (<div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-xs font-semibold uppercase tracking-wider ${asset.type === 'crypto' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{asset.symbol.substring(0, 2)}</div>)}
                                        <div className="flex flex-col overflow-hidden"><span className="font-medium text-sm text-gray-900 dark:text-white truncate">{asset.name}</span><div className="flex items-center gap-2 text-xs text-gray-500"><span className="font-mono text-black dark:text-gray-300">{asset.symbol}</span>{asset.exchange && (<span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${asset.exchange === 'London' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>{asset.exchange}</span>)}</div></div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label><input type="text" value={portName} onChange={(e) => setPortName(e.target.value)} className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1" /></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">{portType === "crypto" ? "Coins Bought" : "Shares Bought"}</label><input type="number" step="any" value={portAmount} onChange={(e) => setPortAmount(e.target.value)} className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1" placeholder="0.00" /></div><div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Price (£)</label><input type="number" step="any" value={portPurchasePrice} onChange={(e) => setPortPurchasePrice(e.target.value)} className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1" placeholder="Cost per share" /></div></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Platform</label><input type="text" value={portPlatform} onChange={(e) => setPortPlatform(e.target.value)} className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1" placeholder="e.g. Vanguard" /></div><div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Bought</label><input type="date" value={portDate} onChange={(e) => setPortDate(e.target.value)} className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1" /></div></div>
                    <button onClick={handleAddPortfolio} className="w-full bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-lg font-medium hover:bg-gray-800 transition">Record Trade</button>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 gap-4">
                    <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Live Holdings</h2><p className="text-sm text-gray-500">Total Value: <span className="font-semibold text-black dark:text-white text-lg">£{totalPortfolioValue.toFixed(2)}</span></p></div>
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-800 dark:group-hover:text-gray-300 transition-colors uppercase tracking-wider">Extended Hrs</span>
                        <div className="relative">
                          <input type="checkbox" className="sr-only" checked={useExtendedHours} onChange={(e) => { const isChecked = e.target.checked; setUseExtendedHours(isChecked); refreshPrices(isChecked); }} />
                          <div className={`block w-10 h-6 rounded-full transition-colors ${useExtendedHours ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                          <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${useExtendedHours ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                      </label>
                      <button onClick={() => refreshPrices()} disabled={isRefreshing} className="justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition flex items-center gap-2 shadow-sm disabled:opacity-50">
                         {isRefreshing ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />} {isRefreshing ? "Updating..." : "Refresh prices"}
                      </button>
                    </div>
                </div>

                {allPlatforms.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button onClick={() => setSelectedPlatform("All")} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${selectedPlatform === "All" ? "bg-black dark:bg-white text-white dark:text-black border-black" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50"}`}>All Platforms</button>
                    {allPlatforms.map(platform => (<button key={platform} onClick={() => setSelectedPlatform(platform)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${selectedPlatform === platform ? "bg-black dark:bg-white text-white dark:text-black border-black" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50"}`}>{platform}</button>))}
                  </div>
                )}

                {groupedAssets.length === 0 && (<div className="bg-white dark:bg-gray-900 p-10 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 text-center text-gray-400">No trades found. Add some assets to start tracking!</div>)}

                {groupedAssets.map(asset => {
                    const currentPrice = livePrices[asset.symbol] || 0;
                    const totalValue = asset.totalAmount * currentPrice;
                    const avgPrice = asset.totalAmount > 0 ? (asset.totalCost / asset.totalAmount) : 0;
                    const profitLoss = totalValue - asset.totalCost;
                    const ror = asset.totalCost > 0 ? (profitLoss / asset.totalCost) * 100 : 0;
                    const isProfit = profitLoss >= 0;
                    const isExpanded = expandedSymbols[asset.symbol];

                    return (
                      <div key={asset.symbol} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:border-gray-300 dark:hover:border-gray-700 transition overflow-hidden">
                        <div onClick={() => toggleExpand(asset.symbol)} className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 cursor-pointer gap-4">
                            <div className="flex items-center gap-4 relative">
                                <div className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm flex-shrink-0 ${asset.type === 'crypto' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{asset.symbol.substring(0, 2)}</div>
                                {asset.imageUrl && (<img src={asset.imageUrl} alt={asset.name} className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-800 shadow-sm object-contain bg-white absolute top-0 left-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />)}
                                <div className="ml-2"><h3 className="font-semibold text-lg text-gray-900 dark:text-white leading-tight flex items-center gap-2">{asset.name}</h3><p className="text-sm text-gray-500 font-mono mt-0.5">{Number(asset.totalAmount.toFixed(8))} {asset.symbol.toUpperCase()}</p></div>
                            </div>
                            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t border-gray-100 dark:border-gray-800 md:border-t-0 pt-4 md:pt-0">
                                <div className="text-left md:text-right">
                                    <p className="font-semibold text-xl text-gray-900 dark:text-white">£{totalValue.toFixed(2)}</p>
                                    <p className="text-xs text-gray-400 mb-1">Live: £{currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2})} • Avg: £{avgPrice.toFixed(2)}</p>
                                    {asset.totalCost > 0 && currentPrice > 0 && (<div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${isProfit ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{isProfit ? <ArrowUpRight size={12}/> : <ArrowDownLeft size={12}/>}£{Math.abs(profitLoss).toFixed(2)} ({Math.abs(ror).toFixed(2)}%)</div>)}
                                </div>
                                <div className="text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">{isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</div>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 p-4 space-y-2">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">Tax Lots / Trades</h4>
                                {asset.lots.map((lot: any) => {
                                    const lotCost = lot.amount * (lot.purchasePrice || 0); const lotValue = lot.amount * currentPrice; const lotPL = lotValue - lotCost; const lotProfit = lotPL >= 0;
                                    return (
                                        <div key={lot.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-sm">
                                            <div><div className="flex items-center gap-2"><span className="font-medium dark:text-white">{Number(lot.amount.toFixed(8))} {asset.type === 'crypto' ? 'Coins' : 'Shares'}</span><span className="text-gray-400">@ £{lot.purchasePrice}</span></div><div className="flex items-center gap-2 text-xs text-gray-500 mt-1"><span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{lot.platform || "Unknown"}</span><span>{lot.date ? format(parseISO(lot.date), "dd MMM yyyy") : "No date"}</span></div></div>
                                            <div className="flex items-center gap-4">{currentPrice > 0 && (<span className={`font-semibold ${lotProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{lotProfit ? '+' : '-'}£{Math.abs(lotPL).toFixed(2)}</span>)}<button onClick={() => removePortfolioItem(lot.id)} className="text-gray-400 hover:text-red-500 transition p-1.5 hover:bg-red-50 dark:hover:bg-gray-700 rounded-md"><Trash2 size={16}/></button></div>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
              <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm h-fit border border-gray-100 dark:border-gray-800">
                  <h2 className="text-lg font-semibold mb-4 dark:text-white">Add Bank / Card</h2>
                  <div className="space-y-4">
                      <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bank Name</label><input type="text" value={accName} onChange={(e) => setAccName(e.target.value)} className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1" placeholder="e.g. Monzo" /></div>
                      <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label><div className="flex gap-2 mt-1"><button onClick={() => setAccType("debit")} className={`flex-1 py-2 rounded-md text-sm border ${accType === "debit" ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 dark:border-gray-700'}`}>Debit</button><button onClick={() => setAccType("credit")} className={`flex-1 py-2 rounded-md text-sm border ${accType === "credit" ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 dark:border-gray-700'}`}>Credit</button></div></div>
                      <button onClick={handleAddAccount} className="w-full bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-lg font-medium hover:bg-gray-800 transition">Add Card</button>
                  </div>
              </div>
              <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {accounts.map(acc => (
                          <div key={acc.id} className={`${acc.color} text-white p-6 rounded-xl shadow-md relative overflow-hidden group`}>
                              <div className="relative z-10 flex justify-between items-start"><div><p className="text-white/70 text-sm uppercase font-semibold tracking-wider">{acc.type}</p><h3 className="text-2xl font-semibold mt-1">{acc.name}</h3></div><CardIcon className="text-white/50" size={32} /></div>
                              <div className="relative z-10 mt-8 flex justify-between items-end"><p className="font-mono text-white/80 tracking-widest">•••• ••••</p><button onClick={() => removeAccount(acc.id)} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg backdrop-blur-sm transition"><Trash2 size={16} /></button></div>
                              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div><div className="absolute top-10 -left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
        )}

        {/* SWITCHES TAB */}
        {activeTab === "switches" && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
              <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm h-fit border border-gray-100 dark:border-gray-800">
                  <h2 className="text-lg font-semibold mb-4 dark:text-white">Add Switch Tracker</h2>
                  {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100"><AlertCircle size={16} /> {error}</div>}
                  <div className="space-y-4">
                      <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bank Name</label><input type="text" value={swBankName} onChange={(e) => setSwBankName(e.target.value)} className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1" placeholder="e.g. NatWest" /></div>
                      <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bonus (£)</label><input type="number" value={swBonus} onChange={(e) => setSwBonus(e.target.value)} className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1" placeholder="175" /></div><div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label><input type="date" value={swDate} onChange={(e) => setSwDate(e.target.value)} className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1 text-sm" /></div></div>
                      <div className="border-t dark:border-gray-800 pt-4 mt-2">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Requirements</p>
                          <div className="space-y-3">
                              <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pay In Amount (£)</label><input type="number" value={swPayIn} onChange={(e) => setSwPayIn(e.target.value)} className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1" placeholder="e.g. 1000" /></div>
                              <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Required Direct Debits</label><input type="number" value={swDDs} onChange={(e) => setSwDDs(e.target.value)} className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1" placeholder="e.g. 2" /></div>
                              <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Deadline Date</label><input type="date" value={swDeadline} onChange={(e) => setSwDeadline(e.target.value)} className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1 text-sm" /></div>
                          </div>
                      </div>
                      <button onClick={handleAddSwitch} className="w-full bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-lg font-medium hover:bg-gray-800 transition mt-4 flex items-center justify-center gap-2"><Plus size={18} /> Track Bank Switch</button>
                  </div>
              </div>
              <div className="lg:col-span-2 space-y-4">
                {switches.length === 0 && (<div className="bg-white dark:bg-gray-900 p-10 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 text-center text-gray-400">No active switches. Start hunting those bonuses!</div>)}
                {switches.map((sw) => {
                  const isCompleted = sw.status === "completed"; const isFailed = sw.status === "failed"; const isActive = sw.status === "active";
                  const daysLeft = differenceInDays(new Date(sw.requirements.payInDeadline), new Date());
                  const isUrgent = isActive && daysLeft < 7 && daysLeft >= 0; const isOverdue = isActive && daysLeft < 0;
                  return (
                    <div key={sw.id} className={`border rounded-xl p-5 transition bg-white dark:bg-gray-900 shadow-sm ${isCompleted ? 'border-green-200 dark:border-green-800' : isFailed ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-gray-800'}`}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                          <div>
                              <div className="flex items-center gap-3 mb-1">
                                  <h3 className={`font-semibold text-xl ${isCompleted ? 'text-green-700 dark:text-green-400' : isFailed ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{sw.bankName}</h3>
                                  {isCompleted && <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><CheckCircle2 size={12}/> Paid</span>}
                                  {isFailed && <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><XCircle size={12}/> Failed</span>}
                                  {isActive && <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Clock size={12}/> In Progress</span>}
                                  <span className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-gray-200 dark:border-gray-700">Reward: £{sw.bonusAmount}</span>
                              </div>
                              <p className="text-sm text-gray-500 mb-4">Switch started: {format(parseISO(sw.switchDate), "do MMM yyyy")}</p>
                              <div className="flex flex-wrap gap-3 text-sm">
                                  {sw.requirements.payInAmount > 0 && (<div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${isCompleted ? 'bg-green-50 border-green-100 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' : 'bg-gray-50 border-gray-100 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'}`}><Wallet size={16} /> Pay in £{sw.requirements.payInAmount}</div>)}
                                  {sw.requirements.directDebitsNeeded > 0 && (<div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${isCompleted ? 'bg-green-50 border-green-100 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' : 'bg-gray-50 border-gray-100 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'}`}><CardIcon size={16} /> {sw.requirements.directDebitsNeeded} Direct Debits</div>)}
                                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium ${isCompleted ? 'bg-green-50 border-green-100 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' : isFailed ? 'bg-red-50 border-red-100 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400' : isOverdue ? 'bg-red-100 border-red-200 text-red-700 dark:bg-red-900/50 dark:border-red-700 dark:text-red-400' : isUrgent ? 'bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400' : 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'}`}>
                                      <AlertCircle size={16} /> {isCompleted ? "Goal Reached" : isFailed ? "Deadline Missed" : isOverdue ? "Deadline Passed!" : `${daysLeft} days left (Due ${format(parseISO(sw.requirements.payInDeadline), "do MMM")})`}
                                  </div>
                              </div>
                          </div>
                          <div className="mt-5 md:mt-0 flex flex-row md:flex-col gap-2 w-full md:w-auto">
                              {isActive && (<><button onClick={() => updateSwitchStatus(sw.id, "completed")} className="flex-1 md:flex-none text-sm font-medium bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 px-4 py-2 rounded-lg transition flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Mark Paid</button><button onClick={() => updateSwitchStatus(sw.id, "failed")} className="flex-1 md:flex-none text-sm font-medium bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition">Mark Failed</button></>)}
                              <button onClick={() => removeSwitch(sw.id)} className="flex-none p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg transition flex items-center justify-center"><Trash2 size={18} /></button>
                          </div>
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>
        )}
      </main>
    </div>
  );
}