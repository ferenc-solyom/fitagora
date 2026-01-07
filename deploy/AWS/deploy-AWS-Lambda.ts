// Deploy Quarkus app to AWS Lambda + API Gateway HTTP API
//
// .env (optional; ACCOUNT_ID not required):
//   AWS_REGION=eu-central-1
//   LAMBDA_FUNCTION=code-with-quarkus
//   LAMBDA_ROLE=lambda-execution-role

import "dotenv/config";
import {
    LambdaClient,
    CreateFunctionCommand,
    UpdateFunctionCodeCommand,
    GetFunctionCommand,
    AddPermissionCommand,
    RemovePermissionCommand,
} from "@aws-sdk/client-lambda";
import {
    IAMClient,
    CreateRoleCommand,
    AttachRolePolicyCommand,
    GetRoleCommand,
} from "@aws-sdk/client-iam";
import {
    ApiGatewayV2Client,
    CreateApiCommand,
    GetApisCommand,
    CreateIntegrationCommand,
    DeleteIntegrationCommand,
    CreateRouteCommand,
    DeleteRouteCommand,
    CreateStageCommand,
    GetIntegrationsCommand,
    GetRoutesCommand,
    GetStagesCommand,
} from "@aws-sdk/client-apigatewayv2";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "../..");
const BACKEND_DIR = path.resolve(PROJECT_ROOT, "backend");

const REGION = process.env.AWS_REGION || "eu-central-1";
const FUNCTION_NAME = process.env.LAMBDA_FUNCTION || "code-with-quarkus";
const ROLE_NAME = process.env.LAMBDA_ROLE || "lambda-execution-role";
const API_NAME = `${FUNCTION_NAME}-http-api`;

const lambda = new LambdaClient({ region: REGION });
const iam = new IAMClient({ region: REGION });
const apigw = new ApiGatewayV2Client({ region: REGION });
const sts = new STSClient({ region: REGION });

const ASSUME_ROLE_POLICY = JSON.stringify({
    Version: "2012-10-17",
    Statement: [
        {
            Effect: "Allow",
            Principal: { Service: "lambda.amazonaws.com" },
            Action: "sts:AssumeRole",
        },
    ],
});

async function getAccountId(): Promise<string> {
    const ident = await sts.send(new GetCallerIdentityCommand({}));
    if (!ident.Account) throw new Error("Could not resolve AWS account id from STS");
    return ident.Account;
}

