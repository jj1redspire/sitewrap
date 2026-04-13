import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteWrap — Voice Punch Lists & Change Orders for Contractors",
  description:
    "Walk the site. Talk the list. Get paid. SiteWrap turns your voice into professional punch lists and change orders that protect you from disputes.",
  keywords: ["punch list", "change order", "contractor app", "construction", "site walkthrough"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
