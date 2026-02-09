<#
.SYNOPSIS
  Run DB migration SQL, create tables, and seed from Excel for local dev.

USAGE
  .\run_migrations_and_seed.ps1 [-SheetName "MAIN BUILDING"]

This script:
  - loads `.env` in the backend folder (if present)
  - runs `migrations/add_buildings_and_building_id.sql` using `psql` (if available)
  - runs `python init_db.py` to create any remaining tables
  - runs `python seed_from_excel.py <SheetName>` (or without args to list sheets)

Note: This script expects `psql` to be in PATH. If absent, run the SQL file manually
using your preferred Postgres client or install the PostgreSQL client tools.
#>

param(
  [string]$SheetName = ""
)

Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Host "Running from: $scriptDir"
Push-Location $scriptDir

# Load .env if present
$envPath = Join-Path $scriptDir ".env"
if (Test-Path $envPath) {
  Write-Host "Loading .env"
  Get-Content $envPath | ForEach-Object {
    if ($_ -match '^[\s#]') { return }
    if ($_ -match '^[\s]*$') { return }
    $parts = $_ -split '=', 2
    if ($parts.Length -eq 2) {
      $k = $parts[0].Trim()
      $v = $parts[1].Trim().Trim('"')
      $env:$k = $v
    }
  }
}

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL is not set in environment or .env. Aborting."
  Pop-Location
  exit 1
}

$migrationsDir = Join-Path $scriptDir "migrations"
if (-not (Test-Path $migrationsDir)) {
  Write-Warning "Migrations directory not found: $migrationsDir. Skipping SQL migrations."
} else {
  # Run all .sql files in migrations in alphabetical order
  Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name | ForEach-Object {
    $file = $_.FullName
    Write-Host "Running migration: $($_.Name)"
    $psql = Get-Command psql -ErrorAction SilentlyContinue
    if ($psql) {
      & psql $env:DATABASE_URL -f $file
      if ($LASTEXITCODE -ne 0) { Write-Error "psql failed on $file with exit code $LASTEXITCODE"; Pop-Location; exit $LASTEXITCODE }
    } else {
      Write-Warning "psql not found in PATH. Please run the SQL migration file manually:
      psql \"$($env:DATABASE_URL)\" -f $file"
      Pop-Location
      exit 2
    }
  }
}

Write-Host "Running init_db.py to create any remaining tables..."
python init_db.py
if ($LASTEXITCODE -ne 0) { Write-Error "init_db.py failed with exit code $LASTEXITCODE"; Pop-Location; exit $LASTEXITCODE }

if ($SheetName) {
  Write-Host "Seeding from Excel using sheet: $SheetName"
  python seed_from_excel.py $SheetName
} else {
  Write-Host "Running seed script without sheet name (it will print available sheets)."
  python seed_from_excel.py
}

if ($LASTEXITCODE -ne 0) { Write-Error "Seeding failed (exit code $LASTEXITCODE)"; Pop-Location; exit $LASTEXITCODE }

Pop-Location
Write-Host "Migrations and seed completed."
