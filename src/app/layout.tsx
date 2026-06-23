import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://carelink.ng"),
  title: {
    template: "%s · careLINK by RAFFATI",
    default: "careLINK by RAFFATI — care, linked to every home",
  },
  description:
    "careLINK links families to vetted nurses, caregivers and therapists for care at home — and gives care professionals steady, fairly-paid work. Built for Nigeria.",
  keywords: [
    "home care Nigeria",
    "hire a nurse",
    "caregiver",
    "physiotherapist at home",
    "healthcare jobs Nigeria",
    "RAFFATI",
    "careLINK",
  ],
  authors: [{ name: "RAFFATI Healthcare" }],
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: "careLINK by RAFFATI",
    title: "careLINK — care, linked to every home",
    description:
      "Vetted nurses, caregivers and therapists, matched to the home that needs them.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
