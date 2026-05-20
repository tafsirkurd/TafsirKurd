# activate-semantic-search.ps1
# Run once after wrangler login to activate semantic search.

Write-Host ""
Write-Host "TafsirKurd - Semantic Search Activation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create Vectorize index
Write-Host "[1/3] Creating Vectorize index quran-verses..." -ForegroundColor Yellow
$idx = npx wrangler vectorize create quran-verses --dimensions=1024 --metric=cosine 2>&1
$idxStr = "$idx"
if ($LASTEXITCODE -ne 0) {
    if ($idxStr -match "already exist") {
        Write-Host "  Index already exists - skipping." -ForegroundColor Gray
    } else {
        Write-Host "  ERROR: $idxStr" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  Created." -ForegroundColor Green
}
Write-Host ""

# Step 2: Seed all 6236 verses
Write-Host "[2/3] Seeding 6236 verse embeddings (takes 5-10 min)..." -ForegroundColor Yellow
Write-Host ""

$accountInfo = npx wrangler whoami 2>&1
$accountId = ""
foreach ($line in $accountInfo) {
    if ($line -match "([a-f0-9]{32})") {
        $accountId = $Matches[1]
        break
    }
}

if (-not $accountId) {
    $accountId = Read-Host "Enter your Cloudflare Account ID"
}
Write-Host "  Account ID: $accountId" -ForegroundColor Gray

$apiToken = Read-Host "Enter a Cloudflare API Token (Workers AI + Vectorize write)"
Write-Host ""

$env:CF_ACCOUNT_ID = $accountId
$env:CF_API_TOKEN = $apiToken
$env:CF_VECTORIZE_INDEX = "quran-verses"

node scripts/seed-vectorize.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  Seeding failed. Check your API token permissions." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Deploy the worker
Write-Host "[3/3] Deploying quran-search worker..." -ForegroundColor Yellow
npx wrangler deploy -c workers/quran-search/wrangler.toml
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Deploy failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done! Semantic search is live." -ForegroundColor Green
Write-Host "  https://quran-search.tefsirkurd.workers.dev" -ForegroundColor White
Write-Host ""
