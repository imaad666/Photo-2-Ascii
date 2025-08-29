import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASCII Art Converter",
  description: "Convert images to ASCII art with real-time preview and customizable settings",
  keywords: ["ASCII art", "image converter", "text art", "image to text"],
  authors: [{ name: "ASCII Art Converter" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
