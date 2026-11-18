"use client";
import PortalShell from "@/components/PortalShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PortalShell role="ceo">{children}</PortalShell>;
}
