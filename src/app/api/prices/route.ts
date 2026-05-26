import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbols, useExtendedHours } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    // 1. Fetch live Exchange Rates
    let usdToGbp = 0.79; 
    let eurToGbp = 0.85;
    
    try {
      const [usdRes, eurRes] = await Promise.all([
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDGBP=X'),
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/EURGBP=X')
      ]);
      
      if (usdRes.ok) {
        const usdData = await usdRes.json();
        const liveUsdGbp = usdData.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (liveUsdGbp) usdToGbp = liveUsdGbp;
      }
      
      if (eurRes.ok) {
        const eurData = await eurRes.json();
        const liveEurGbp = eurData.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (liveEurGbp) eurToGbp = liveEurGbp;
      }
    } catch (fxError) {
      console.error("Failed to fetch live FX rates.", fxError);
    }

    const priceMap: Record<string, number> = {};

    // 2. Fetch all symbols simultaneously
    await Promise.all(
      symbols.map(async (symbol: string) => {
        try {
          // ADDED: interval=2m & range=1d forces it to give us the intraday ticks
const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?includePrePost=true`;          
          const res = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });

          if (res.ok) {
            const data = await res.json();
            const result = data.chart?.result?.[0];
            const meta = result?.meta;
            
            if (meta) {
              let price = meta.regularMarketPrice;

              // 3. THE FIX: Pluck the absolute latest trade from the chart array
              if (useExtendedHours) {
                if (meta.postMarketPrice) {
                  // This captures the 24/5 Blue Ocean overnight feed if Yahoo exposes it
                  price = meta.postMarketPrice;
                } else if (meta.preMarketPrice) {
                  // This captures early morning trading
                  price = meta.preMarketPrice;
                } else {
                  // Fallback: Pluck the absolute latest trade from the chart array
                  const closePrices = result?.indicators?.quote?.[0]?.close;
                  if (closePrices && Array.isArray(closePrices)) {
                    const latestExtendedPrice = [...closePrices].reverse().find(p => p !== null && p !== undefined);
                    
                    if (latestExtendedPrice !== undefined) {
                      price = latestExtendedPrice;
                    }
                  }
                }
              }

              if (price !== undefined) {
                // 4. Convert Currency
                const curr = meta.currency || "";
                
                if (curr === "GBp" || curr === "GBX") {
                  price = price / 100;
                } else if (curr === "USD") {
                  price = price * usdToGbp;
                } else if (curr === "EUR") {
                  price = price * eurToGbp;
                }
                
                priceMap[symbol] = price;
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch individual symbol ${symbol}:`, err);
        }
      })
    );

    return NextResponse.json(priceMap);

  } catch (error) {
    console.error("Prices API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch batch prices' }, { status: 500 });
  }
}