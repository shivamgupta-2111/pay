import type { Metadata } from "next";
import "./globals.css";
import { LOGO_SRC } from "@/components/Logo";

export const metadata: Metadata = {
  title: "PayTrack – Payment Tracker",
  description: "Role-based payment tracker for CEO, Admin and Sales Reps",
  icons: { icon: LOGO_SRC, apple: LOGO_SRC },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
