"use client";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Payment } from "@/lib/types";
import { lastMonths, money, monthKey, monthLabel } from "@/lib/format";

const COLORS = ["#e87722", "#1a1a2e", "#d45f1a", "#6e6e73", "#f2a66b", "#3a3a5e", "#b8b8bd", "#8a4210"];
const short = (n: number) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

export function MonthlyChart({ payments, currency }: { payments: Payment[]; currency: string }) {
  const data = lastMonths(6).map((k) => {
    const inMonth = payments.filter((p) => monthKey(p.dueDate) === k && p.status === "paid");
    return {
      month: monthLabel(k),
      Received: inMonth.filter((p) => p.type === "incoming").reduce((a, p) => a + p.amount, 0),
      Paid: inMonth.filter((p) => p.type === "outgoing").reduce((a, p) => a + p.amount, 0),
    };
  });
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={short} width={48} />
        <Tooltip formatter={(v) => money(Number(v), currency)} cursor={{ fill: "rgba(232,119,34,0.06)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Received" fill="#e87722" radius={[6, 6, 0, 0]} />
        <Bar dataKey="Paid" fill="#1a1a2e" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryPie({ payments, currency }: { payments: Payment[]; currency: string }) {
  const map = new Map<string, number>();
  payments.forEach((p) => map.set(p.category, (map.get(p.category) ?? 0) + p.amount));
  const data = [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => money(Number(v), currency)} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RepBarChart({ data, currency }: { data: { name: string; Collected: number; Target: number }[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" barGap={2}>
        <CartesianGrid horizontal={false} stroke="rgba(0,0,0,0.06)" />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} tickFormatter={short} />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={100} />
        <Tooltip formatter={(v) => money(Number(v), currency)} cursor={{ fill: "rgba(232,119,34,0.06)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Collected" fill="#e87722" radius={[0, 6, 6, 0]} />
        <Bar dataKey="Target" fill="rgba(26,26,46,0.15)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
