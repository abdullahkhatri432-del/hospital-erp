import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Meridian — Hospital ERP",
  description:
    "Enterprise hospital management dashboard with NEWS2 early-warning scoring, prescription safety checking, laboratory workflow, billing and insurance claim tracking.",
  keywords: [
    "hospital management",
    "ERP",
    "NEWS2",
    "clinical decision support",
    "healthcare dashboard",
  ],
  authors: [{ name: "Abdullah Khatri" }],
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
