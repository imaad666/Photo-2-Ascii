import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASCII Art Converter",
  description: "Convert images to ASCII art with real-time preview and customizable settings",
  keywords: ["ASCII art", "image converter", "text art", "image to text"],
  authors: [{ name: "ASCII Art Converter" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/next.svg', type: 'image/svg+xml' },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

const inter = Inter({ subsets: ["latin"], display: "swap" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
