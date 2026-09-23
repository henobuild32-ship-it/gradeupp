'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  User,
  Phone,
  DollarSign,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  phone: string;
  lastAmount: number;
  lastCurrency: string;
  lastDate: string;
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function ContactPayScreen() {
  const { user, navigateTo } = useAppStore();
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user?.id) fetchContacts();
    else setLoading(false);
  }, [user?.id]);

  async function fetchContacts() {
    try {
      const res = await fetch(`/api/contacts/recent?userId=${user.id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setContacts(data.contacts ?? []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  function handleSelect(contact: Contact) {
    navigateTo('send', { payRecipientId: contact.id });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigateTo('home')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Paiement par contact</h1>
      </div>

      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un contact..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9 h-11" />
        </div>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">Aucun contact récent</p>
              <p className="text-sm text-muted-foreground text-center">
                {search ? 'Aucun résultat pour votre recherche' : 'Effectuez des transactions pour voir vos contacts'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {filtered.map((contact, idx) => (
              <motion.button
                key={contact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => handleSelect(contact)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-[#0D5C63]/20 hover:shadow-sm transition-all active:scale-[0.98] text-left"
              >
                <div className="w-10 h-10 rounded-full bg-[#0D5C63]/10 text-[#0D5C63] flex items-center justify-center text-sm font-bold shrink-0">
                  {getInitials(contact.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <Phone className="h-3 w-3" />
                    <span>{contact.phone}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(contact.lastDate)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    {contact.lastCurrency === 'FC' ? '' : '$'}{contact.lastAmount.toFixed(2)} {contact.lastCurrency === 'FC' ? 'FC' : ''}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
