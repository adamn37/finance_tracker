import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    // We fetch directly from Yahoo Finance.
    // ADDED: ?includePrePost=true tells Yahoo to send us the secret after-hours data!
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?includePrePost=true`;
    
    const res = await fetch(targetUrl, {
      headers: {
        // We pretend to be a real browser so Yahoo doesn't block us
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!res.ok) throw new Error('Failed to fetch from Yahoo');

    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}