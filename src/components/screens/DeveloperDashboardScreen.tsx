'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Terminal, BookOpen, Beaker, Puzzle,
  Loader2, Check, Copy, ChevronDown, ChevronRight,
  Globe, Shield, Zap, CreditCard, Smartphone, Gamepad2,
  Code2, Database, Server, Key, Wallet, ArrowRightLeft,
  QrCode, Banknote, Repeat,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

type TabId = 'docs' | 'sandbox' | 'integration';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'docs', label: 'Documentation', icon: BookOpen },
  { id: 'sandbox', label: 'Sandbox', icon: Beaker },
  { id: 'integration', label: 'Intégration', icon: Puzzle },
];

const LANGUAGES = [
  { id: 'js', label: 'JavaScript (Node.js)', icon: Code2 },
  { id: 'python', label: 'Python', icon: Code2 },
  { id: 'php', label: 'PHP', icon: Code2 },
  { id: 'java', label: 'Java', icon: Code2 },
  { id: 'kotlin', label: 'Kotlin (Android)', icon: Smartphone },
  { id: 'swift', label: 'Swift (iOS)', icon: Smartphone },
  { id: 'flutter', label: 'Flutter / Dart', icon: Code2 },
  { id: 'reactnative', label: 'React Native', icon: Code2 },
  { id: 'unity', label: 'Unity (C#)', icon: Gamepad2 },
  { id: 'unreal', label: 'Unreal Engine (C++)', icon: Gamepad2 },
];

const FEATURES = [
  { id: 'payment', label: 'Recevoir des paiements', icon: Wallet, color: 'emerald' },
  { id: 'deposit', label: 'Dépôts', icon: Banknote, color: 'blue' },
  { id: 'transfer', label: 'Transferts', icon: ArrowRightLeft, color: 'purple' },
  { id: 'withdraw', label: 'Retraits', icon: Repeat, color: 'amber' },
  { id: 'qr', label: 'Paiement par QR Code', icon: QrCode, color: 'violet' },
  { id: 'card', label: 'Paiement par carte', icon: CreditCard, color: 'rose' },
];

