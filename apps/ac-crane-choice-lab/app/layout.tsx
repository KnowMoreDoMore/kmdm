import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cranelab.kmdm.org"),
  title: "Crane Choice Lab | AC Crane",
  description: "Capture expert crane selections from realistic lift scenarios.",
  openGraph: {
    title: "Crane Choice Lab",
    description: "Capture expert crane decisions.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Crane Choice Lab by AC Crane" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Crane Choice Lab",
    description: "Capture expert crane decisions.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
