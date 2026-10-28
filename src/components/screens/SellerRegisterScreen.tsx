'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ArrowLeft, Store, Eye, EyeOff } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import Image from 'next/image'
import { CountrySelect } from '@/components/shared/CountrySelect'
import { normalizePhoneForCountry } from '@/lib/countries'

const businessTypes = [
  { value: 'vetements', label: 'Vêtements & Mode' },
  { value: 'electronique', label: 'Électronique' },
  { value: 'alimentation', label: 'Alimentation & Épicerie' },
  { value: 'services', label: 'Services (coiffure, réparation, etc.)' },
  { value: 'artisanat', label: 'Artisanat & Création' },
  { value: 'agriculture', label: 'Agriculture & Produits frais' },
  { value: 'immobilier', label: 'Immobilier & Logement' },
  { value: 'transport', label: 'Transport & Livraison' },
  { value: 'sante', label: 'Santé & Bien-être' },
  { value: 'education', label: 'Éducation & Formation' },
  { value: 'restauration', label: 'Restauration & Alimentation' },
  { value: 'technologie', label: 'Technologie & IT' },
  { value: 'autre', label: 'Autre' },
]

export default function SellerRegisterScreen() {
  const { setPhoneNumber, navigateTo } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    countryCode: '',
    phone: '',
    city: '',
    address: '',
    businessName: '',
    businessType: '',
    location: '',
    password: '',
    confirmPassword: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullPhone = normalizePhoneForCountry(formData.phone, formData.countryCode)

    if (!formData.name.trim()) {
      toast.error('Veuillez entrer votre nom complet')
      return
    }
    if (!formData.email.trim()) {
      toast.error('Veuillez entrer votre adresse email')
      return
    }
    if (!fullPhone) {
      toast.error('Veuillez entrer un numéro de téléphone valide')
      return
    }
    if (!formData.countryCode) {
      toast.error('Veuillez sélectionner votre pays')
      return
    }
    if (!formData.businessName.trim()) {
      toast.error('Veuillez entrer le nom de votre commerce')
      return
    }
    if (!formData.businessType) {
      toast.error('Veuillez sélectionner le type de produits')
      return
    }
    if (!formData.city.trim()) {
      toast.error('Veuillez entrer votre ville')
      return
    }
    if (!formData.location.trim()) {
      toast.error('Veuillez entrer votre localisation (marché/quartier)')
      return
    }
    if (formData.password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (!acceptTerms) {
      toast.error('Veuillez accepter les conditions d\'utilisation')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/seller/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: fullPhone,
          country: formData.countryCode,
          city: formData.city,
          address: formData.address.trim(),
          businessName: formData.businessName.trim(),
          businessType: formData.businessType,
          location: formData.location.trim(),
          password: formData.password,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setPhoneNumber(fullPhone)
        toast.success('Demande créée. Vérifiez votre adresse email pour confirmer vos informations.')
        navigateTo('auth-otp', { email: formData.email.trim(), mode: 'verify' })
      } else {
        toast.error(data.message || 'Erreur lors de l\'inscription')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#e5f3f1] via-background to-[#f5f7f7]">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center w-full max-w-5xl mx-auto px-4 sm:px-6 py-4"
      >
        <Button variant="ghost" size="icon" onClick={() => navigateTo('auth', { mode: 'register', role: 'seller' })} className="rounded-full cursor-pointer">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="ml-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-border/60">
            <Image src="/trait-mark.png" alt="" width={42} height={30} className="h-8 w-9 object-contain" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-foreground">Devenir commerçant</h1>
            <p className="text-xs text-muted-foreground">Votre demande de boutique TRAIT</p>
          </div>
        </div>
      </motion.header>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 w-full max-w-4xl mx-auto flex flex-col px-4 sm:px-6 pb-10 overflow-y-auto"
      >
        {/* Info card */}
        <div className="mb-6 bg-gradient-to-r from-[#eff7f5] to-white border border-[#0D5C63]/15 rounded-2xl px-5 py-4 flex items-start gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#0D5C63]/10 flex items-center justify-center shrink-0 mt-0.5">
            <Store className="w-5 h-5 text-[#0D5C63]" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-[#073f45] font-semibold">Votre boutique sera vérifiée avant son activation</p>
            <ul className="text-xs text-[#315c5d] space-y-0.5">
              <li>• Préparez vos informations personnelles et celles de votre commerce.</li>
              <li>• Après l’envoi, vous pourrez suivre le statut de votre demande.</li>
              <li>• Les champs marqués d’un astérisque sont nécessaires.</li>
            </ul>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Identity section */}
          <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-pink-500 rounded-full inline-block" />
              Identité
            </h3>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="text-foreground font-medium">Nom complet <span className="text-red-500">*</span></Label>
                <Input id="name" name="name" required value={formData.name} onChange={handleChange} placeholder="Ex: Jean Dupont" className="h-12 text-base" disabled={loading} />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-foreground font-medium">Adresse email <span className="text-red-500">*</span></Label>
                <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="Ex: fournisseur@email.com" className="h-12 text-base" disabled={loading} />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="phone" className="text-foreground font-medium">Téléphone <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <CountrySelect value={formData.countryCode} onValueChange={(v) => setFormData(prev => ({...prev, countryCode: v}))} className="w-full" disabled={loading} />
                  <Input id="phone" name="phone" type="tel" inputMode="tel" required value={formData.phone} onChange={handleChange} placeholder="Numéro national" className="h-12 text-base" disabled={loading} autoComplete="tel-national" />
                </div>
              </div>
            </div>
          </section>

          {/* Business section */}
          <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-pink-500 rounded-full inline-block" />
              Informations du commerce
            </h3>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="businessName" className="text-foreground font-medium">Nom du commerce <span className="text-red-500">*</span></Label>
                <Input id="businessName" name="businessName" required value={formData.businessName} onChange={handleChange} placeholder="Ex: Boutique La Grâce" className="h-12 text-base" disabled={loading} />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="businessType" className="text-foreground font-medium">Type de produits vendus <span className="text-red-500">*</span></Label>
                <Select value={formData.businessType} onValueChange={(v) => setFormData(prev => ({...prev, businessType: v}))}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypes.map((bt) => (
                      <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Location section */}
          <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-pink-500 rounded-full inline-block" />
              Localisation
            </h3>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="city" className="text-foreground font-medium">Ville <span className="text-red-500">*</span></Label>
                <Input id="city" name="city" required value={formData.city} onChange={handleChange} placeholder="Votre ville" className="h-12 text-base" disabled={loading} autoComplete="address-level2" />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="location" className="text-foreground font-medium">Marché / Quartier / Adresse <span className="text-red-500">*</span></Label>
                <Input id="location" name="location" required value={formData.location} onChange={handleChange} placeholder="Ex: Marché Central, Avenue de la Libération" className="h-12 text-base" disabled={loading} />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="address" className="text-foreground font-medium">Adresse complète (optionnelle)</Label>
                <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Ex: 15, Avenue Kabila, Commune de la Gombe" className="h-12 text-base" disabled={loading} />
              </div>
            </div>
          </section>

          {/* Password section */}
          <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-pink-500 rounded-full inline-block" />
              Sécurité
            </h3>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-foreground font-medium">Mot de passe <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? 'text' : 'password'} minLength={8} maxLength={128} required value={formData.password} onChange={handleChange} placeholder="Au moins 8 caractères" className="w-full h-12 text-base pr-12" disabled={loading} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword" className="text-foreground font-medium">Confirmer le mot de passe <span className="text-red-500">*</span></Label>
                <Input id="confirmPassword" name="confirmPassword" type={showPassword ? 'text' : 'password'} minLength={8} maxLength={128} required value={formData.confirmPassword} onChange={handleChange} placeholder="Retapez votre mot de passe" className="h-12 text-base" disabled={loading} />
              </div>
            </div>
          </section>

          {/* Terms */}
          <div className="flex items-start gap-3 mt-1 p-4 bg-[#eff7f5] border border-[#0D5C63]/15 rounded-xl">
            <input id="seller-accept-terms" type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#0D5C63]" />
            <div className="flex flex-col gap-1">
              <p className="text-xs text-foreground font-medium">
                <label htmlFor="seller-accept-terms" className="cursor-pointer">J&apos;accepte les </label>
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#0D5C63] hover:underline font-semibold">Conditions Générales d&apos;Utilisation</a>
              </p>
              <p className="text-[11px] text-muted-foreground">En cochant cette case, vous reconnaissez avoir lu et accepté nos conditions.</p>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading || !formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.businessName.trim() || !formData.businessType || !formData.city.trim() || !formData.location.trim() || formData.password.length < 8 || !formData.confirmPassword.trim() || !acceptTerms}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl shadow-lg shadow-pink-500/20 disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Inscription en cours...</>
            ) : (
              'Créer mon compte service'
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Vous avez déjà un compte ?{' '}
          <button type="button" onClick={() => navigateTo('auth', { mode: 'login', role: 'seller' })} className="font-semibold text-[#0D5C63] hover:underline cursor-pointer">
            Se connecter
          </button>
        </p>
      </motion.main>
    </div>
  )
}
