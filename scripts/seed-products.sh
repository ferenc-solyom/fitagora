#!/bin/bash

# Seed test products to DynamoDB
# Usage: ./seed-products.sh [--region REGION] [--profile PROFILE]
#
# Environment variables:
#   AWS_REGION - AWS region (default: eu-central-1)
#   AWS_PROFILE - AWS profile to use

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_FILE="${SCRIPT_DIR}/../test_data/products"
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

# Category mapping
map_category() {
    local cat="$1"
    case "${cat,,}" in
        "cardio") echo "CARDIO" ;;
        "strength") echo "STRENGTH" ;;
        "mobility") echo "MOBILITY" ;;
        "rehab/kineto") echo "RECOVERY" ;;
        "accessories") echo "ACCESSORIES" ;;
        "plyometrics") echo "PLYOMETRICS" ;;
        "core") echo "CORE" ;;
        "outdoor/functional") echo "OUTDOOR" ;;
        "home gym") echo "HOME_GYM" ;;
        *) echo "OTHER" ;;
    esac
}

# Check if data file exists
if [[ ! -f "$DATA_FILE" ]]; then
    echo "Error: Data file not found: $DATA_FILE"
    exit 1
fi

echo "Seeding products to DynamoDB table: $TABLE_NAME"
echo "Region: $REGION"
echo ""

# Skip header line and process each row
tail -n +2 "$DATA_FILE" | while IFS=$'\t' read -r category name description price imageUrl; do
    # Skip empty lines
    [[ -z "$name" ]] && continue

    # Generate UUID
    id=$(uuidgen | tr '[:upper:]' '[:lower:]')

    # Map category
    mapped_category=$(map_category "$category")

    # Current timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Build the item JSON
    item=$(cat <<EOF
{
    "id": {"S": "$id"},
    "name": {"S": "$name"},
    "description": {"S": "$description"},
    "price": {"N": "$price"},
    "category": {"S": "$mapped_category"},
    "ownerId": {"S": "$OWNER_ID"},
    "images": {"L": [{"S": "$imageUrl"}]},
    "createdAt": {"S": "$timestamp"}
}
EOF
)

    # Put item to DynamoDB
    echo "Adding: $name ($mapped_category) - $price Lei"
    aws dynamodb put-item \
        --table-name "$TABLE_NAME" \
        --item "$item" \
        --region "$REGION" \
        $PROFILE

done

echo ""
echo "Done! Products seeded successfully."
