import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teacher Resource Exchange",
  description:
    "Search free, trusted teaching resources by grade, subject, standards, time, source, and classroom approach.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
