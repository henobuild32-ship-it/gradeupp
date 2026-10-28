$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$oldDatabaseUrl = $env:DATABASE_URL
$oldDirectUrl = $env:DIRECT_URL
$oldPath = $env:PATH
$targetUrl = $env:DIRECT_URL

if ([string]::IsNullOrWhiteSpace($targetUrl)) {
  $targetUrl = $env:DATABASE_URL
}

$secretBuffer = [IntPtr]::Zero
try {
  if ([string]::IsNullOrWhiteSpace($targetUrl)) {
    $secureUrl = Read-Host 'Collez la chaîne de connexion Supabase Direct ou Session (saisie masquée)' -AsSecureString
    $secretBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
    $targetUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretBuffer)
  }

  if ([string]::IsNullOrWhiteSpace($targetUrl)) {
    throw 'Aucune URL de connexion Supabase fournie.'
  }

  if ($targetUrl -match ':6543(?:/|\?|$)') {
    throw 'Le port 6543 est le pooler transactionnel Supabase. Pour les migrations Prisma, utilisez la connexion Direct ou le pooler Session (port 5432).'
  }

  Push-Location $projectRoot
  try {
    # Utilise la même connexion dédiée pour le contrôle Prisma et l’application des migrations.
    $env:DATABASE_URL = $targetUrl
    $env:DIRECT_URL = $targetUrl
    $env:PATH = (Join-Path $projectRoot 'node_modules\.bin') + ';' + $oldPath

    $prisma = Join-Path $projectRoot 'node_modules\.bin\prisma.cmd'
    if (-not (Test-Path -LiteralPath $prisma)) {
      throw 'Prisma est absent. Lancez npm install dans le dossier du projet, puis réessayez.'
    }

    Write-Host 'Validation du schéma Prisma…'
    & $prisma validate
    if ($LASTEXITCODE -ne 0) { throw 'La validation Prisma a échoué.' }

    Write-Host 'Génération du client Prisma…'
    & $prisma generate
    if ($LASTEXITCODE -ne 0) { throw 'La génération Prisma a échoué.' }

    Write-Host 'Application des migrations en attente…'
    & node (Join-Path $projectRoot 'scripts\deploy-migrations.js')
    if ($LASTEXITCODE -ne 0) { throw "Les migrations ont échoué ou le contrôle de sécurité a refusé de les appliquer." }

    Write-Host 'Verification du schema, des migrations Prisma et des donnees carte...'
    & node (Join-Path $projectRoot 'scripts\verify-supabase-schema.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'La vérification Supabase a détecté un problème.' }

    Write-Host 'Supabase est à jour et les contrôles ont réussi.' -ForegroundColor Green
  }
  finally {
    Pop-Location
  }
}
finally {
  if ($secretBuffer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretBuffer)
  }
  $env:PATH = $oldPath
  $env:DATABASE_URL = $oldDatabaseUrl
  $env:DIRECT_URL = $oldDirectUrl
}
