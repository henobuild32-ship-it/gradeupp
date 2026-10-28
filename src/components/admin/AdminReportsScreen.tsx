'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Flag, Loader2, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

type ReportStatus = 'new' | 'reviewing' | 'info_requested' | 'pending' | 'resolved' | 'rejected' | 'closed'
type Report = {
  id: string
  targetType: string
  targetId: string
  reason: string
  status: ReportStatus
  adminNote?: string | null
  createdAt: string
  reporter: { id: string; name?: string | null; pseudo?: string | null; phone?: string | null }
  reviewer?: { name: string; username: string } | null
  reviewedAt?: string | null
  target?: any
}

const statuses: { value: ReportStatus; label: string }[] = [
  { value: 'new', label: 'Nouveau' },
  { value: 'reviewing', label: 'En examen' },
  { value: 'info_requested', label: 'Informations demandées' },
  { value: 'pending', label: 'En attente' },
  { value: 'resolved', label: 'Résolu' },
  { value: 'rejected', label: 'Rejeté' },
  { value: 'closed', label: 'Clôturé' },
]

const types = [
  ['all', 'Tous les types'], ['seller', 'Vendeur'], ['user', 'Utilisateur'],
  ['product', 'Produit'], ['order', 'Commande'], ['offer', 'Offre Troc'], ['message', 'Message'],
]

function statusLabel(value: string) {
  return statuses.find((status) => status.value === value)?.label || value
}

function targetLabel(report: Report) {
  if (!report.target) return `${report.targetType} · ${report.targetId}`
  return report.target.name || report.target.title || report.target.product?.name || `${report.targetType} · ${report.targetId}`
}

