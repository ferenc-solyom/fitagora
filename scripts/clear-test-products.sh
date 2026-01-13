#!/bin/bash

# Clear test products from DynamoDB (those with ownerId = system-test-data)
# Usage: ./clear-test-products.sh [--region REGION] [--profile PROFILE]

set -e

TABLE_NAME="webshop-products"
OWNER_ID="system-test-data"

# Default region
REGION="${AWS_REGION:-eu-central-1}"
PROFILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            REGION="$2"
            shift 2
            ;;
        --profile)
            PROFILE="--profile $2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "Clearing test products from DynamoDB table: $TABLE_NAME"
echo "Region: $REGION"
echo "Owner ID: $OWNER_ID"
echo ""

# Scan for items with the test owner ID
items=$(aws dynamodb scan \
    --table-name "$TABLE_NAME" \
    --filter-expression "ownerId = :ownerId" \
    --expression-attribute-values '{":ownerId": {"S": "'"$OWNER_ID"'"}}' \
    --projection-expression "id" \
    --region "$REGION" \
    $PROFILE \
    --output json)

# Extract IDs and delete each item
count=0
echo "$items" | jq -r '.Items[].id.S' | while read -r id; do
    [[ -z "$id" ]] && continue
    echo "Deleting: $id"
    aws dynamodb delete-item \
        --table-name "$TABLE_NAME" \
        --key "{\"id\": {\"S\": \"$id\"}}" \
        --region "$REGION" \
        $PROFILE
    ((count++)) || true
done

echo ""
echo "Done! Test products cleared."
