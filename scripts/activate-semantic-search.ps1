# activate-semantic-search.ps1
# Run this ONCE after `npx wrangler login` to set up semantic search.
# Usage: .\scripts\activate-semantic-search.ps1

Write-Host ""
Write-Host "TafsirKurd — Semantic Search Activation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Create Vectorize index ───────────────────────────────────────────
Write-Host "[1/3] Creating Vectorize index 'quran-verses'..." -ForegroundColor Yellow
$idx = npx wrangler vectorize create quran-verses --dimensions=1024 --metric=cosine 2>&1
if ($LASTEXITCODE -ne 0 -and $idx -notmatch "already exists") {
    Write-Host "  ERROR: $idx" -ForegroundColor Red
    exit 1
}
if ($idx -match "already exists") {
    Write-Host "  Index already exists — skipping." -ForegroundColor Gray
} else {
    Write-Host "  Created." -ForegroundColor Green
}
Write-Host ""

# ── Step 2: Seed all 6236 verses ─────────────────────────────────────────────
Write-Host "[2/3] Seeding 6236 verse embeddings into Vectorize..." -ForegroundColor Yellow
Write-Host "      (This takes ~5-10 minutes — do not close the terminal)" -ForegroundColor Gray
Write-Host ""

# Get account ID from wrangler
$accountInfo = npx wrangler whoami 2>&1
$accountId = ($accountInfo | Select-String -Pattern 'Account ID:\s+([a-f0-9]+)').Matches.Groups[1].Value
if (-not $accountId) {
    # Try alternate format
    $accountId = ($accountInfo | Select-String -Pattern '([a-f0-9]{32})').Matches.Groups[1].Value
}
if (-not $accountId) {
    Write-Host "  Could not auto-detect Account ID from wrangler." -ForegroundColor Red
    $accountId = Read-Host "  Enter your Cloudflare Account ID"
}
Write-Host "  Account ID: $accountId" -ForegroundColor Gray

$apiToken = Read-Host "  Enter a Cloudflare API Token with Workers AI + Vectorize write permissions"
Write-Host ""

$env:CF_ACCOUNT_ID = $accountId
$env:CF_API_TOKEN  = $apiToken
$env:CF_VECTORIZE_INDEX = "quran-verses"

node scripts/seed-vectorize.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  Seeding failed. Check your API token permissions." -ForegroundColor Red
    Write-Host "  Token needs: Workers AI (read), Vectorize (edit)" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# ── Step 3: Deploy the worker ─────────────────────────────────────────────────
Write-Host "[3/3] Deploying quran-search worker..." -ForegroundColor Yellow
npx wrangler deploy -c workers/quran-search/wrangler.toml
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Deploy failed." -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done! Semantic search is now live at:" -ForegroundColor Green
Write-Host "  https://quran-search.tefsirkurd.workers.dev" -ForegroundColor White
Write-Host ""
Write-Host "The app will use it automatically on next load." -ForegroundColor Gray
Write-Host ""
