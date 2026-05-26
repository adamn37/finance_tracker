import { NextResponse } from "next/server";
import { getGoCardlessToken } from "@/utils/gocardless";

export async function GET() {
  try {
    // 1. Get our secure access token
    const token = await getGoCardlessToken();

    // 2. Fetch all supported banks in the UK (gb)
    const response = await fetch(
      "https://bankaccountdata.gocardless.com/api/v2/institutions/?country=gb",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch institutions from GoCardless");
    }

    const banks = await response.json();

    // 3. Send the list back to our frontend
    return NextResponse.json(banks);
  } catch (error: any) {
    console.error("Bank Fetch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}