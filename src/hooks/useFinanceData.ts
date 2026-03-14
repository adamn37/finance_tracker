"use client";

import { useState, useEffect } from "react";

export type PortfolioItem = {
  id: string;
  symbol: string; 
  name: string;
  amount: number;
  purchasePrice: number; 
  imageUrl?: string;     
  type: "crypto" | "stock";
  date: string;
  platform: string;
};

export type BankAccount = {
  id: string;
  name: string;
  type: "debit" | "credit";
  color: string;
};

export type Transaction = {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  priority: "need" | "want" | "save";
  bankAccountId?: string;
  note?: string;
};

export type Subscription = {
  id: string;
  name: string;
  cost: number;
  billingDay: number;
};

export type BankSwitch = {
  id: string;
  bankName: string;
  bonusAmount: number;
  switchDate: string;
  requirements: {
    payInAmount: number;
    payInDeadline: string;
    directDebitsNeeded: number;
  };
  status: "active" | "completed" | "failed";
};

export function useFinanceData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [switches, setSwitches] = useState<BankSwitch[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [accounts, setAccounts] = useState<BankAccount[]>([
    { id: "default-1", name: "Main Debit", type: "debit", color: "bg-gray-800" }
  ]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [useExtendedHours, setUseExtendedHours] = useState(false);

  useEffect(() => {
    const savedTx = localStorage.getItem("transactions");
    const savedSwitches = localStorage.getItem("bankSwitches");
    const savedSubs = localStorage.getItem("subscriptions");
    const savedBudgets = localStorage.getItem("monthlyBudgets");
    const savedAccounts = localStorage.getItem("bankAccounts");
    const savedPortfolio = localStorage.getItem("portfolio");
    const savedExtended = localStorage.getItem("useExtendedHours");
    
    if (savedExtended) setUseExtendedHours(JSON.parse(savedExtended));
    if (savedPortfolio) setPortfolio(JSON.parse(savedPortfolio));
    
    if (savedTx) {
      const parsedTx = JSON.parse(savedTx);
      const migratedTx = parsedTx.map((tx: any) => {
        let updatedPriority = tx.priority;
        if (tx.priority === "high") updatedPriority = "need";
        if (tx.priority === "medium") updatedPriority = "want";
        if (tx.priority === "low") updatedPriority = "save";
        return { ...tx, priority: updatedPriority };
      });
      setTransactions(migratedTx);
    }
    
    if (savedSwitches) setSwitches(JSON.parse(savedSwitches));
    if (savedSubs) setSubscriptions(JSON.parse(savedSubs));
    if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
    if (savedAccounts) setAccounts(JSON.parse(savedAccounts));
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("portfolio", JSON.stringify(portfolio));
      localStorage.setItem("transactions", JSON.stringify(transactions));
      localStorage.setItem("bankSwitches", JSON.stringify(switches));
      localStorage.setItem("subscriptions", JSON.stringify(subscriptions));
      localStorage.setItem("monthlyBudgets", JSON.stringify(budgets));
      localStorage.setItem("bankAccounts", JSON.stringify(accounts));
      localStorage.setItem("useExtendedHours", JSON.stringify(useExtendedHours));
    }
  }, [transactions, switches, subscriptions, budgets, accounts, portfolio, useExtendedHours, isLoaded]);

  const addTransaction = (tx: Omit<Transaction, "id">) => setTransactions(prev => [{ ...tx, id: crypto.randomUUID() }, ...prev]);
  const removeTransaction = (id: string) => setTransactions(prev => prev.filter(t => t.id !== id));
  const editTransaction = (id: string, updatedData: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedData } : t));
  };
  
  const addSubscription = (sub: Omit<Subscription, "id">) => setSubscriptions(prev => [...prev, { ...sub, id: crypto.randomUUID() }]);
  const removeSubscription = (id: string) => setSubscriptions(prev => prev.filter(s => s.id !== id));

  const addSwitch = (bankSwitch: Omit<BankSwitch, "id">) => setSwitches(prev => [...prev, { ...bankSwitch, id: crypto.randomUUID() }]);
  const removeSwitch = (id: string) => setSwitches(prev => prev.filter(s => s.id !== id));
  const updateSwitchStatus = (id: string, status: "active" | "completed" | "failed") => {
    setSwitches(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const updateBudget = (monthKey: string, amount: number) => setBudgets(prev => ({ ...prev, [monthKey]: amount }));

  const addAccount = (name: string, type: "debit" | "credit") => {
    const colors = ["bg-blue-600", "bg-emerald-600", "bg-purple-600", "bg-orange-600", "bg-black", "bg-pink-600"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setAccounts(prev => [...prev, { id: crypto.randomUUID(), name, type, color: randomColor }]);
  };

  const removeAccount = (id: string) => {
    if (accounts.length <= 1) return alert("You must have at least one account.");
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const getMonthlyStats = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyTx = transactions.filter((t) => t.date.startsWith(currentMonth));
    const income = monthlyTx.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expense = monthlyTx.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  };

  const getMonthlyHistory = () => {
    const history: Record<string, { month: string; income: number; expense: number }> = {};
    transactions.forEach((tx) => {
      const monthKey = tx.date.slice(0, 7); 
      if (!history[monthKey]) {
        const dateObj = new Date(tx.date);
        history[monthKey] = { month: dateObj.toLocaleString('default', { month: 'short', year: '2-digit' }), income: 0, expense: 0 };
      }
      if (tx.type === "income") history[monthKey].income += tx.amount;
      else history[monthKey].expense += tx.amount;
    });
    return Object.entries(history).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([_, val]) => val);
  };

  const addPortfolioItem = (item: Omit<PortfolioItem, "id">) => setPortfolio(prev => [...prev, { ...item, id: crypto.randomUUID() }]);
  const removePortfolioItem = (id: string) => setPortfolio(prev => prev.filter(p => p.id !== id));

  const refreshPrices = async (extendedOverride?: boolean) => {
    if ((portfolio || []).length === 0) return;
    setIsRefreshing(true); 
    
    // Override logic: Use the button toggle if pressed, otherwise use the saved state
    const isExtended = extendedOverride !== undefined ? extendedOverride : useExtendedHours;

    try {
      let newPrices: Record<string, number> = { ...livePrices };

      // --- CRYPTO ---
      const cryptoItems = portfolio.filter(p => p.type === "crypto");
      if (cryptoItems.length > 0) {
        const ids = Array.from(new Set(cryptoItems.map(p => p.symbol))).join(",");
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=gbp`);
        if (res.ok) {
          const data = await res.json();
          cryptoItems.forEach(p => { if (data[p.symbol]?.gbp) newPrices[p.symbol] = data[p.symbol].gbp; });
        }
      }

      // --- STOCKS & ETFs ---
      const stockItems = portfolio.filter(p => p.type === "stock");
      if (stockItems.length > 0) {
         let fxRates: Record<string, number> = { "USD": 0.79, "EUR": 0.85 }; 
         try {
            const [usdRes, eurRes] = await Promise.all([ fetch(`/api/stock?symbol=GBP=X`), fetch(`/api/stock?symbol=EURGBP=X`) ]);
            if (usdRes.ok) { const data = await usdRes.json(); const p = data?.chart?.result?.[0]?.meta?.regularMarketPrice; if (p) fxRates["USD"] = p; }
            if (eurRes.ok) { const data = await eurRes.json(); const p = data?.chart?.result?.[0]?.meta?.regularMarketPrice; if (p) fxRates["EUR"] = p; }
         } catch (e) { console.error("Using fallback exchange rates"); }

         const uniqueStocks = Array.from(new Set(stockItems.map(p => p.symbol)));
         
         await Promise.all(uniqueStocks.map(async (ticker) => {
            try {
                let fetchTicker = ticker;
                if (ticker === 'ASML.AS') fetchTicker = 'ASML'; 

                const res = await fetch(`/api/stock?symbol=${fetchTicker.toUpperCase()}`);
                
                if (res.ok) {
                    const data = await res.json();
                    
                    // Dig deeper into Yahoo's JSON structure
                    const result = data?.chart?.result?.[0];
                    const meta = result?.meta;
                    const closePrices = result?.indicators?.quote?.[0]?.close;
                    
                    if (meta && meta.regularMarketPrice) {
                        let price = meta.regularMarketPrice;
                        
                        // THE BULLETPROOF EXTENDED HOURS LOGIC
                        if (isExtended) {
                            if (meta.postMarketPrice) {
                                // 1. Easy Mode: Yahoo explicitly provided it
                                price = meta.postMarketPrice;
                            } else if (closePrices && closePrices.length > 0) {
                                // 2. Hard Mode: Scrape the very last trade from the physical chart data
                                const validPrices = closePrices.filter((p: number | null) => p !== null);
                                if (validPrices.length > 0) {
                                    price = validPrices[validPrices.length - 1];
                                }
                            }
                        }

                        const currency = meta.currency; 
                        
                        if (currency === "USD") price = price * fxRates["USD"]; 
                        else if (currency === "EUR") price = price * fxRates["EUR"];
                        else if (currency === "GBp") price = price / 100; 
                        
                        newPrices[ticker] = price; 
                    }
                }
            } catch (err) {
                console.error(`Failed to fetch ${ticker}`, err);
            }
         }));
      }

      setLivePrices(newPrices);
    } catch (err) {
      console.error("Failed to fetch prices:", err);
    } finally {
      setIsRefreshing(false); 
    }
  };

  return { 
    portfolio, livePrices, addPortfolioItem, removePortfolioItem, refreshPrices, isRefreshing,
    useExtendedHours, setUseExtendedHours,
    transactions, switches, subscriptions, budgets, accounts, 
    addTransaction, removeTransaction, editTransaction,
    addSwitch, removeSwitch, updateSwitchStatus, 
    addSubscription, removeSubscription, updateBudget,
    addAccount, removeAccount, 
    getMonthlyStats, getMonthlyHistory, isLoaded 
  };
}