import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | careLINK by RAFFATI",
    default: "careLINK by RAFFATI — Connecting Quality Care to Every Home",
  },
  description:
    "careLINK by RAFFATI is Nigeria's premier healthcare workforce management platform, connecting quality care professionals with families, hospitals, and organizations.",
  keywords: [
    "healthcare staffing Nigeria",
    "home care Nigeria",
    "nurses for hire",
    "caregiver services",
    "physiotherapy",
    "RAFFATI",
    "careLINK",
  ],
  authors: [{ name: "RAFFATI Healthcare Agency" }],
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: "careLINK by RAFFATI",
    title: "careLINK by RAFFATI — Connecting Quality Care to Every Home",
    description:
      "Nigeria's premier healthcare workforce management platform.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
