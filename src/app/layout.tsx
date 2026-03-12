import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// 1. Import Poppins and set the font weights we want to use
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "WealthBase | Personal Dashboard",
  description: "Track your income, expenses, and portfolio in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 2. Apply Poppins to the whole body */}
      <body className={poppins.className}>{children}</body>
    </html>
  );
}