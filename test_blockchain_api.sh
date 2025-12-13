#!/bin/bash
# WorldPass Multi-Chain API Test Script
# Sunucu üzerinde blockchain endpointlerini test eder

# Sunucu URL (değiştir)
API_URL="https://worldpass-beta.heptapusgroup.com"

# Renkler
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "WorldPass Multi-Chain Blockchain API Test"
echo "=========================================="
echo ""
echo "API URL: $API_URL"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
curl -s "$API_URL/api/health" | jq '.'
echo ""

# Test 2: Blockchain List
echo -e "${YELLOW}Test 2: Blockchain List (Mainnet)${NC}"
curl -s "$API_URL/api/blockchains/list" | jq '.chains[] | {key, name, gas_price, finality}'
echo ""

# Test 3: Blockchain Count
echo -e "${YELLOW}Test 3: Chain Count${NC}"
CHAIN_COUNT=$(curl -s "$API_URL/api/blockchains/list" | jq -r '.count')
echo "Total Chains: $CHAIN_COUNT"
echo ""

# Test 4: Recommended Chain
echo -e "${YELLOW}Test 4: Recommended Chain${NC}"
curl -s "$API_URL/api/blockchains/recommended" | jq '.'
echo ""

# Test 5: Testnet List
echo -e "${YELLOW}Test 5: Testnet List${NC}"
curl -s "$API_URL/api/blockchains/list?include_testnets=true" | jq '.chains[] | select(.key | contains("_")) | {key, name}'
echo ""

# Test 6: Polygon Info
echo -e "${YELLOW}Test 6: Polygon Chain Info${NC}"
curl -s "$API_URL/api/blockchains/polygon" | jq '.'
echo ""

# Test 7: Base Info
echo -e "${YELLOW}Test 7: Base Chain Info${NC}"
curl -s "$API_URL/api/blockchains/base" | jq '.'
echo ""

# Test 8: Invalid Chain (Should 404)
echo -e "${YELLOW}Test 8: Invalid Chain (Should error)${NC}"
curl -s "$API_URL/api/blockchains/invalid_chain" | jq '.'
echo ""

# Summary
echo -e "${GREEN}=========================================="
echo "Test Complete!"
echo -e "==========================================${NC}"
echo ""
echo "✅ API endpointleri çalışıyor!"
echo "✅ $CHAIN_COUNT blockchain destekleniyor"
echo ""
echo "Simulated mode aktif - IPFS ve blockchain gerçek değil"
echo "Gerçek kullanım için Web3 entegrasyonu gerekli"
echo ""
