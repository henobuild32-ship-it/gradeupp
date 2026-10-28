'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { COUNTRIES, getCountry, type CountryRecord } from '@/lib/countries'

interface CountrySelectProps {
  value: string
  onValueChange: (countryCode: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CountrySelect({ value, onValueChange, placeholder = 'Choisir un pays', disabled, className }: CountrySelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = getCountry(value)
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr')
    if (!needle) return COUNTRIES
    return COUNTRIES.filter((country) =>
      `${country.nameFr} ${country.nameEn} ${country.code} ${country.callingCode ?? ''}`
        .toLocaleLowerCase('fr').includes(needle),
    )
  }, [query])

  function choose(country: CountryRecord) {
    onValueChange(country.code)
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      <Button type="button" variant="outline" disabled={disabled} onClick={() => setOpen(true)} className={`h-12 w-full justify-between gap-3 px-3 text-left font-normal ${className ?? ''}`}>
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-xl" aria-hidden="true">{selected?.flag ?? '🌐'}</span>
          <span className="truncate">{selected ? selected.nameFr : placeholder}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
          {selected?.callingCode && <span className="text-sm">{selected.callingCode}</span>}
          <ChevronsUpDown className="size-4" />
        </span>
      </Button>
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery('') }}>
        <DialogContent className="top-auto bottom-0 left-0 flex h-[88dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-t-2xl rounded-b-none p-0 sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:h-[min(80vh,640px)] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl">
          <DialogHeader className="border-b px-4 py-4 text-left">
            <DialogTitle>Choisir un pays</DialogTitle>
            <DialogDescription>Recherchez par nom, code ISO ou indicatif téléphonique.</DialogDescription>
          </DialogHeader>
          <div className="relative border-b p-3">
            <Search className="absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex. France, FR, +33" className="h-12 pl-10" />
          </div>
          <div role="listbox" aria-label="Pays" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {filtered.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Aucun pays trouvé.</p> : filtered.map((country) => (
              <button key={country.code} type="button" role="option" aria-selected={value === country.code} onClick={() => choose(country)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="text-xl" aria-hidden="true">{country.flag}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{country.nameFr}</span>
                <span className="text-xs text-muted-foreground">{country.code}</span>
                <span className="w-12 text-right text-sm text-muted-foreground">{country.callingCode ?? '—'}</span>
                {value === country.code && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">{filtered.length} pays et territoires</div>
        </DialogContent>
      </Dialog>
    </>
  )
}
