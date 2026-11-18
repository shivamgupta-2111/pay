import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayTrack – Payment Tracker",
  description: "Role-based payment tracker for CEO, Admin and Sales Reps",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
