import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import "@/styles/globals.css";
import { ConditionalShell } from "@/components/ui/ConditionalShell";
import { AlertNotification } from "@/components/ui/AlertNotification";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clara — Your Caring AI Companion",
  description: "Clara is a compassionate AI companion designed for dementia care — always here for you with a modern, intuitive experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable} dark`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className="bg-clara-bg text-clara-text-primary antialiased min-h-screen selection:bg-clara-primary/30 selection:text-white">
        <AlertNotification />
        <ConditionalShell>{children}</ConditionalShell>
      </body>
    </html>
  );
}
