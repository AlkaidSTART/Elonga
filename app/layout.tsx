import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elonga - 简悦内容推流与视觉创作台",
  description:
    "Elonga 创作工作台：支持抖音、今日头条、快手、微信公众号推流文案撰写，以及图片智能打码与二维风格化。",
  icons: {
    icon: "/elonga-logo.png",
    shortcut: "/elonga-logo.png",
    apple: "/elonga-logo.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#F6F4EF] text-[#181816] selection:bg-[#1B4D3E]/15 selection:text-[#1B4D3E]">
        {children}
      </body>
    </html>
  );
}
