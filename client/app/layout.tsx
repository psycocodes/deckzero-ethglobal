import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Web3Providers from "@/components/Web3Providers";
 


const calebMono = localFont({
  src: "../public/fonts/CSCalebMono-Regular.ttf",
  variable: "--font-caleb-mono",
});

export const metadata: Metadata = {
  title: "DeckZero",
  description: "The Web3 game that decides your fate",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${calebMono.variable} antialiased`}>
        <Web3Providers>
          {children}
        </Web3Providers>
      </body>
    </html>
  );
}