// --- Code samples per language ---
const CODE_SAMPLES: Record<string, { label: string; code: string }[]> = {
  js: [
    { label: 'Initialisation', code: `const trait = require('trait-api')('sk_test_xxxxx')

// Mode sandbox activé par défaut` },
    { label: 'Recevoir un paiement', code: `const payment = await trait.payments.create({
  amount: 25000,
  currency: 'CDF',
  description: 'Paiement commande #123',
  customer: { email: 'client@email.com' }
})

console.log(payment.status) // 'processing'` },
    { label: 'Vérifier statut', code: `const status = await trait.payments.get('pay_abc123')
console.log(status.status) // 'completed' | 'failed'` },
    { label: 'Envoyer à un compte Trait', code: `const transfer = await trait.transfers.create({
  amount: 50000,
  currency: 'CDF',
  recipientPhone: '+243901234567', // numéro enregistré dans Trait
  description: 'Paiement commande #123'
})` },
  ],
  python: [
    { label: 'Initialisation', code: `import trait

client = trait.Client(
    api_key="sk_test_xxxxx",
    sandbox=True
)` },
    { label: 'Recevoir un paiement', code: `payment = client.payments.create({
    "amount": 25000,
    "currency": "CDF",
    "description": "Paiement commande #123",
    "customer": {"email": "client@email.com"}
})

print(payment.status)  # 'processing'` },
    { label: 'Vérifier statut', code: `status = client.payments.get("pay_abc123")
print(status.status)  # 'completed' | 'failed'` },
    { label: 'Envoyer à un compte Trait', code: `transfer = client.transfers.create({
    "amount": 50000,
    "currency": "CDF",
    "recipientPhone": "+243901234567",  # numéro enregistré dans Trait
    "description": "Paiement commande #123"
})` },
  ],
  php: [
    { label: 'Initialisation', code: `<?php
require_once 'vendor/autoload.php';

$trait = new Trait\\Client('sk_test_xxxxx');
$trait->setSandbox(true);` },
    { label: 'Recevoir un paiement', code: `$payment = $trait->payments->create([
  'amount' => 25000,
  'currency' => 'CDF',
  'description' => 'Paiement commande #123',
  'customer' => ['email' => 'client@email.com']
]);

echo $payment['status']; // 'processing'` },
    { label: 'Webhook notification', code: `$payload = file_get_contents('php://input');
$event = $trait->webhooks->parse($payload);

if ($event['type'] === 'payment.completed') {
  // Traiter le paiement réussi
}` },
  ],
  java: [
    { label: 'Initialisation', code: `import com.trait.TraitClient;

TraitClient client = new TraitClient(
    "sk_test_xxxxx"
);
client.setSandbox(true);` },
    { label: 'Recevoir un paiement', code: `Payment payment = client.payments.create(
    new PaymentRequest()
        .setAmount(25000)
        .setCurrency("CDF")
        .setDescription("Paiement commande #123")
);

System.out.println(payment.getStatus());` },
  ],
  kotlin: [
    { label: 'Initialisation', code: `val client = TraitClient(
    apiKey = "sk_test_xxxxx",
    sandbox = true
)` },
    { label: 'Recevoir un paiement', code: `val payment = client.payments.create(
    amount = 25000,
    currency = "CDF",
    description = "Paiement commande #123"
)

println(payment.status)` },
  ],
  swift: [
    { label: 'Initialisation', code: `import TraitSDK

let client = TraitClient(
    apiKey: "sk_test_xxxxx",
    sandbox: true
)` },
    { label: 'Recevoir un paiement', code: `let payment = try await client.payments.create(
    amount: 25000,
    currency: "CDF",
    description: "Paiement commande #123"
)

print(payment.status)` },
  ],
  flutter: [
    { label: 'Initialisation', code: `import 'package:trait_flutter/trait.dart';

final client = TraitClient(
  apiKey: 'sk_test_xxxxx',
  sandbox: true,
);` },
    { label: 'Recevoir un paiement', code: `final payment = await client.payments.create(
  amount: 25000,
  currency: 'CDF',
  description: 'Paiement commande #123',
);

print(payment.status);` },
  ],
  reactnative: [
    { label: 'Initialisation', code: `import Trait from 'trait-react-native';

const client = new Trait({
  apiKey: 'sk_test_xxxxx',
  sandbox: true,
});` },
    { label: 'Recevoir un paiement', code: `const payment = await client.payments.create({
  amount: 25000,
  currency: 'CDF',
  description: 'Paiement commande #123',
});` },
  ],
  unity: [
    { label: 'Initialisation', code: `using TraitSDK;

var client = new TraitClient("sk_test_xxxxx");
client.SetSandbox(true);` },
    { label: 'Recevoir un paiement (jeu)', code: `Payment payment = await client.Payments.CreateAsync(
    amount: 25000,
    currency: "CDF",
    description: "Achat pack premium"
);

if (payment.Status == "completed") {
    // Débloquer l'achat dans le jeu
    UnlockItem("premium_pack");
}` },
  ],
  unreal: [
    { label: 'Initialisation', code: `#include "TraitSDK.h"

UTraitClient* Client = NewObject<UTraitClient>();
Client->Initialize("sk_test_xxxxx");
Client->SetSandbox(true);` },
    { label: 'Recevoir un paiement (jeu)', code: `FString PaymentId;
Client->CreatePayment(25000, "CDF",
    "Achat skin légendaire", PaymentId);

// Webhook: débloquer l'item
Client->OnPaymentCompleted.AddLambda([&](FString Id) {
    UnlockSkin("legendary_skin");
});` },
  ],
};

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copié !');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md bg-slate-700/50 hover:bg-slate-600 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
      <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs leading-relaxed font-mono overflow-x-auto border border-slate-800">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function LanguageTabs({ selected, onChange }: { selected: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.id}
          onClick={() => onChange(lang.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            selected === lang.id
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <lang.icon className="size-3.5" />
          {lang.label}
        </button>
      ))}
    </div>
  );
}

