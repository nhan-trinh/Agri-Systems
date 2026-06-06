import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import "./globals.css";
import { Providers } from "@/components/providers";

const fraunces = Fraunces({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['300', '400', '600', '900'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "AgriTrace Carbon - Hệ thống Quản lý Nông nghiệp & Phát thải Carbon",
  description: "Giải pháp số hóa nông nghiệp và theo dõi tín chỉ Carbon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body className="bg-[#fbfcf9] text-stone-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


