'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Check, X, Eye, FileText, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface KycUser {
  id: string
  name: string
  phone: string
  email: string | null
  kycStatus: string
  kycSubmittedAt: string | null
  kycDocumentType: string | null
  kycDocumentUrl: string | null
  kycSelfieUrl: string | null
  kycData: string | null
}

export default function AdminKycScreen() {
  const { goBack, admin } = useAppStore()
  const adminHeaders: Record<string, string> = admin?.token ? { 'Authorization': `Bearer ${admin.token}` } : {};
  const [users, setUsers] = useState<KycUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'verified' | 'rejected'>('pending')
  const [selectedUser, setSelectedUser] = useState<KycUser | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchKycUsers()
  }, [filter])

  const fetchKycUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/kyc?status=${filter}`, { headers: adminHeaders })
      const data = await res.json()
      if (data.success) setUsers(data.users)
    } catch {
      toast.error('Erreur de chargement')
    }
    setLoading(false)
  }

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({
          userId: selectedUser.id,
          action,
          rejectReason: action === 'reject' ? rejectReason : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        setSelectedUser(null)
        setRejectReason('')
        fetchKycUsers()
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error('Erreur serveur')
    }
    setActionLoading(false)
  }

  const tabs = [
    { id: 'pending' as const, label: 'En attente', count: users.length },
    { id: 'verified' as const, label: 'Approuvé' },
    { id: 'rejected' as const, label: 'Refusé' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={goBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Validation KYC</h1>
      </div>

      <div className="px-4 mb-4">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === tab.id ? 'bg-[#0D5C63] text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-card border">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">📋</span>
            <p className="text-base font-medium text-foreground mb-1">Aucune demande KYC</p>
            <p className="text-sm text-muted-foreground">
              {filter === 'pending' ? 'Aucune demande en attente' : `Aucun KYC ${filter === 'verified' ? 'approuvé' : 'refusé'}`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-4 rounded-xl bg-card border cursor-pointer hover:bg-accent/50 active:scale-[0.98] transition-all"
                onClick={() => setSelectedUser(u)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#0D5C63]/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-[#0D5C63]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{u.name}</p>
                    <p className="text-sm text-muted-foreground">{u.phone}</p>
                    {u.kycSubmittedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Soumis: {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(u.kycSubmittedAt))}
                      </p>
                    )}
                  </div>
                  <Badge className={filter === 'pending' ? 'bg-amber-100 text-amber-700' : filter === 'verified' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {u.kycDocumentType || 'Document'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => { setSelectedUser(null); setRejectReason('') }}>
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Vérification KYC</h3>
              <button onClick={() => { setSelectedUser(null); setRejectReason('') }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Nom</p>
                <p className="font-medium">{selectedUser.name}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Téléphone</p>
                <p className="font-medium">{selectedUser.phone}</p>
              </div>
              {selectedUser.email && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Type de document</p>
                <p className="font-medium">{selectedUser.kycDocumentType || 'Non spécifié'}</p>
              </div>

              {selectedUser.kycDocumentUrl && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Document d&apos;identité
                  </p>
                  <div className="rounded-xl overflow-hidden border bg-gray-50">
                    <img src={selectedUser.kycDocumentUrl} alt="Document KYC" className="w-full max-h-64 object-contain" />
                  </div>
                </div>
              )}

              {selectedUser.kycSelfieUrl && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Selfie
                  </p>
                  <div className="rounded-xl overflow-hidden border bg-gray-50">
                    <img src={selectedUser.kycSelfieUrl} alt="Selfie KYC" className="w-full max-h-64 object-contain" />
                  </div>
                </div>
              )}
            </div>

            {filter === 'pending' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Motif du refus (optionnel)</label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Documents non conformes..."
                    className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:border-red-500 outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => handleAction('reject')}
                    disabled={actionLoading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Refuser
                  </Button>
                  <Button
                    className="flex-1 h-12 rounded-xl bg-[#0D5C63] hover:bg-[#083A3E] text-white"
                    onClick={() => handleAction('approve')}
                    disabled={actionLoading}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approuver
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
