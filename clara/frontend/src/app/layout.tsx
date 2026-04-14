import type { Metadata } from "next";
import { Nunito, DM_Serif_Display } from "next/font/google";
import "@/styles/globals.css";
import { ConditionalShell } from "@/components/ui/ConditionalShell";
import { AlertNotification } from "@/components/ui/AlertNotification";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-dm-serif",
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clara — Your Caring Companion",
  description: "Clara is a compassionate AI companion designed for dementia care — always here for you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${dmSerif.variable}`}>
      <body className="bg-clara-neutral-bg text-clara-neutral-text antialiased min-h-screen">
        <AlertNotification />
        <ConditionalShell>{children}</ConditionalShell>
      </body>
    </html>
  );
}
