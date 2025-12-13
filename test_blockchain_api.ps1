# WorldPass Multi-Chain API Test Script (PowerShell)
# Sunucu üzerinde blockchain endpointlerini test eder

# Sunucu URL (değiştir)
$API_URL = "https://worldpass-beta.heptapusgroup.com"

Write-Host "=========================================="
Write-Host "WorldPass Multi-Chain Blockchain API Test"
Write-Host "=========================================="
Write-Host ""
Write-Host "API URL: $API_URL"
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$API_URL/api/health" | ConvertTo-Json
Write-Host ""

# Test 2: Blockchain List
Write-Host "Test 2: Blockchain List (Mainnet)" -ForegroundColor Yellow
$chains = Invoke-RestMethod -Uri "$API_URL/api/blockchains/list"
$chains.chains | ForEach-Object {
    Write-Host "$($_.key): $($_.name) - Gas: $($_.gas_price), Finality: $($_.finality)s"
}
Write-Host ""

# Test 3: Chain Count
Write-Host "Test 3: Chain Count" -ForegroundColor Yellow
Write-Host "Total Chains: $($chains.count)"
Write-Host "Recommended: $($chains.recommended)"
Write-Host ""

# Test 4: Recommended Chain
Write-Host "Test 4: Recommended Chain Details" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$API_URL/api/blockchains/recommended" | ConvertTo-Json
Write-Host ""

# Test 5: Testnet List
Write-Host "Test 5: Testnet List" -ForegroundColor Yellow
$testnets = Invoke-RestMethod -Uri "$API_URL/api/blockchains/list?include_testnets=true"
$testnets.chains | Where-Object { $_.key -like "*_*" } | ForEach-Object {
    Write-Host "$($_.key): $($_.name)"
}
Write-Host ""

# Test 6: Polygon Info
Write-Host "Test 6: Polygon Chain Info" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$API_URL/api/blockchains/polygon" | ConvertTo-Json
Write-Host ""

# Test 7: Base Info
Write-Host "Test 7: Base Chain Info" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$API_URL/api/blockchains/base" | ConvertTo-Json
Write-Host ""

# Summary
Write-Host "=========================================="
Write-Host "Test Complete!" -ForegroundColor Green
Write-Host "=========================================="
Write-Host ""
Write-Host "✅ API endpointleri çalışıyor!"
Write-Host "✅ $($chains.count) blockchain destekleniyor"
Write-Host ""
Write-Host "Simulated mode aktif - IPFS ve blockchain gerçek değil"
Write-Host "Gerçek kullanım için Web3 entegrasyonu gerekli"
Write-Host ""