export default function AdminReportsScreen() {
  const { navigateTo } = useAppStore()
  const [reports, setReports] = useState<Report[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [nextStatus, setNextStatus] = useState<ReportStatus>('reviewing')
  const [adminNote, setAdminNote] = useState('')

  const selected = reports.find((report) => report.id === selectedId) || null

  const loadReports = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30', status: statusFilter, type: typeFilter })
      if (search) params.set('search', search)
      const response = await fetch(`/api/admin/reports?${params}`, { credentials: 'include' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) throw new Error(data.message || 'Erreur de chargement')
      setReports(data.reports || [])
      setTotalPages(Math.max(1, data.totalPages || 1))
      setStatusCounts(data.statusCounts || {})
      setSelectedId((current) => current && !(data.reports || []).some((report: Report) => report.id === current) ? null : current)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Impossible de charger les signalements.')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, typeFilter, search])

  useEffect(() => { void loadReports() }, [loadReports])

  useEffect(() => {
    if (!selected) return
    setNextStatus(selected.status === 'new' ? 'reviewing' : selected.status)
    setAdminNote(selected.adminNote || '')
  }, [selected])

  async function updateReport() {
    if (!selected || saving) return
    if (nextStatus === 'info_requested' && !adminNote.trim()) {
      toast.error('Expliquez les informations à fournir dans la note interne.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: selected.id, status: nextStatus, adminNote }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) throw new Error(data.message || 'Mise à jour impossible')
      toast.success('Signalement mis à jour et action journalisée.')
      await loadReports()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mise à jour impossible')
    } finally {
      setSaving(false)
    }
  }

  const label = (value: string) => types.find(([key]) => key === value)?.[1] || value

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl bg-background px-4 pb-10 pt-5 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Retour à l'administration" onClick={() => navigateTo('admin-dashboard')}><ArrowLeft className="size-5" /></Button>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Administration Trait Fintech</p>
            <h1 className="text-xl font-semibold sm:text-2xl">Signalements</h1>
          </div>
        </div>
        <Button variant="outline" onClick={() => void loadReports()} disabled={loading} aria-label="Actualiser les signalements">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          <span className="ml-2 hidden sm:inline">Actualiser</span>
        </Button>
      </header>

      <section className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['new', 'Nouveaux'], ['reviewing', 'En examen'], ['info_requested', 'Infos demandées'], ['pending', 'En attente'],
        ].map(([key, title]) => (
          <Card key={key} className="border-border"><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="mt-1 text-xl font-semibold">{statusCounts[key] || 0}</p>
          </CardContent></Card>
        ))}
      </section>

      <Card className="mb-5 border-border"><CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_190px_190px_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="report-search">Recherche</Label>
          <div className="flex gap-2"><Input id="report-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setPage(1); setSearch(query.trim()) } }} placeholder="Référence, motif, déclarant" />
            <Button aria-label="Rechercher" onClick={() => { setPage(1); setSearch(query.trim()) }}><Search className="size-4" /></Button></div>
        </div>
        <div className="space-y-2"><Label>Statut</Label><Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous les statuts</SelectItem>{statuses.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Type</Label><Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{types.map(([value, title]) => <SelectItem key={value} value={value}>{title}</SelectItem>)}</SelectContent></Select></div>
        <Button variant="outline" onClick={() => { setQuery(''); setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setPage(1) }}>Effacer</Button>
      </CardContent></Card>

      {loadError && <div role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{loadError}<Button variant="outline" size="sm" className="ml-3" onClick={() => void loadReports()}>Réessayer</Button></div>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <section aria-label="Liste des signalements" className="space-y-3">
          {loading && reports.length === 0 ? <Card><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Chargement des signalements…</CardContent></Card> :
            reports.length === 0 ? <Card><CardContent className="p-8 text-center"><Flag className="mx-auto mb-3 size-7 text-muted-foreground" /><p className="font-medium">Aucun signalement trouvé</p><p className="mt-1 text-sm text-muted-foreground">Modifiez les filtres ou actualisez la liste.</p></CardContent></Card> :
              reports.map((report) => (
                <button key={report.id} type="button" onClick={() => setSelectedId(report.id)} className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedId === report.id ? 'border-primary bg-primary/[0.04]' : 'border-border bg-card hover:bg-muted/40'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{label(report.targetType)} · {targetLabel(report)}</span><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{statusLabel(report.status)}</span></div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{report.reason}</p>
                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>Par {report.reporter.name || report.reporter.pseudo || 'Utilisateur'} · {report.reporter.phone || '—'}</span><time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString('fr-FR')}</time></div>
                </button>
              ))}
          <div className="flex items-center justify-between py-2 text-sm"><span className="text-muted-foreground">Page {page} sur {totalPages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Précédent</Button><Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>Suivant</Button></div></div>
        </section>

        <section aria-label="Détail et traitement du signalement">
          {selected ? (
            <Card className="border-border lg:sticky lg:top-4"><CardContent className="space-y-5 p-4 sm:p-5">
              <div><div className="flex items-center gap-2"><Flag className="size-4 text-primary" /><h2 className="font-semibold">Dossier {selected.id}</h2></div><p className="mt-2 text-sm text-muted-foreground">Cible : {label(selected.targetType)} · {targetLabel(selected)}</p></div>
              <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motif signalé</p><p className="mt-2 whitespace-pre-wrap text-sm">{selected.reason}</p></div>
              <div className="text-sm"><p className="font-medium">Déclarant</p><p className="text-muted-foreground">{selected.reporter.name || selected.reporter.pseudo || 'Utilisateur'} · {selected.reporter.phone || '—'}</p></div>
              {selected.target && <div className="rounded-xl border border-border p-3 text-sm"><p className="font-medium">Élément lié</p><pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words font-sans text-xs text-muted-foreground">{JSON.stringify(selected.target, null, 2)}</pre></div>}
              {selected.reviewer && <p className="text-xs text-muted-foreground">Dernier examen par {selected.reviewer.name} · {selected.reviewedAt ? new Date(selected.reviewedAt).toLocaleString('fr-FR') : '—'}</p>}
              <div className="space-y-2"><Label>État du dossier</Label><Select value={nextStatus} onValueChange={(value) => setNextStatus(value as ReportStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="report-note">Note interne / demande d’information</Label><textarea id="report-note" value={adminNote} onChange={(event) => setAdminNote(event.target.value.slice(0, 2000))} maxLength={2000} rows={4} className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Motif de décision ou informations demandées" /></div>
              <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" /> Toute mise à jour est enregistrée dans le journal d’audit. Un signalement seul ne suspend pas automatiquement le vendeur.</p>
              <Button className="w-full" onClick={() => void updateReport()} disabled={saving || nextStatus === 'info_requested' && !adminNote.trim()}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Enregistrer la décision</Button>
            </CardContent></Card>
          ) : <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Sélectionnez un signalement pour consulter le dossier.</CardContent></Card>}
        </section>
      </div>
    </main>
  )
}
