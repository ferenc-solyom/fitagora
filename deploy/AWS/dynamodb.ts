// Shared DynamoDB table setup for AWS deployments (Lambda and ECS)

import {
    DynamoDBClient,
    CreateTableCommand,
    DescribeTableCommand,
    UpdateTableCommand,
    ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import {
    IAMClient,
    PutRolePolicyCommand,
} from "@aws-sdk/client-iam";

export const PRODUCTS_TABLE = "webshop-products";
export const FAVORITES_TABLE = "webshop-favorites";
export const USERS_TABLE = "webshop-users";

export interface GsiConfig {
    attribute: string;
    name: string;
}

export interface TableConfig {
    tableName: string;
    gsis?: GsiConfig[];
}

export async function ensureDynamoDbPolicy(
    iam: IAMClient,
    roleName: string,
    region: string,
    accountId: string
): Promise<void> {
    const policyName = "DynamoDBAccess";
    const policyDocument = JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Action: [
                    "dynamodb:PutItem",
                    "dynamodb:GetItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:Scan",
                    "dynamodb:Query",
                ],
                Resource: [
                    `arn:aws:dynamodb:${region}:${accountId}:table/${PRODUCTS_TABLE}`,
                    `arn:aws:dynamodb:${region}:${accountId}:table/${PRODUCTS_TABLE}/index/*`,
                    `arn:aws:dynamodb:${region}:${accountId}:table/${FAVORITES_TABLE}`,
                    `arn:aws:dynamodb:${region}:${accountId}:table/${FAVORITES_TABLE}/index/*`,
                    `arn:aws:dynamodb:${region}:${accountId}:table/${USERS_TABLE}`,
                    `arn:aws:dynamodb:${region}:${accountId}:table/${USERS_TABLE}/index/*`,
                ],
            },
        ],
    });

    await iam.send(
        new PutRolePolicyCommand({
            RoleName: roleName,
            PolicyName: policyName,
            PolicyDocument: policyDocument,
        })
    );
    console.log("Updated DynamoDB IAM policy");
}

export async function ensureDynamoDbTable(
    dynamodb: DynamoDBClient,
    config: TableConfig
): Promise<void> {
    const { tableName, gsis = [] } = config;

    try {
        const describeResult = await dynamodb.send(new DescribeTableCommand({ TableName: tableName }));
        console.log(`DynamoDB table exists: ${tableName}`);

        const existingGsis = describeResult.Table?.GlobalSecondaryIndexes || [];
        for (const gsi of gsis) {
            const gsiExists = existingGsis.some(g => g.IndexName === gsi.name);

            if (!gsiExists) {
                console.log(`Adding GSI ${gsi.name} to ${tableName}...`);
                await dynamodb.send(
                    new UpdateTableCommand({
                        TableName: tableName,
                        AttributeDefinitions: [{ AttributeName: gsi.attribute, AttributeType: "S" }],
                        GlobalSecondaryIndexUpdates: [
                            {
                                Create: {
                                    IndexName: gsi.name,
                                    KeySchema: [{ AttributeName: gsi.attribute, KeyType: "HASH" }],
                                    Projection: { ProjectionType: "ALL" },
                                },
                            },
                        ],
                    })
                );
                console.log(`Added GSI ${gsi.name} to ${tableName} (may take a minute to become active)`);
                await new Promise((resolve) => setTimeout(resolve, 5000));
            } else {
                console.log(`GSI ${gsi.name} already exists on ${tableName}`);
            }
        }
    } catch (e) {
        if (e instanceof ResourceNotFoundException) {
            const attributeDefinitions: { AttributeName: string; AttributeType: string }[] = [
                { AttributeName: "id", AttributeType: "S" }
            ];
            const globalSecondaryIndexes: {
                IndexName: string;
                KeySchema: { AttributeName: string; KeyType: string }[];
                Projection: { ProjectionType: string };
            }[] = [];

            for (const gsi of gsis) {
                attributeDefinitions.push({ AttributeName: gsi.attribute, AttributeType: "S" });
                globalSecondaryIndexes.push({
                    IndexName: gsi.name,
                    KeySchema: [{ AttributeName: gsi.attribute, KeyType: "HASH" }],
                    Projection: { ProjectionType: "ALL" },
                });
            }

            await dynamodb.send(
                new CreateTableCommand({
                    TableName: tableName,
                    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
                    AttributeDefinitions: attributeDefinitions,
                    BillingMode: "PAY_PER_REQUEST",
                    GlobalSecondaryIndexes: globalSecondaryIndexes.length > 0 ? globalSecondaryIndexes : undefined,
                })
            );
            const gsiNames = gsis.map(g => g.name).join(", ");
            console.log(`Created DynamoDB table: ${tableName}${gsiNames ? ` with GSIs: ${gsiNames}` : ""}`);
        } else {
            throw e;
        }
    }
}

export async function ensureDynamoDbTables(dynamodb: DynamoDBClient): Promise<void> {
    await ensureDynamoDbTable(dynamodb, {
        tableName: PRODUCTS_TABLE,
        gsis: [{ attribute: "ownerId", name: "owner-index" }],
    });
    await ensureDynamoDbTable(dynamodb, {
        tableName: FAVORITES_TABLE,
        gsis: [
            { attribute: "userId", name: "user-index" },
            { attribute: "productId", name: "product-index" },
        ],
    });
    await ensureDynamoDbTable(dynamodb, {
        tableName: USERS_TABLE,
        gsis: [{ attribute: "email", name: "email-index" }],
    });
}
