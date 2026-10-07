import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quick List",
  description: "A simple list app built with Next.js, Tailwind CSS, and Cloudflare Workers.",
  icons: {
    icon: "/quicklist-icon.svg",
    shortcut: "/quicklist-icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
