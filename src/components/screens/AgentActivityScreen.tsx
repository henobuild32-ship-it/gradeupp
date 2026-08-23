'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Activity, ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';

interface ActivityItem {
  id: string;
  type: string;
  amount: number;
  fee: number;
  currency: string;
  status: string;
  clientName: string | null;
  clientPhone: string;
  createdAt: string;
}

function fmtCur(amount: number, currency: string) {
  return currency === 'FC' ? `${amount.toFixed(2)} FC` : `$${amount.toFixed(2)}`;
}

export default function AgentActivityScreen() {
  const { goBack, user } = useAppStore();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/agent/activity?agentId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setActivities(data.activity || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-violet-600" />
            <h1 className="text-lg font-semibold">Mon activite</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 pb-8">
        {loading ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </CardContent>
          </Card>
        ) : activities.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-violet-500" />
              </div>
              <p className="text-lg font-semibold text-foreground">Aucune activite</p>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Les depots et validations de retrait apparaitront ici
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activities.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-border">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      item.type === 'deposit' ? 'bg-emerald-50' : 'bg-amber-50'
                    }`}>
                      {item.type === 'deposit' ? (
                        <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ArrowUpCircle className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {item.type === 'deposit' ? 'Depot' : 'Retrait'}
                        </p>
                        <Badge variant={item.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                          {item.status === 'completed' ? 'Effectue' : item.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.clientName || item.clientPhone || 'Client'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${item.type === 'deposit' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {item.type === 'deposit' ? '+' : '-'}{fmtCur(item.amount, item.currency)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