async function getOrCreateRole(accountId: string): Promise<string> {
    const roleArn = `arn:aws:iam::${accountId}:role/${ROLE_NAME}`;

    try {
        await iam.send(new GetRoleCommand({ RoleName: ROLE_NAME }));
        console.log("Using existing IAM role");
        return roleArn;
    } catch {
        await iam.send(
            new CreateRoleCommand({
                RoleName: ROLE_NAME,
                AssumeRolePolicyDocument: ASSUME_ROLE_POLICY,
            })
        );

        await iam.send(
            new AttachRolePolicyCommand({
                RoleName: ROLE_NAME,
                PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            })
        );

        console.log("Created IAM role, waiting for propagation...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return roleArn;
    }
}

function buildApplication(): Buffer {
    console.log("Building Quarkus application for Lambda...");
    const gradlew = path.join(PROJECT_ROOT, "gradlew");
    execSync(`"${gradlew}" :backend:quarkusBuild -Ptarget=lambda -Dquarkus.package.jar.type=legacy-jar`, {
        stdio: "inherit",
        cwd: PROJECT_ROOT,
    });

    const zipPath = path.join(BACKEND_DIR, "build", "function.zip");
    if (!fs.existsSync(zipPath)) {
        throw new Error(
            "function.zip not found. Ensure quarkus-amazon-lambda-http is added and build produced backend/build/function.zip."
        );
    }

    console.log(`Using: ${zipPath}`);
    return fs.readFileSync(zipPath);
}

async function deployFunction(roleArn: string, zipBuffer: Buffer): Promise<void> {
    try {
        await lambda.send(new GetFunctionCommand({ FunctionName: FUNCTION_NAME }));

        await lambda.send(
            new UpdateFunctionCodeCommand({
                FunctionName: FUNCTION_NAME,
                ZipFile: zipBuffer,
            })
        );
        console.log("Updated Lambda function");
    } catch {
        await lambda.send(
            new CreateFunctionCommand({
                FunctionName: FUNCTION_NAME,
                Runtime: "java21",
                Role: roleArn,
                Handler: "io.quarkus.amazon.lambda.runtime.QuarkusStreamHandler::handleRequest",
                Code: { ZipFile: zipBuffer },
                Timeout: 30,
                MemorySize: 512,
                Environment: {
                    Variables: {
                        JAVA_TOOL_OPTIONS: "-XX:+TieredCompilation -XX:TieredStopAtLevel=1",
                    },
                },
            })
        );
        console.log("Created Lambda function");
    }
}

async function ensureApi(): Promise<string> {
    const apis = await apigw.send(new GetApisCommand({ MaxResults: "50" }));
    const existing = apis.Items?.find((a) => a.Name === API_NAME);

    if (existing?.ApiId) {
        console.log(`Using existing HTTP API: ${API_NAME} (${existing.ApiId})`);
        return existing.ApiId;
    }

    const created = await apigw.send(
        new CreateApiCommand({
            Name: API_NAME,
            ProtocolType: "HTTP",
        })
    );

    if (!created.ApiId) throw new Error("CreateApi did not return ApiId");
    console.log(`Created HTTP API: ${API_NAME} (${created.ApiId})`);
    return created.ApiId;
}

async function ensureIntegration(apiId: string, lambdaArn: string): Promise<string> {
    const integrations = await apigw.send(new GetIntegrationsCommand({ ApiId: apiId }));
    const existing = integrations.Items?.find(
        (i) => i.IntegrationType === "AWS_PROXY" && i.IntegrationUri === lambdaArn
    );

    // Delete existing integration if payload format doesn't match (can't update it)
    if (existing?.IntegrationId && existing.PayloadFormatVersion !== "2.0") {
        console.log("Recreating integration with correct payload format...");

        // Must delete routes referencing this integration first
        const routes = await apigw.send(new GetRoutesCommand({ ApiId: apiId }));
        const referencingRoutes = routes.Items?.filter(
            (r) => r.Target === `integrations/${existing.IntegrationId}`
        );
        for (const route of referencingRoutes ?? []) {
            if (route.RouteId) {
                await apigw.send(new DeleteRouteCommand({ ApiId: apiId, RouteId: route.RouteId }));
            }
        }

        await apigw.send(new DeleteIntegrationCommand({ ApiId: apiId, IntegrationId: existing.IntegrationId }));
    } else if (existing?.IntegrationId) {
        return existing.IntegrationId;
    }

    const created = await apigw.send(
        new CreateIntegrationCommand({
            ApiId: apiId,
            IntegrationType: "AWS_PROXY",
            IntegrationUri: lambdaArn,
            PayloadFormatVersion: "2.0",
        })
    );

    if (!created.IntegrationId) throw new Error("CreateIntegration did not return IntegrationId");
    return created.IntegrationId;
}

async function ensureDefaultRoute(apiId: string, integrationId: string): Promise<void> {
    const routes = await apigw.send(new GetRoutesCommand({ ApiId: apiId }));
    const exists = routes.Items?.some((r) => r.RouteKey === "$default");
    if (exists) return;

    await apigw.send(
        new CreateRouteCommand({
            ApiId: apiId,
            RouteKey: "$default",
            Target: `integrations/${integrationId}`,
        })
    );
}

async function ensureDefaultStage(apiId: string): Promise<void> {
    const stages = await apigw.send(new GetStagesCommand({ ApiId: apiId }));
    const exists = stages.Items?.some((s) => s.StageName === "$default");
    if (exists) return;

    await apigw.send(
        new CreateStageCommand({
            ApiId: apiId,
            StageName: "$default",
            AutoDeploy: true,
        })
    );
}

async function ensureLambdaInvokePermission(apiId: string, accountId: string): Promise<void> {
    // Match this API only (avoids stale permissions when API gets recreated)
    // HTTP API uses simpler ARN pattern than REST API
    const sourceArn = `arn:aws:execute-api:${REGION}:${accountId}:${apiId}/*`;
    const statementId = `AllowApigwInvoke-${apiId}`;

    try {
        await lambda.send(
            new AddPermissionCommand({
                FunctionName: FUNCTION_NAME,
                StatementId: statementId,
                Action: "lambda:InvokeFunction",
                Principal: "apigateway.amazonaws.com",
                SourceArn: sourceArn,
            })
        );
        return;
    } catch (e: any) {
        // If statement exists (maybe from previous run), remove and re-add to ensure SourceArn is correct.
        const name = String(e?.name || "");
        if (!name.includes("ResourceConflictException")) throw e;

        await lambda.send(
            new RemovePermissionCommand({
                FunctionName: FUNCTION_NAME,
                StatementId: statementId,
            })
        );

        await lambda.send(
            new AddPermissionCommand({
                FunctionName: FUNCTION_NAME,
                StatementId: statementId,
                Action: "lambda:InvokeFunction",
                Principal: "apigateway.amazonaws.com",
                SourceArn: sourceArn,
            })
        );
    }
}

async function setupHttpApi(lambdaArn: string, accountId: string): Promise<string> {
    const apiId = await ensureApi();
    const integrationId = await ensureIntegration(apiId, lambdaArn);
    await ensureDefaultRoute(apiId, integrationId);
    await ensureDefaultStage(apiId);
    await ensureLambdaInvokePermission(apiId, accountId);

    return `https://${apiId}.execute-api.${REGION}.amazonaws.com`;
}

async function deploy() {
    console.log("Starting deployment to AWS Lambda + HTTP API...\n");

    const accountId = await getAccountId();
    console.log(`Account: ${accountId}  Region: ${REGION}`);

    const roleArn = await getOrCreateRole(accountId);
    const zipBuffer = buildApplication();
    await deployFunction(roleArn, zipBuffer);

    const fn = await lambda.send(new GetFunctionCommand({ FunctionName: FUNCTION_NAME }));
    const lambdaArn = fn.Configuration?.FunctionArn;
    if (!lambdaArn) throw new Error("Could not resolve Lambda FunctionArn");

    const httpApiUrl = await setupHttpApi(lambdaArn, accountId);

    console.log("\n========================================");
    console.log("Deployment complete!");
    console.log(`HTTP API URL: ${httpApiUrl}`);
    console.log("Test: curl -i " + httpApiUrl + "/");
    console.log("========================================\n");
}

deploy().catch(console.error);
