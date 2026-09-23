'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Receipt,
  Users,
  Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';

interface AnalyticsData {
  totalSpent: number;
  totalReceived: number;
  transactionCount: number;
  spendingByCategory: { name: string; amount: number; color: string }[];
  topRecipients: { name: string; amount: number; count: number }[];
  dailyTransactions: { date: string; sent: number; received: number }[];
  balanceTrend: { date: string; balance: number }[];
}

const periods = [
  { value: '7d', label: '7j' },
  { value: '30d', label: '30j' },
  { value: '90d', label: '90j' },
];

const SPENDING_COLORS = ['#0D5C63', '#14888F', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#EC4899'];

export default function AnalyticsScreen() {
  const { user, navigateTo } = useAppStore();
  const { t } = useTranslation();
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchData();
    else setLoading(false);
  }, [user?.id, period]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?userId=${user.id}&period=${period}`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Mes finances</h1>
      </div>

      <div className="flex gap-2 px-4 mb-4">
        {periods.map((p) => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              period === p.value ? 'bg-[#0D5C63] text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-4">
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : data ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-border">
                <CardContent className="p-3 text-center">
                  <TrendingUp className="h-4 w-4 text-red-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">${data.totalSpent.toFixed(2)}</p>
                  <p className="text-[9px] text-muted-foreground">Dépensé</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-3 text-center">
                  <TrendingDown className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">${data.totalReceived.toFixed(2)}</p>
                  <p className="text-[9px] text-muted-foreground">Reçu</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-3 text-center">
                  <Receipt className="h-4 w-4 text-[#0D5C63] mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{data.transactionCount}</p>
                  <p className="text-[9px] text-muted-foreground">Transactions</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dépenses par catégorie</p>
                {data.spendingByCategory.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex h-3 rounded-full overflow-hidden">
                      {data.spendingByCategory.map((cat, idx) => {
                        const total = data.spendingByCategory.reduce((s, c) => s + c.amount, 0);
                        const pct = total > 0 ? (cat.amount / total) * 100 : 0;
                        return (
                          <div key={cat.name} style={{ width: `${pct}%`, backgroundColor: cat.color || SPENDING_COLORS[idx % SPENDING_COLORS.length] }} />
                        );
                      })}
                    </div>
                    <div className="space-y-1.5">
                      {data.spendingByCategory.map((cat, idx) => (
                        <div key={cat.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color || SPENDING_COLORS[idx % SPENDING_COLORS.length] }} />
                            <span className="text-foreground">{cat.name}</span>
                          </div>
                          <span className="font-medium">${cat.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucune donnée</p>
                )}
              </CardContent>
            </Card>

            {data.topRecipients.length > 0 && (
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top destinataires</p>
                  <div className="space-y-2">
                    {data.topRecipients.map((r, idx) => (
                      <div key={r.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground w-4">{idx + 1}.</span>
                          <span className="text-foreground">{r.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${r.amount.toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground">{r.count} tx</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.dailyTransactions.length > 0 && (
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Transactions quotidiennes</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.dailyTransactions}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Bar dataKey="sent" name="Envoyé" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="received" name="Reçu" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {data.balanceTrend.length > 0 && (
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Évolution du solde</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.balanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Line type="monotone" dataKey="balance" name="Solde" stroke="#0D5C63" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
