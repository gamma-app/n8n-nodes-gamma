#!/bin/bash

# Manual Integration Test Script for Gamma n8n Node
# Tests all operations via curl to verify the node constructs requests correctly

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Gamma n8n Node - Manual Integration Tests ===${NC}"
echo ""

# Check for API key
if [ -z "$GAMMA_API_KEY" ]; then
    echo -e "${RED}ERROR: GAMMA_API_KEY not set${NC}"
    echo "Please set your API key:"
    echo "  export GAMMA_API_KEY=sk-gamma-xxxxx"
    exit 1
fi

API_KEY="$GAMMA_API_KEY"
BASE_URL="https://public-api.gamma.app"

echo -e "${GREEN}✅ API Key found${NC}"
echo ""

# Test 1: Get Me
echo -e "${BLUE}Test 1: GET /v1.0/me (User Info)${NC}"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X GET "$BASE_URL/v1.0/me" \
  -H "X-API-KEY: $API_KEY" \
  -H "Accept: application/json")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
    echo "Response: $BODY"
else
    echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
    echo "Response: $BODY"
fi
echo ""

# Test 2: List Themes
echo -e "${BLUE}Test 2: GET /v1.0/themes (List Themes)${NC}"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X GET "$BASE_URL/v1.0/themes?limit=5" \
  -H "X-API-KEY: $API_KEY" \
  -H "Accept: application/json")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
    echo "Response: $BODY" | head -n 5
else
    echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
    echo "Response: $BODY"
fi
echo ""

# Test 3: List Folders
echo -e "${BLUE}Test 3: GET /v1.0/folders (List Folders)${NC}"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X GET "$BASE_URL/v1.0/folders?limit=5" \
  -H "X-API-KEY: $API_KEY" \
  -H "Accept: application/json")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
    echo "Response: $BODY" | head -n 5
else
    echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
    echo "Response: $BODY"
fi
echo ""

# Test 4: Create Generation (minimal)
echo -e "${BLUE}Test 4: POST /v1.0/generations (Minimal Required Fields)${NC}"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "$BASE_URL/v1.0/generations" \
  -H "X-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "inputText": "Create a presentation about automated testing",
    "textMode": "generate"
  }')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
    echo "Response: $BODY"
    GENERATION_ID=$(echo "$BODY" | grep -o '"generationId":"[^"]*"' | cut -d'"' -f4)
    echo "Generation ID: $GENERATION_ID"
else
    echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
    echo "Response: $BODY"
fi
echo ""

# Test 5: Create Generation (with options)
echo -e "${BLUE}Test 5: POST /v1.0/generations (With Options)${NC}"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST "$BASE_URL/v1.0/generations" \
  -H "X-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "inputText": "Benefits of continuous integration",
    "textMode": "generate",
    "format": "presentation",
    "numCards": 8,
    "cardSplit": "auto",
    "textOptions": {
      "amount": "medium",
      "tone": "professional",
      "language": "en"
    },
    "imageOptions": {
      "source": "aiGenerated"
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
    echo "Response: $BODY"
    GENERATION_ID_2=$(echo "$BODY" | grep -o '"generationId":"[^"]*"' | cut -d'"' -f4)
    echo "Generation ID: $GENERATION_ID_2"
else
    echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
    echo "Response: $BODY"
fi
echo ""

# Test 6: Get Status (if we have a generation ID)
if [ ! -z "$GENERATION_ID" ]; then
    echo -e "${BLUE}Test 6: GET /v1.0/generations/{id} (Check Status)${NC}"
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -X GET "$BASE_URL/v1.0/generations/$GENERATION_ID" \
      -H "X-API-KEY: $API_KEY" \
      -H "Accept: application/json")

    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Status: $HTTP_CODE"
        echo "Response: $BODY"
    else
        echo -e "${RED}❌ FAIL${NC} - Status: $HTTP_CODE"
        echo "Response: $BODY"
    fi
else
    echo -e "${BLUE}Test 6: Skipped (no generation ID from Test 4)${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}=== Test Summary ===${NC}"
echo "All endpoint tests completed!"
echo ""
echo "Next steps:"
echo "1. Check that all tests passed (✅)"
echo "2. Wait 30-60 seconds for generations to complete"
echo "3. Re-run Test 6 to see completed status with gammaUrl"
echo ""
echo "To verify a completed generation:"
echo "  curl -X GET \"$BASE_URL/v1.0/generations/\$GENERATION_ID\" -H \"X-API-KEY: $API_KEY\""


