import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | MedLINK by RGH",
    default: "MedLINK by RGH — Hospitals, Diagnostics, Pharmacy, Ambulance & Verified Care",
  },
  description:
    "MedLINK by RGH connects you to hospitals, diagnostics, pharmacies, ambulance & paramedics and RGH-verified healthcare professionals across Nigeria.",
  keywords: [
    "healthcare staffing Nigeria",
    "home care Nigeria",
    "nurses for hire",
    "caregiver services",
    "physiotherapy",
    "RGH",
    "MedLINK",
  ],
  authors: [{ name: "RGH" }],
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: "MedLINK by RGH",
    title: "MedLINK by RGH — Connecting Quality Care to Every Home",
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
      <body className="min-h-full">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