export default function DeveloperDashboardScreen() {
  const { navigateTo, goBack } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabId>('docs');
  const [selectedLang, setSelectedLang] = useState('js');
  const [expandedSection, setExpandedSection] = useState<string | null>('init');

  const codeSamples = CODE_SAMPLES[selectedLang] || CODE_SAMPLES.js;

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Terminal className="size-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-lg font-semibold text-foreground">Espace Développeur</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
            onClick={() => navigateTo('integration-guide')}
          >
            <BookOpen className="size-3.5" />
            Guide
          </Button>
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex px-4 gap-1 pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-6 pb-16 max-w-4xl mx-auto space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'docs' && (
            <motion.div
              key="docs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <Card className="border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50 to-slate-50 dark:from-emerald-950/30 dark:to-slate-900/50">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                      <BookOpen className="size-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Documentation API Trait</h2>
                      <p className="text-xs text-muted-foreground">Intégrez facilement les paiements et services financiers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sections */}
              {[
                { id: 'init', title: '1. Authentification', content: (
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>Chaque requête API doit inclure votre clé secrète dans l&apos;en-tête <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">Authorization: Bearer sk_live_xxx</code>.</p>
                    <p>Les clés publiques (<code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">pk_</code>) sont utilisées côté client pour sécuriser les transactions sans exposer votre clé secrète.</p>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                      <p className="font-semibold text-foreground text-xs">Environnements</p>
                      <div className="space-y-1 text-xs">
                        <p><span className="font-mono text-emerald-600">sandbox.trait.cd</span> — Tests (transactions simulées)</p>
                        <p><span className="font-mono text-blue-600">api.trait.cd</span> — Production (transactions réelles)</p>
                      </div>
                    </div>
                  </div>
                )},
                { id: 'endpoints', title: '2. Endpoints principaux', content: (
                  <div className="space-y-2 text-sm">
                    {[
                      { method: 'POST', path: '/v1/payments', desc: 'Créer un paiement', color: 'text-emerald-600' },
                      { method: 'GET', path: '/v1/payments/:id', desc: 'Récupérer un paiement', color: 'text-blue-600' },
                      { method: 'POST', path: '/v1/withdrawals', desc: 'Effectuer un retrait', color: 'text-emerald-600' },
                      { method: 'POST', path: '/v1/deposits', desc: 'Initier un dépôt', color: 'text-emerald-600' },
                      { method: 'POST', path: '/v1/transfers', desc: 'Transfert international', color: 'text-emerald-600' },
                      { method: 'POST', path: '/v1/transfers/qr', desc: 'Paiement QR', color: 'text-emerald-600' },
                      { method: 'GET', path: '/v1/balance', desc: 'Consulter le solde', color: 'text-blue-600' },
                      { method: 'POST', path: '/v1/webhooks', desc: 'Configurer un webhook', color: 'text-purple-600' },
                    ].map((ep) => (
                      <div key={ep.path} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 border border-border/50">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${ep.method === 'POST' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                          {ep.method}
                        </span>
                        <code className="text-xs font-mono text-foreground flex-1">{ep.path}</code>
                        <span className="text-xs text-muted-foreground">{ep.desc}</span>
                      </div>
                    ))}
                  </div>
                )},
                { id: 'webhook', title: '3. Webhooks', content: (
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>Recevez des notifications en temps réel sur les événements de paiement via vos webhooks.</p>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
                      <p className="text-xs font-semibold text-foreground mb-2">Événements disponibles :</p>
                      <ul className="space-y-1 text-xs">
                        <li><code className="text-emerald-600 font-mono">payment.completed</code> — Paiement réussi</li>
                        <li><code className="text-amber-600 font-mono">payment.failed</code> — Paiement échoué</li>
                        <li><code className="text-blue-600 font-mono">withdrawal.completed</code> — Retrait effectué</li>
                        <li><code className="text-purple-600 font-mono">transfer.received</code> — Transfert reçu</li>
                      </ul>
                    </div>
                  </div>
                )},
              ].map((section) => (
                <Card key={section.id} className="border-border/70">
                  <CardContent className="p-5">
                    <button
                      onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h3 className="text-sm font-bold text-foreground">{section.title}</h3>
                      {expandedSection === section.id ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                    </button>
                    {expandedSection === section.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 pt-4 border-t border-border/50">
                        {section.content}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}

          {activeTab === 'sandbox' && (
            <motion.div
              key="sandbox"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Test Credentials */}
              <Card className="border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50 to-slate-50 dark:from-amber-950/30 dark:to-slate-900/50">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-600 flex items-center justify-center shrink-0">
                      <Key className="size-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Clés Sandbox</h2>
                      <p className="text-xs text-muted-foreground">Utilisez ces identifiants pour vos tests</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-border/50">
                      <span className="text-xs font-semibold text-muted-foreground w-28 shrink-0">Clé publique</span>
                      <code className="text-xs font-mono text-foreground flex-1 truncate">pk_test_a1b2c3d4e5f6g7h8i9j0k1l2</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { navigator.clipboard.writeText('pk_test_a1b2c3d4e5f6g7h8i9j0k1l2'); toast.success('Copié !'); }}>
                        <Copy className="size-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-border/50">
                      <span className="text-xs font-semibold text-muted-foreground w-28 shrink-0">Clé secrète</span>
                      <code className="text-xs font-mono text-foreground flex-1 truncate">sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { navigator.clipboard.writeText('sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'); toast.success('Copié !'); }}>
                        <Copy className="size-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground bg-white dark:bg-slate-900 p-3 rounded-xl border border-border/50 flex items-start gap-2">
                    <Shield className="size-4 shrink-0 mt-0.5 text-amber-500" />
                    <span>Les transactions sandbox utilisent des fonds fictifs. Activez le mode <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs font-mono">sandbox: true</code> dans votre SDK.</span>
                  </div>
                </CardContent>
              </Card>

              {/* Code Samples */}
              <Card className="border-border/70">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                      <Code2 className="size-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Exemples par langage</h2>
                      <p className="text-xs text-muted-foreground">Choisissez votre plateforme</p>
                    </div>
                  </div>

                  <LanguageTabs selected={selectedLang} onChange={setSelectedLang} />

                  <div className="space-y-3">
                    {codeSamples.map((sample, i) => (
                      <div key={i}>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">{sample.label}</p>
                        <CodeBlock code={sample.code} language={selectedLang} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sandbox test cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { number: '4242 4242 4242 4242', label: 'Visa (succès)', color: 'text-blue-600' },
                  { number: '4000 0000 0000 0002', label: 'Visa (échec)', color: 'text-red-600' },
                  { number: '5555 5555 5555 4444', label: 'Mastercard (succès)', color: 'text-amber-600' },
                ].map((card) => (
                  <Card key={card.number} className="border-border/60">
                    <CardContent className="p-3.5 flex flex-col gap-1">
                      <code className={`text-xs font-mono font-bold ${card.color}`}>{card.number}</code>
                      <span className="text-[10px] text-muted-foreground">{card.label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'integration' && (
            <motion.div
              key="integration"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Hero */}
              <Card className="border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40">
                    <Puzzle className="size-7 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Intégrer TRAIT à votre application</h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Choisissez les fonctionnalités que vous souhaitez intégrer et suivez le guide pas à pas
                  </p>
                </CardContent>
              </Card>

              {/* Feature cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURES.map((feature) => {
                  const colorMap: Record<string, { bg: string; text: string; border: string; btn: string }> = {
                    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/40', btn: 'bg-emerald-600 hover:bg-emerald-700' },
                    blue: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800/40', btn: 'bg-blue-600 hover:bg-blue-700' },
                    purple: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800/40', btn: 'bg-purple-600 hover:bg-purple-700' },
                    amber: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800/40', btn: 'bg-amber-600 hover:bg-amber-700' },
                    violet: { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800/40', btn: 'bg-violet-600 hover:bg-violet-700' },
                    rose: { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800/40', btn: 'bg-rose-600 hover:bg-rose-700' },
                  };
                  const c = colorMap[feature.color];
                  return (
                    <Card key={feature.id} className={`border ${c.border}`}>
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                          <feature.icon className={`size-5 ${c.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-foreground">{feature.label}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {feature.id === 'payment' && 'Recevez des paiements Wallet Trait entre comptes inscrits'}
                            {feature.id === 'deposit' && 'Permettez à vos utilisateurs de déposer des fonds'}
                            {feature.id === 'transfer' && 'Envoyez vers le numéro enregistré d’un utilisateur Trait, dans tous les pays'}
                            {feature.id === 'withdraw' && 'Les retraits sont demandés auprès d’un agent Trait validé'}
                            {feature.id === 'qr' && 'Générez et scannez des QR codes de paiement'}
                            {feature.id === 'card' && 'Émettez et gérez des cartes virtuelles TRAIT'}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" className={`h-7 text-xs text-white ${c.btn} rounded-lg`}
                              onClick={() => { setActiveTab('sandbox'); setSelectedLang('js'); toast.success(`Guide ${feature.label} — allez dans Sandbox`); }}>
                              Voir le code
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Quick Integration Guide */}
              <Card className="border-border/70">
                <CardContent className="p-5 space-y-4">
                  <h3 className="text-sm font-bold text-foreground">Guide d&apos;intégration rapide</h3>
                  <div className="space-y-3">
                    {[
                      { step: '1', title: 'Créez votre compte développeur', desc: 'Inscrivez-vous via le formulaire Espace Développeur et attendez la validation de votre demande.' },
                      { step: '2', title: 'Obtenez vos clés API', desc: 'Une fois approuvé, générez vos clés publiques et secrètes depuis votre tableau de bord développeur.' },
                      { step: '3', title: 'Testez en sandbox', desc: 'Utilisez les clés de test et les cartes factices pour valider vos intégrations sans risque.' },
                      { step: '4', title: 'Configurez vos webhooks', desc: 'Recevez les notifications de paiement en temps réel sur votre serveur.' },
                      { step: '5', title: 'Passez en production', desc: 'Remplacez vos clés de test par les clés live et basculez l\'URL de l\'API.' },
                    ].map((item) => (
                      <div key={item.step} className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{item.step}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
