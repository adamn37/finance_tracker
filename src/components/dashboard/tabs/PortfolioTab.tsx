"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, ChevronDown, Search, ArrowUpRight, ArrowDownLeft, ChevronUp, Trash2, RefreshCw, AlertCircle, Plus, Building, X, Target, Layers, ShieldCheck } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

const ISIN_DICTIONARY: Record<string, string> = { "IE00BK5BQV03": "VHVG.L", "IE00BK5BR733": "VFEG.L" };
const TICKER_DICTIONARY: Record<string, string> = { "ASML": "ASML.AS", "HEIA": "HEIA.AS", "BMW": "BMW.DE" };

const QUICK_BROKERS = ["Trading 212", "InvestEngine", "Vanguard", "XTB"];
const ALL_BROKERS = [
  "AJ Bell", "Binance", "Charles Schwab", "Coinbase", "Dodl", "eToro",
  "Fidelity", "Freetrade", "Hargreaves Lansdown", "Interactive Brokers", 
  "InvestEngine", "Kraken", "Lightyear", "Robinhood", "Trading 212", 
  "Vanguard", "Wealthfront", "XTB"
];

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

export default function PortfolioTab({ data }: { data: any }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  
  const [viewMode, setViewMode] = useState<"broker" | "all">("all");

  // Modals
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [activeBrokerForModal, setActiveBrokerForModal] = useState<string>("");
  
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [pendingBrokerName, setPendingBrokerName] = useState("");

  const [isBrokerListModalOpen, setIsBrokerListModalOpen] = useState(false);
  const [brokerSearchQuery, setBrokerSearchQuery] = useState("");

  const [portfolioGoal, setPortfolioGoal] = useState<number>(10000);
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  // States
  const [collapsedBrokers, setCollapsedBrokers] = useState<Record<string, boolean>>({});
  const [expandedSymbols, setExpandedSymbols] = useState<Record<string, boolean>>({});
  const [isCombinedCashExpanded, setIsCombinedCashExpanded] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'value', direction: 'desc' });

  useEffect(() => {
    const savedGoal = localStorage.getItem("wealthbase_portfolio_goal");
    if (savedGoal) setPortfolioGoal(Number(savedGoal));
  }, []);

  const handleSaveGoal = (val: number) => {
    const safeVal = val > 0 ? val : 1000;
    setPortfolioGoal(safeVal);
    localStorage.setItem("wealthbase_portfolio_goal", safeVal.toString());
  };

  const toggleBroker = (id: string) => {
    setCollapsedBrokers(prev => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const [portName, setPortName] = useState(""); const [portSymbol, setPortSymbol] = useState(""); const [portAmount, setPortAmount] = useState("");
  const [portType, setPortType] = useState<"crypto" | "stock">("crypto"); const [portPurchasePrice, setPortPurchasePrice] = useState("");
  const [portImageUrl, setPortImageUrl] = useState(""); const [portDate, setPortDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchResults, setSearchResults] = useState<any[]>([]); const [isSearching, setIsSearching] = useState(false);
  
  const [importBroker, setImportBroker] = useState<string | null>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (portSymbol.length < 2) { setSearchResults([]); return; }
      setIsSearching(true);
      try {
        if (portType === "crypto") {
          const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${portSymbol}`);
          const resData = await res.json(); setSearchResults(resData.coins?.slice(0, 5) || []);
        } else {
          const res = await fetch(`/api/search?q=${portSymbol}`);
          if (!res.ok) throw new Error("Search failed");
          const resData = await res.json();
          let mappedResults = (resData.quotes || []).filter((q: any) => q.quoteType === "EQUITY" || q.quoteType === "ETF").map((q: any) => ({
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

  const handleSelectSearchResult = (asset: any) => {
    if (portType === "crypto") { setPortSymbol(asset.api_symbol || asset.id); setPortName(asset.name); setPortImageUrl(asset.thumb); } 
    else { setPortSymbol(asset.symbol); setPortName(asset.name); setPortImageUrl(getSmartLogo(asset.symbol, asset.name)); }
    setSearchResults([]);
  };

  const handleAddPortfolio = () => {
    if (!portName || !portSymbol || !portAmount || !portPurchasePrice || !activeBrokerForModal) return setError("Please fill all fields.");
    data.addPortfolioItem({ 
      name: portName, 
      symbol: portType === "crypto" ? portSymbol.toLowerCase().trim() : portSymbol.toUpperCase().trim(), 
      amount: parseFloat(portAmount), 
      purchasePrice: parseFloat(portPurchasePrice), 
      imageUrl: portImageUrl, 
      type: portType, 
      date: portDate, 
      platform: activeBrokerForModal.trim() 
    });
    setPortName(""); setPortSymbol(""); setPortAmount(""); setPortPurchasePrice(""); setPortImageUrl(""); setSearchResults([]); setError("");
    setIsTradeModalOpen(false);
  };

  const openTradeModal = (brokerName: string = "") => {
    setActiveBrokerForModal(brokerName);
    setIsTradeModalOpen(true);
  };

  const handleSelectAccountType = (type: string) => {
    const finalName = type === "Standard" ? pendingBrokerName : `${pendingBrokerName} (${type})`;
    data.addBrokerage(finalName);
    setIsTypeModalOpen(false);
    setPendingBrokerName("");
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importBroker) return;
    const reader = new FileReader();
    
    reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        const lines = text.split('\n');
        if (lines.length < 2) return setError("CSV file seems empty.");

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
        let importCount = 0;

        const isT212 = headers.some(h => h.includes('action')) && headers.some(h => h.includes('ticker'));
        const isIE = headers.some(h => h.includes('transaction type')) || (headers.some(h => h.includes('type')) && headers.some(h => h.includes('instrument')));

        if (isT212) {
            const actionIdx = headers.findIndex(h => h.includes('action'));
            const tickerIdx = headers.findIndex(h => h.includes('ticker'));
            const nameIdx = headers.findIndex(h => h.includes('name'));
            const sharesIdx = headers.findIndex(h => h.includes('no. of shares') || h === 'shares');
            const priceIdx = headers.findIndex(h => h.includes('price / share') || h === 'price');
            const timeIdx = headers.findIndex(h => h.includes('time') || h === 'date');
            const currIdx = headers.findIndex(h => h.includes('currency (price'));
            const fxRateIdx = headers.findIndex(h => h.includes('exchange rate'));
            const isinIdx = headers.findIndex(h => h === 'isin' || h.includes('isin'));

            lines.slice(1).forEach(line => {
                if (!line.trim()) return;
                const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, '').trim());
                if (cols.length <= Math.max(tickerIdx, sharesIdx, priceIdx)) return;

                const action = actionIdx >= 0 ? cols[actionIdx].toLowerCase() : 'buy';
                
                if (action.includes('buy') || action.includes('sell')) {
                    let symbol = cols[tickerIdx];
                    const isin = isinIdx >= 0 ? cols[isinIdx] : "";
                    const name = nameIdx >= 0 ? cols[nameIdx] : symbol;
                    let shares = parseFloat(cols[sharesIdx]);
                    let price = parseFloat(cols[priceIdx]);
                    const currency = currIdx >= 0 ? cols[currIdx] : '';
                    let fxRate = fxRateIdx >= 0 ? parseFloat(cols[fxRateIdx]) : 1;
                    
                    if (isNaN(shares) || isNaN(price)) return;
                    if (isNaN(fxRate) || fxRate === 0) fxRate = 1;
                    if (action.includes('sell')) shares = -Math.abs(shares);

                    if (isin && ISIN_DICTIONARY[isin]) symbol = ISIN_DICTIONARY[isin];
                    else if (TICKER_DICTIONARY[symbol]) symbol = TICKER_DICTIONARY[symbol];
                    else if (currency === 'GBX' || currency === 'GBP' || currency === 'gbp' || currency === 'gbx') { if (!symbol.includes('.')) symbol += '.L'; } 
                    else if (currency === 'EUR' || currency === 'eur') { if (!symbol.includes('.')) symbol += '.DE'; }

                    let purchasePriceGBP = price;
                    if (currency.toUpperCase() === 'GBX') purchasePriceGBP = price / 100; 
                    else if (currency.toUpperCase() === 'USD' || currency.toUpperCase() === 'EUR') purchasePriceGBP = price / fxRate; 

                    if (symbol) {
                        data.addPortfolioItem({ name: name || symbol, symbol: symbol, amount: shares, purchasePrice: purchasePriceGBP, imageUrl: getSmartLogo(symbol, name || symbol), type: 'stock', date: timeIdx >= 0 && cols[timeIdx] ? cols[timeIdx].split(' ')[0] : new Date().toISOString().split('T')[0], platform: importBroker });
                        importCount++;
                    }
                }
            });
        } 
        else if (isIE) {
            const actionIdx = headers.findIndex(h => h.includes('type') || h.includes('transaction'));
            const tickerIdx = headers.findIndex(h => h.includes('ticker') || h.includes('symbol'));
            const nameIdx = headers.findIndex(h => h.includes('instrument') || h.includes('name'));
            const sharesIdx = headers.findIndex(h => h.includes('quantity') || h.includes('shares'));
            const priceIdx = headers.findIndex(h => h.includes('price'));
            const timeIdx = headers.findIndex(h => h.includes('date'));
            const isinIdx = headers.findIndex(h => h === 'isin' || h.includes('isin'));
            
            let searchStartIdx = 0;
            for (let i = 0; i < Math.min(5, lines.length); i++) {
                if (lines[i].toLowerCase().includes('transaction type')) { searchStartIdx = i; break; }
            }

            lines.slice(searchStartIdx + 1).forEach(line => {
                if (!line.trim()) return;
                const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, '').trim());
                if (cols.length <= Math.max(tickerIdx, sharesIdx, priceIdx)) return;

                const action = actionIdx >= 0 ? cols[actionIdx].toLowerCase() : 'buy';
                
                if (action.includes('buy') || action.includes('sell') || action.includes('investment') || action.includes('reinvestment')) {
                    const securityStr = cols[nameIdx] || cols[tickerIdx]; 
                    const isinMatch = securityStr.match(/[A-Z]{2}[0-9A-Z]{10}/);
                    const isin = isinMatch ? isinMatch[0] : (isinIdx >= 0 ? cols[isinIdx] : "");
                    const cleanName = securityStr ? securityStr.split('/ ISIN')[0].trim() : "";

                    let shares = parseFloat(cols[sharesIdx]);
                    let price = parseFloat(cols[priceIdx].replace(/[^0-9.-]+/g, ""));
                    
                    if (isNaN(shares) || isNaN(price)) return;
                    if (action.includes('sell')) shares = -Math.abs(shares);

                    let symbol = "";
                    if (isin && ISIN_DICTIONARY[isin]) symbol = ISIN_DICTIONARY[isin];
                    else if (TICKER_DICTIONARY[symbol]) symbol = TICKER_DICTIONARY[symbol];
                    else if (cols[tickerIdx] && !cols[tickerIdx].includes('.')) symbol = cols[tickerIdx] + '.L'; 
                    else symbol = isin || cols[tickerIdx] || "UNKNOWN";

                    let formattedDate = new Date().toISOString().split('T')[0];
                    if (timeIdx >= 0 && cols[timeIdx]) {
                        let rawDate = cols[timeIdx].split(' ')[0]; 
                        if (rawDate.includes('/')) {
                            const [d, m, y] = rawDate.split('/'); 
                            if (y && m && d) formattedDate = `${y}-${m}-${d}`; 
                        } else { formattedDate = rawDate; }
                    }

                    if (symbol) {
                        data.addPortfolioItem({ name: cleanName || symbol, symbol: symbol, amount: shares, purchasePrice: price, imageUrl: getSmartLogo(symbol, cleanName || symbol), type: 'stock', date: formattedDate, platform: importBroker });
                        importCount++;
                    }
                }
            });
        }

        if (importCount > 0) alert(`Successfully synced ${importCount} trades into ${importBroker}! Click "Refresh Prices" to see live data.`);
        else alert("No valid buy/sell transactions found or unsupported CSV format.");
        
        e.target.value = ''; 
        setImportBroker(null);
    };
    reader.readAsText(file);
  };

  const groupedBrokerPortfolio = data.portfolio.reduce((acc: any, item: any) => {
    const key = `${item.platform}-${item.symbol}`;
    if (!acc[key]) { acc[key] = { symbol: item.symbol, name: item.name, type: item.type, imageUrl: item.imageUrl, platform: item.platform, totalAmount: 0, totalCost: 0, lots: [] }; }
    acc[key].totalAmount += item.amount;
    acc[key].totalCost += (item.amount * (item.purchasePrice || 0));
    acc[key].lots.push(item);
    return acc;
  }, {});

  const portfolioWithMetrics = Object.values(groupedBrokerPortfolio).filter((a:any) => a.totalAmount > 0.000001).map((asset: any) => {
      const avgPrice = asset.totalAmount > 0 ? (asset.totalCost / asset.totalAmount) : 0;
      const currentPriceToUse = data.livePrices[asset.symbol] || avgPrice; 
      const liveValue = asset.totalAmount * currentPriceToUse;
      const profitLoss = liveValue - asset.totalCost;
      const ror = asset.totalCost > 0 ? (profitLoss / asset.totalCost) * 100 : 0;
      return { ...asset, liveValue, profitLoss, ror, isProfit: profitLoss >= 0 }
  });

  const groupedCombinedPortfolio = data.portfolio.reduce((acc: any, item: any) => {
    const key = item.symbol;
    if (!acc[key]) { acc[key] = { symbol: item.symbol, name: item.name, type: item.type, imageUrl: item.imageUrl, totalAmount: 0, totalCost: 0, lots: [] }; }
    acc[key].totalAmount += item.amount;
    acc[key].totalCost += (item.amount * (item.purchasePrice || 0));
    acc[key].lots.push(item);
    return acc;
  }, {});

  const combinedAssetsWithMetrics = Object.values(groupedCombinedPortfolio).filter((a:any) => a.totalAmount > 0.000001).map((asset: any) => {
      const avgPrice = asset.totalAmount > 0 ? (asset.totalCost / asset.totalAmount) : 0;
      const currentPriceToUse = data.livePrices[asset.symbol] || avgPrice; 
      const liveValue = asset.totalAmount * currentPriceToUse;
      const profitLoss = liveValue - asset.totalCost;
      const ror = asset.totalCost > 0 ? (profitLoss / asset.totalCost) * 100 : 0;
      return { ...asset, liveValue, profitLoss, ror, isProfit: profitLoss >= 0 }
  });

  const sortedCombinedPortfolio = [...combinedAssetsWithMetrics].sort((a, b) => {
      if (sortConfig.key === 'name') return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      let valA = 0, valB = 0;
      if (sortConfig.key === 'value') { valA = a.liveValue; valB = b.liveValue; }
      else if (sortConfig.key === 'profit') { valA = a.profitLoss; valB = b.profitLoss; }
      else if (sortConfig.key === 'ror') { valA = a.ror; valB = b.ror; }
      return sortConfig.direction === 'desc' ? valB - valA : valA - valB;
  });

  const totalInvestedValue = combinedAssetsWithMetrics.reduce((sum: number, a: any) => sum + a.liveValue, 0);
  const totalCashValue = (data.brokerages || []).reduce((sum: number, b: any) => sum + Number(b.cash_balance || 0), 0);
  const overallPortfolioWealth = totalInvestedValue + totalCashValue;
  const progressPercent = Math.min((overallPortfolioWealth / portfolioGoal) * 100, 100);

  return (
    <div className="animate-in fade-in duration-300 relative">
      <input type="file" id="csvUpload" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleCsvImport} />

      {/* TOP BAR: Value & Goal Progress */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
          <div className="w-full md:w-[60%] lg:w-[45%]">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Brokerage Wealth</p>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">£{overallPortfolioWealth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm relative overflow-hidden">
                 <div className="flex justify-between items-end mb-2 relative z-10">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Target size={14}/> Goal Progress</span>
                    {isEditingGoal ? (
                        <input
                          type="number"
                          autoFocus
                          className="text-xs font-bold bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 outline-none w-24 text-right"
                          defaultValue={portfolioGoal}
                          onBlur={(e) => { setIsEditingGoal(false); handleSaveGoal(Number(e.target.value)); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditingGoal(false); handleSaveGoal(Number(e.currentTarget.value)); } }}
                        />
                    ) : (
                        <button onClick={() => setIsEditingGoal(true)} className="text-xs font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer flex items-center gap-1">
                          Target: £{portfolioGoal.toLocaleString()} <span className="opacity-50">✎</span>
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
                    <p className="text-[10px] text-gray-400 font-medium">£{(portfolioGoal - overallPortfolioWealth > 0 ? portfolioGoal - overallPortfolioWealth : 0).toLocaleString(undefined, {maximumFractionDigits: 0})} left</p>
                 </div>
              </div>
          </div>
          
          <div className="flex flex-col items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-800 dark:group-hover:text-gray-300 transition-colors uppercase tracking-wider">Extended Hrs</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={data.useExtendedHours} onChange={(e) => { const isChecked = e.target.checked; data.setUseExtendedHours(isChecked); data.refreshPrices(isChecked); }} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${data.useExtendedHours ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${data.useExtendedHours ? 'transform translate-x-4' : ''}`}></div>
                </div>
              </label>
              <button onClick={() => data.refreshPrices()} disabled={data.isRefreshing} className="justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50 text-sm">
                  {data.isRefreshing ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />} {data.isRefreshing ? "Updating..." : "Refresh"}
              </button>
            </div>
          </div>
      </div>

      {/* VIEW SELECTOR & SORTING BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-inner w-full sm:w-auto">
          <button 
            onClick={() => setViewMode("all")} 
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${viewMode === "all" ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm border border-gray-100 dark:border-gray-800" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
          >
            <Layers size={14}/> All Combined Assets
          </button>
          <button 
            onClick={() => setViewMode("broker")} 
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${viewMode === "broker" ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm border border-gray-100 dark:border-gray-800" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
          >
            <Building size={14}/> Broker Accounts
          </button>
        </div>

        {viewMode === "all" && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-sm font-medium text-gray-500">Sort by:</span>
              <select 
                  className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg outline-none bg-white dark:bg-gray-800 dark:text-white text-xs cursor-pointer shadow-sm font-bold"
                  value={`${sortConfig.key}-${sortConfig.direction}`}
                  onChange={(e) => { const [k, d] = e.target.value.split('-'); setSortConfig({ key: k, direction: d as 'asc'|'desc' }); }}
              >
                  <option value="value-desc">Highest Value</option>
                  <option value="value-asc">Lowest Value</option>
                  <option value="ror-desc">Top Performers (%)</option>
                  <option value="ror-asc">Worst Performers (%)</option>
                  <option value="profit-desc">Highest Profit (£)</option>
                  <option value="name-asc">Name (A-Z)</option>
              </select>
          </div>
        )}
      </div>

      {/* QUICK ADD BROKER CREATION BAR */}
      {viewMode === "broker" && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 mb-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-blue-900 dark:text-blue-300 mr-2 flex items-center gap-2"><Building size={16}/> Quick Add Broker:</span>
          {QUICK_BROKERS.map(platform => {
            return (
              <button 
                key={platform}
                onClick={() => { setPendingBrokerName(platform); setIsTypeModalOpen(true); }}
                className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition shadow-sm"
              >
                + {platform}
              </button>
            );
          })}
          <button onClick={() => setIsBrokerListModalOpen(true)} className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm">
            View All Brokers
          </button>
        </div>
      )}

      {/* --- VIEW MODE 1: BROKER CARDS LIST --- */}
      {viewMode === "broker" && (
        <div className="space-y-6">
          {(!data.brokerages || data.brokerages.length === 0) && (
            <div className="text-center py-24 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-white/50 dark:bg-gray-900/50">
              <Building className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Brokerages Linked</h3>
              <p className="text-gray-500 max-w-sm mx-auto">Click one of the platform buttons above to add your first broker. You can then log your cash and asset holdings inside it.</p>
            </div>
          )}

          {data.brokerages?.map((broker: any) => {
            const brokerAssets = portfolioWithMetrics.filter(a => a.platform === broker.name);
            const brokerInvestedValue = brokerAssets.reduce((sum, a) => sum + a.liveValue, 0);
            const brokerTotalCost = brokerAssets.reduce((sum, a) => sum + a.totalCost, 0);
            const brokerProfit = brokerInvestedValue - brokerTotalCost;
            const brokerROR = brokerTotalCost > 0 ? (brokerProfit / brokerTotalCost) * 100 : 0;
            const brokerTotalValue = brokerInvestedValue + Number(broker.cash_balance || 0);
            
            // NOTE: Defaults to true (Closed) if undefined
            const isCollapsed = collapsedBrokers[broker.id] ?? true;

            return (
              <div key={broker.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden transition-all duration-200">
                <div 
                  onClick={() => toggleBroker(broker.id)}
                  className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center font-bold text-lg shadow-sm">
                      {broker.name.substring(0, 1)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{broker.name}</h3>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if(window.confirm(`Are you sure you want to delete ${broker.name}? This will permanently wipe all assets and cash logged inside it.`)) {
                            data.removeBrokerage(broker.id);
                          }
                        }} 
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5 sm:text-right">Account Value</p>
                      <div className="flex items-center sm:justify-end gap-2">
                         <p className="text-2xl font-bold text-gray-900 dark:text-white">£{brokerTotalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                      </div>
                      {brokerInvestedValue > 0 && (
                         <div className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${brokerProfit >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {brokerProfit >= 0 ? <ArrowUpRight size={10}/> : <ArrowDownLeft size={10}/>}
                            £{Math.abs(brokerProfit).toFixed(2)} {brokerTotalCost === 0 ? '(Free)' : `(${Math.abs(brokerROR).toFixed(2)}%)`}
                         </div>
                      )}
                    </div>
                    <div className="text-gray-400 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      {isCollapsed ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                    </div>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">£</div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Uninvested Cash</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">£</span>
                        <input 
                          type="number"
                          value={broker.cash_balance}
                          onChange={(e) => data.updateBrokerageCash(broker.id, Number(e.target.value))}
                          className="w-32 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-7 pr-3 py-2 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                      {brokerAssets.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-400">No assets recorded in this broker yet.</div>
                      ) : (
                        brokerAssets.map((asset: any) => {
                          const currentPrice = data.livePrices[asset.symbol] || (asset.totalAmount > 0 ? (asset.totalCost / asset.totalAmount) : 0);
                          const isExpanded = expandedSymbols[`${broker.name}-${asset.symbol}`];

                          return (
                            <div key={asset.symbol} className="bg-white dark:bg-gray-900 transition overflow-hidden">
                              <div onClick={() => setExpandedSymbols(p => ({...p, [`${broker.name}-${asset.symbol}`]: !p[`${broker.name}-${asset.symbol}`]}))} className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 cursor-pointer gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                  <div className="flex items-center gap-4 relative">
                                      <div className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm flex-shrink-0 ${asset.type === 'crypto' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{asset.symbol.substring(0, 2)}</div>
                                      {asset.imageUrl && (<img src={asset.imageUrl} alt={asset.name} className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-800 shadow-sm object-contain bg-white absolute top-0 left-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />)}
                                      <div className="ml-2"><h3 className="font-semibold text-gray-900 dark:text-white leading-tight flex items-center gap-2">{asset.name}</h3><p className="text-sm text-gray-500 font-mono mt-0.5">{Number(asset.totalAmount.toFixed(8))} {asset.symbol.toUpperCase()}</p></div>
                                  </div>
                                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                      <div className="text-left md:text-right">
                                          <p className="font-semibold text-lg text-gray-900 dark:text-white">£{asset.liveValue.toFixed(2)}</p>
                                          <p className="text-xs text-gray-400 mb-1">Live: £{currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2})} • Avg: £{(asset.totalAmount > 0 ? (asset.totalCost / asset.totalAmount) : 0).toFixed(2)}</p>
                                          {currentPrice > 0 && asset.liveValue > 0 && (
                                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${asset.isProfit ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                {asset.isProfit ? <ArrowUpRight size={12}/> : <ArrowDownLeft size={12}/>}
                                                £{Math.abs(asset.profitLoss).toFixed(2)} {asset.totalCost === 0 ? '(Free)' : `(${Math.abs(asset.ror).toFixed(2)}%)`}
                                            </div>
                                          )}
                                      </div>
                                      <div className="text-gray-400 p-2">{isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</div>
                                  </div>
                              </div>

                              {isExpanded && (
                                  <div className="bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 p-4 space-y-2 inset-shadow-sm">
                                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">Trades in {broker.name}</h4>
                                      {asset.lots.map((lot: any) => {
                                          const lotCost = lot.amount * (lot.purchasePrice || 0); const lotValue = lot.amount * currentPrice; const lotPL = lotValue - lotCost; const lotProfit = lotPL >= 0;
                                          return (
                                              <div key={lot.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-sm">
                                                  <div>
                                                    <div className="flex items-center gap-2"><span className="font-medium dark:text-white">{Number(lot.amount.toFixed(8))} {asset.type === 'crypto' ? 'Coins' : 'Shares'}</span><span className="text-gray-400">@ £{lot.purchasePrice}</span></div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1"><span>{lot.date ? (isValid(parseISO(lot.date)) ? format(parseISO(lot.date), "dd MMM yyyy") : lot.date) : "No date"}</span></div>
                                                  </div>
                                                  <div className="flex items-center gap-4">
                                                    {currentPrice > 0 && (<span className={`font-semibold ${lotProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{lotProfit ? '+' : '-'}£{Math.abs(lotPL).toFixed(2)}</span>)}
                                                    <button onClick={() => data.removePortfolioItem(lot.id)} className="text-gray-400 hover:text-red-500 transition p-1.5 hover:bg-red-50 dark:hover:bg-gray-700 rounded-md"><Trash2 size={16}/></button>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                      <button onClick={() => openTradeModal(broker.name)} className="flex items-center gap-1.5 text-sm font-semibold text-black dark:text-white hover:opacity-70 transition bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <Plus size={16} /> Add Asset
                      </button>
                      <button onClick={() => { setImportBroker(broker.name); fileInputRef.current?.click(); }} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition px-4 py-2 rounded-lg border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
                        <Upload size={16} /> Import CSV
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- VIEW MODE 2: COMBINED AGGREGATED ALL ASSETS VIEW --- */}
      {viewMode === "all" && (
        <div className="space-y-6">
          {/* COMBINED CASH CARD WITH DROPDOWN */}
          {totalCashValue > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden transition-all duration-200">
              <div 
                onClick={() => setIsCombinedCashExpanded(!isCombinedCashExpanded)}
                className="px-6 py-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl shadow-sm">£</div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Combined Uninvested Cash</h3>
                    <p className="text-sm text-gray-500 font-medium">Aggregated across all brokerages</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-2xl text-gray-900 dark:text-white">£{totalCashValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                  <div className="text-gray-400 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    {isCombinedCashExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                  </div>
                </div>
              </div>

              {isCombinedCashExpanded && (
                <div className="bg-gray-50/70 dark:bg-gray-850 p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Cash Balances by Account</p>
                  {data.brokerages?.filter((b: any) => Number(b.cash_balance) > 0).map((broker: any) => (
                    <div key={broker.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-sm">
                      <div className="flex items-center gap-2">
                        <Building size={16} className="text-gray-400" />
                        <span className="font-bold text-gray-800 dark:text-gray-200">{broker.name}</span>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">£{Number(broker.cash_balance).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AGGREGATED ASSETS */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800/50">
            {sortedCombinedPortfolio.length === 0 && (
              <div className="p-16 text-center text-gray-400 dark:text-gray-500">No assets found across your brokerage balances. Go back to accounts and log your trades!</div>
            )}
            
            {sortedCombinedPortfolio.map((asset: any) => {
              const currentPrice = data.livePrices[asset.symbol] || (asset.totalAmount > 0 ? (asset.totalCost / asset.totalAmount) : 0);
              const isExpanded = expandedSymbols[`global-${asset.symbol}`];

              return (
                <div key={asset.symbol} className="transition overflow-hidden">
                  <div 
                    onClick={() => setExpandedSymbols(p => ({...p, [`global-${asset.symbol}`]: !p[`global-${asset.symbol}`]}))}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition gap-4"
                  >
                    <div className="flex items-center gap-4 relative">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm flex-shrink-0 ${asset.type === 'crypto' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{asset.symbol.substring(0, 2)}</div>
                        {asset.imageUrl && (<img src={asset.imageUrl} alt={asset.name} className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-800 shadow-sm object-contain bg-white absolute top-0 left-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />)}
                        <div className="ml-2">
                          <h3 className="font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-2">{asset.name}</h3>
                          <p className="text-sm text-gray-500 font-mono mt-0.5">{Number(asset.totalAmount.toFixed(8))} {asset.symbol.toUpperCase()} (Total)</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-left md:text-right">
                            <p className="font-bold text-xl text-gray-900 dark:text-white">£{asset.liveValue.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 mb-1">Live: £{currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2})} • Wtd Avg Cost: £{asset.totalAmount > 0 ? (asset.totalCost / asset.totalAmount).toFixed(2) : 0}</p>
                            {currentPrice > 0 && asset.liveValue > 0 && (
                              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${asset.isProfit ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                  {asset.isProfit ? <ArrowUpRight size={12}/> : <ArrowDownLeft size={12}/>}
                                  £{Math.abs(asset.profitLoss).toFixed(2)} {asset.totalCost === 0 ? '(Free)' : `(${Math.abs(asset.ror).toFixed(2)}%)`}
                              </div>
                            )}
                        </div>
                        <div className="text-gray-400 p-1">{isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-gray-50/70 dark:bg-gray-850 p-4 border-t border-b border-gray-100 dark:border-gray-800 space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Brokerage Breakdown for {asset.symbol.toUpperCase()}</p>
                      {asset.lots.map((lot: any) => {
                        const lotCost = lot.amount * (lot.purchasePrice || 0);
                        const lotValue = lot.amount * currentPrice;
                        const lotPL = lotValue - lotCost;
                        const lotProfit = lotPL >= 0;

                        return (
                          <div key={lot.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-sm transition-all">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded text-xs">
                                  {lot.platform}
                                </span>
                                <span className="font-bold text-gray-800 dark:text-gray-200 font-mono">
                                  {Number(lot.amount.toFixed(6))} units
                                </span>
                                <span className="text-gray-400">@ £{lot.purchasePrice.toFixed(2)}</span>
                              </div>
                              <div className="text-[11px] text-gray-400 mt-1 font-medium">
                                Lot Added: {lot.date ? (isValid(parseISO(lot.date)) ? format(parseISO(lot.date), "dd MMM yyyy") : lot.date) : "No date"}
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold text-gray-900 dark:text-white">£{lotValue.toFixed(2)}</p>
                                {currentPrice > 0 && (
                                  <span className={`text-xs font-bold ${lotProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {lotProfit ? '+' : '-'}£{Math.abs(lotPL).toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <button 
                                onClick={() => {
                                  if(window.confirm(`Delete this specific lot of ${asset.symbol} from ${lot.platform}?`)) {
                                    data.removePortfolioItem(lot.id);
                                  }
                                }} 
                                className="text-gray-400 hover:text-red-500 transition p-1.5 hover:bg-red-50 dark:hover:bg-gray-700 rounded-md"
                              >
                                <Trash2 size={15}/>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- ALL BROKERS SELECTION MODAL --- */}
      {isBrokerListModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div>
                <h2 className="text-xl font-bold dark:text-white text-gray-900">Supported Brokerages</h2>
                <p className="text-sm text-gray-500">Select a broker to add to your dashboard</p>
              </div>
              <button onClick={() => setIsBrokerListModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search for your broker..." 
                  value={brokerSearchQuery}
                  onChange={(e) => setBrokerSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-500 transition text-sm dark:text-white font-medium"
                />
              </div>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {ALL_BROKERS.filter(b => b.toLowerCase().includes(brokerSearchQuery.toLowerCase())).map(broker => (
                <button
                  key={broker}
                  onClick={() => {
                    setIsBrokerListModalOpen(false);
                    setPendingBrokerName(broker);
                    setIsTypeModalOpen(true);
                  }}
                  className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition group"
                >
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center font-bold text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-white dark:group-hover:bg-gray-900 shadow-sm transition mb-3 text-lg">
                    {broker.substring(0, 1)}
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">{broker}</span>
                </button>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 text-center shrink-0">
               <p className="text-sm text-gray-500">Don't see your broker? <button onClick={() => { setIsBrokerListModalOpen(false); const name = prompt("Enter custom broker name:"); if(name) { setPendingBrokerName(name); setIsTypeModalOpen(true); } }} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Add a custom one</button></p>
            </div>
          </div>
        </div>
      )}

      {/* --- BROKER TYPE SELECTION MODAL --- */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-bold dark:text-white text-gray-900">Account Type</h2>
                <p className="text-sm text-gray-500">How is {pendingBrokerName} taxed?</p>
              </div>
              <button onClick={() => { setIsTypeModalOpen(false); setPendingBrokerName(""); }} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-2">
               {[
                 { id: "ISA", label: "ISA", desc: "Tax-free wrapper", icon: ShieldCheck, color: "text-emerald-500" },
                 { id: "GIA", label: "GIA", desc: "General Investment / Taxable", icon: Layers, color: "text-blue-500" },
                 { id: "SIPP", label: "SIPP", desc: "Personal Pension", icon: Target, color: "text-purple-500" },
                 { id: "Standard", label: "Standard / Crypto", desc: "No special tax wrapper", icon: Building, color: "text-gray-500" }
               ].map(type => (
                 <button 
                   key={type.id}
                   onClick={() => handleSelectAccountType(type.id)}
                   className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left group"
                 >
                   <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-900 ${type.color}`}>
                     <type.icon size={20} />
                   </div>
                   <div>
                     <h3 className="font-bold text-gray-900 dark:text-white text-sm">{type.label}</h3>
                     <p className="text-xs text-gray-500">{type.desc}</p>
                   </div>
                 </button>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* --- RECORD TRADE MODAL OVERLAY --- */}
      {isTradeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800">
            
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <h2 className="text-xl font-bold dark:text-white text-gray-900">Record a Trade</h2>
              <button onClick={() => setIsTradeModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100"><AlertCircle size={16} /> {error}</div>}
              
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Broker / Platform</label>
                <select 
                  value={activeBrokerForModal}
                  onChange={(e) => setActiveBrokerForModal(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 font-medium appearance-none"
                >
                  <option value="" disabled>Select a broker...</option>
                  {data.brokerages?.map((b: any) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Asset Type</label>
                <div className="flex gap-2 mt-1.5">
                  <button onClick={() => { setPortType("crypto"); setSearchResults([]); setPortSymbol(""); }} className={`flex-1 py-2 rounded-lg text-sm border font-bold transition ${portType === "crypto" ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-50'}`}>Crypto</button>
                  <button onClick={() => { setPortType("stock"); setSearchResults([]); setPortSymbol(""); }} className={`flex-1 py-2 rounded-lg text-sm border font-bold transition ${portType === "stock" ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-50'}`}>Stock / ETF</button>
                </div>
              </div>

              <div className="relative z-20">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Search Ticker or Name</label>
                  <div className="relative mt-1.5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" value={portSymbol} onChange={(e) => setPortSymbol(e.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" placeholder={portType === "crypto" ? "e.g. bitcoin" : "e.g. Apple or AAPL"} />
                  </div>
                  {searchResults.length > 0 && (
                      <div className="absolute w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-gray-100 dark:divide-gray-700">
                          {searchResults.map((asset, i) => (
                              <button key={i} onClick={() => handleSelectSearchResult(asset)} className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition">
                                  {asset.thumb ? (<img src={asset.thumb} alt="logo" className="w-8 h-8 rounded-full shadow-sm" />) : (<div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-xs font-bold uppercase tracking-wider ${asset.type === 'crypto' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{asset.symbol.substring(0, 2)}</div>)}
                                  <div className="flex flex-col overflow-hidden"><span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{asset.name}</span><div className="flex items-center gap-2 text-xs text-gray-500"><span className="font-mono text-black dark:text-gray-300">{asset.symbol}</span>{asset.exchange && (<span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${asset.exchange === 'London' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>{asset.exchange}</span>)}</div></div>
                              </button>
                          ))}
                      </div>
                  )}
              </div>
              
              <div><label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Display Name</label><input type="text" value={portName} onChange={(e) => setPortName(e.target.value)} className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 transition" /></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quantity</label><input type="number" step="any" value={portAmount} onChange={(e) => setPortAmount(e.target.value)} className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 transition font-mono" placeholder="0.00" /></div>
                <div><label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Price (£)</label><input type="number" step="any" value={portPurchasePrice} onChange={(e) => setPortPurchasePrice(e.target.value)} className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 transition font-mono" placeholder="Cost per unit" /></div>
              </div>
              
              <div><label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date Bought</label><input type="date" value={portDate} onChange={(e) => setPortDate(e.target.value)} className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg outline-none mt-1.5 focus:border-blue-500 transition" /></div>
              
            </div>
            
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex gap-3">
               <button onClick={() => setIsTradeModalOpen(false)} className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
               <button onClick={handleAddPortfolio} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-md shadow-blue-500/20">Record Trade</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}