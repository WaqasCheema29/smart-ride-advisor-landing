import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Ride Advisor — Drive with clarity",
  description:
    "Smart Ride Advisor helps Android drivers in Pakistan understand pickup distance, fuel costs and effective fare rates.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
