"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export function useFinanceData() {
  const supabase = createClient();
  const router = useRouter();

  // Core Global States
  const [isLoaded, setIsLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [switches, setSwitches] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [propAccounts, setPropAccounts] = useState<any[]>([]);
  const [propTransactions, setPropTransactions] = useState<any[]>([]);
  const [brokerages, setBrokerages] = useState<any[]>([]); // <-- NEW: Brokerage State
  
  // Market Price States
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [useExtendedHours, setUseExtendedHours] = useState(false);

  // 1. Session Verification & Initial Data Fetch
  useEffect(() => {
    let isMounted = true;

    const checkUserAndFetch = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          if (isMounted) {
            window.location.href = "/auth";
          }
          return;
        }

        const uid = session.user.id;
        if (isMounted) setUserId(uid);

        // Run all user data queries simultaneously to maximize network speed
        const [
          { data: txs },
          { data: ports },
          { data: subs },
          { data: sws },
          { data: bdgs },
          { data: accs },
          { data: pAccs },
          { data: pTxs },
          { data: brkrs } // <-- NEW: Fetch Brokerages
        ] = await Promise.all([
          supabase.from("transactions").select("*").eq("user_id", uid).order("date", { ascending: false }),
          supabase.from("portfolio").select("*").eq("user_id", uid),
          supabase.from("subscriptions").select("*").eq("user_id", uid),
          supabase.from("bank_switches").select("*").eq("user_id", uid),
          supabase.from("budgets").select("*").eq("user_id", uid),
          supabase.from("bank_accounts").select("*").eq("user_id", uid),
          supabase.from("prop_accounts").select("*").eq("user_id", uid),
          supabase.from("prop_transactions").select("*").eq("user_id", uid).order("date", { ascending: false }),
          supabase.from("brokerages").select("*").eq("user_id", uid) // <-- NEW: Fetch Brokerages
        ]);

        if (isMounted) {
          setTransactions(txs || []);
          setPortfolio(
            (ports || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              symbol: p.symbol,
              amount: Number(p.amount),
              purchasePrice: Number(p.purchase_price), // Maps DB to UI
              imageUrl: p.image_url,                   // Maps DB to UI
              type: p.type,
              date: p.date,
              platform: p.platform,
              user_id: p.user_id
            }))
          );
          setSwitches(sws || []);
          setBudgets(bdgs || []);
          setAccounts(accs || []);
          setPropAccounts(pAccs || []);
          setPropTransactions(pTxs || []);
          setBrokerages(brkrs || []); // <-- NEW: Set Brokerages State
          
          // Map snake_case from DB to camelCase for your subscriptions frontend
          setSubscriptions(
            (subs || []).map((s: any) => ({
              id: s.id,
              name: s.name,
              cost: Number(s.cost),
              billingDay: s.billing_day,
              user_id: s.user_id
            }))
          );
          
          setIsLoaded(true);
        }
      } catch (err) {
        console.error("Error populating finance data dashboard tables:", err);
        if (isMounted) window.location.href = "/auth";
      }
    };

    checkUserAndFetch();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // 2. Market Pricing Refresh Logic
  const refreshPrices = useCallback(async (extendedHours = useExtendedHours) => {
    if (portfolio.length === 0) return;
    setIsRefreshing(true);
    try {
      const symbols = Array.from(new Set(portfolio.map((item) => item.symbol)));
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols, useExtendedHours: extendedHours }),
      });
      if (res.ok) {
        const priceMap = await res.json();
        setLivePrices(priceMap);
      }
    } catch (err) {
      console.error("Market API execution drop:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [portfolio, useExtendedHours]);

  // 3. Cloud Synchronization Database Actions
  
  const addPortfolioItem = async (item: any) => {
    if (!userId) return;
    
    // MAP FRONTEND CAMELCASE TO BACKEND SNAKE_CASE
    const payload = {
      name: item.name,
      symbol: item.symbol,
      amount: item.amount,
      purchase_price: item.purchasePrice, // Maps UI to DB
      image_url: item.imageUrl,           // Maps UI to DB
      type: item.type,
      date: item.date,
      platform: item.platform,
      user_id: userId
    };

    const { data, error } = await supabase
      .from("portfolio")
      .insert([payload])
      .select();
      
    if (error) {
      console.error("Supabase Portfolio Insert Error:", error);
    }

    if (!error && data) {
      // MAP IT BACK FOR THE STATE UPDATE
      const uiFriendlyData = {
        id: data[0].id,
        name: data[0].name,
        symbol: data[0].symbol,
        amount: Number(data[0].amount),
        purchasePrice: Number(data[0].purchase_price), 
        imageUrl: data[0].image_url,                   
        type: data[0].type,
        date: data[0].date,
        platform: data[0].platform,
        user_id: data[0].user_id
      };
      setPortfolio((prev) => [...prev, uiFriendlyData]);
    }
  };

  const removePortfolioItem = async (id: string) => {
    const { error } = await supabase.from("portfolio").delete().eq("id", id);
    if (!error) setPortfolio((prev) => prev.filter((p) => p.id !== id));
  };

  const addSubscription = async (sub: any) => {
    if (!userId) return;
    
    const payload = { 
      name: sub.name,
      cost: sub.cost,
      billing_day: sub.billingDay,
      user_id: userId 
    };

    const { data, error } = await supabase
      .from("subscriptions")
      .insert([payload])
      .select();

    if (!error && data) {
      const uiFriendlyData = {
        id: data[0].id,
        name: data[0].name,
        cost: Number(data[0].cost),
        billingDay: data[0].billing_day,
        user_id: data[0].user_id
      };
      setSubscriptions((prev) => [...prev, uiFriendlyData]);
    }
  };

  const removeSubscription = async (id: string) => {
    const { error } = await supabase.from("subscriptions").delete().eq("id", id);
    if (!error) setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  };

  const addTransaction = async (tx: any) => {
    if (!userId) return;
    const { data, error } = await supabase.from("transactions").insert([{ ...tx, user_id: userId }]).select();
    if (!error && data) setTransactions((prev) => [data[0], ...prev]);
  };

  const removeTransaction = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (!error) setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const updateBudget = async (monthKey: string, amount: number) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("budgets")
      .upsert({ user_id: userId, month_key: monthKey, amount }, { onConflict: "user_id,month_key" })
      .select();
    if (!error && data) {
      setBudgets((prev) => {
        const filtered = prev.filter((b) => b.month_key !== monthKey);
        return [...filtered, data[0]];
      });
    }
  };

  const addBankAccount = async (acc: any) => {
    if (!userId) return;
    const { data, error } = await supabase.from("bank_accounts").insert([{ ...acc, user_id: userId }]).select();
    
    if (error) {
        console.error("Bank Account Error:", error);
        alert(`Error: ${error.message}`);
        return;
    }
    if (data) setAccounts((prev) => [...prev, data[0]]);
  };

  const updateBankAccount = async (id: string, updates: any) => {
    const { data, error } = await supabase.from("bank_accounts").update(updates).eq("id", id).select();
    
    // The fix: Add `data.length > 0` so we don't accidentally save 'undefined'
    if (!error && data && data.length > 0) {
        setAccounts((prev) => prev.map((a) => (a.id === id ? data[0] : a)));
    } else if (error) {
        console.error("Error updating bank account:", error);
    }
  };

  const removeBankAccount = async (id: string) => {
    const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
    if (!error) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
    } else {
        console.error("DELETE ERROR:", error);
    }
  };

  const addBankSwitch = async (sw: any) => {
    if (!userId) return;
    const { data, error } = await supabase.from("bank_switches").insert([{ ...sw, user_id: userId }]).select();
    if (!error && data) setSwitches((prev) => [...prev, data[0]]);
  };

  const updateBankSwitchStatus = async (id: string, status: string) => {
    const { data, error } = await supabase.from("bank_switches").update({ status }).eq("id", id).select();
    if (!error && data) setSwitches((prev) => prev.map((s) => (s.id === id ? data[0] : s)));
  };

  const removeBankSwitch = async (id: string) => {
    const { error } = await supabase.from("bank_switches").delete().eq("id", id);
    if (!error) setSwitches((prev) => prev.filter((s) => s.id !== id));
  };

  // 4. Prop Firm Data Core Actions
  const addPropAccount = async (acc: any) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("prop_accounts")
      .insert([{ ...acc, user_id: userId }])
      .select();
      
    if (error) {
      console.error("SUPABASE PROP ACCOUNT ERROR:", error);
      alert(`Database Error: ${error.message}`);
      return;
    }
    if (data) setPropAccounts((prev) => [...prev, data[0]]);
  };

  const updatePropAccountStatus = async (id: string, status: string) => {
    const { data, error } = await supabase.from("prop_accounts").update({ status }).eq("id", id).select();
    if (!error && data) setPropAccounts((prev) => prev.map((a) => (a.id === id ? data[0] : a)));
  };

  const updatePropAccountCash = async (id: string, newBalance: number) => {
    const { error } = await supabase.from("prop_accounts").update({ cash_balance: newBalance }).eq("id", id);
    if (!error) {
      setPropAccounts(prev => prev.map(a => a.id === id ? { ...a, cash_balance: newBalance } : a));
    }
  };

  const removePropAccount = async (id: string) => {
    const { error } = await supabase.from("prop_accounts").delete().eq("id", id);
    if (!error) {
      setPropAccounts((prev) => prev.filter((a) => a.id !== id));
      setPropTransactions((prev) => prev.filter((t) => t.account_id !== id));
    }
  };

  const addPropTransaction = async (tx: any) => {
    if (!userId) return;
    const { data, error } = await supabase.from("prop_transactions").insert([{ ...tx, user_id: userId }]).select();
    if (!error && data) setPropTransactions((prev) => [data[0], ...prev]);
  };

  const removePropTransaction = async (id: string) => {
    const { error } = await supabase.from("prop_transactions").delete().eq("id", id);
    if (!error) setPropTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // 5. Brokerage Cash Actions (NEW)
  const addBrokerage = async (name: string) => {
    if (!userId) return;
    const { data, error } = await supabase.from("brokerages").insert([{ name, cash_balance: 0, user_id: userId }]).select();
    if (data) setBrokerages(prev => [...prev, data[0]]);
  };

  const updateBrokerageCash = async (id: string, newBalance: number) => {
    const { error } = await supabase.from("brokerages").update({ cash_balance: newBalance }).eq("id", id);
    if (!error) {
      setBrokerages(prev => prev.map(b => b.id === id ? { ...b, cash_balance: newBalance } : b));
    }
  };

  const removeBrokerage = async (id: string) => {
    // 1. Find the broker name first so we know what assets to delete
    const brokerToDelete = brokerages.find(b => b.id === id);
    
    if (brokerToDelete) {
      // 2. Wipe out all stocks/assets attached to this broker
      await supabase.from("portfolio").delete().eq("platform", brokerToDelete.name);
      setPortfolio(prev => prev.filter(p => p.platform !== brokerToDelete.name));
    }

    // 3. Delete the broker itself
    await supabase.from("brokerages").delete().eq("id", id);
    setBrokerages(prev => prev.filter(b => b.id !== id));
  };

  return {
    isLoaded,
    transactions,
    portfolio,
    subscriptions,
    switches,
    budgets,
    accounts,
    propAccounts,
    propTransactions,
    brokerages,
    livePrices,
    isRefreshing,
    useExtendedHours,
    setUseExtendedHours,
    refreshPrices,
    addTransaction,
    removeTransaction,
    addPortfolioItem,
    removePortfolioItem,
    addSubscription,
    removeSubscription,
    updateBudget,
    addBankAccount,
    updateBankAccount, // <-- ADDED HERE
    removeBankAccount,
    addBankSwitch,
    updateBankSwitchStatus,
    removeBankSwitch,
    addPropAccount,
    updatePropAccountStatus,
    removePropAccount,
    addPropTransaction,
    removePropTransaction,
    addBrokerage,
    updateBrokerageCash,
    removeBrokerage,
  };
}