'use client';

import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

interface TransactionReceiptProps {
  transaction: {
    id: string;
    status: string;
  };
  userName?: string;
}

export function TransactionReceipt({ transaction }: TransactionReceiptProps) {
  const navigateTo = useAppStore((state) => state.navigateTo);

  if (transaction.status !== 'completed') return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 gap-1.5 text-xs"
      onClick={() => navigateTo('receipt', { transactionId: transaction.id })}
      aria-label="Ouvrir le reçu de cette transaction"
    >
      <FileText className="h-3.5 w-3.5" />
      Reçu
    </Button>
  );
}
