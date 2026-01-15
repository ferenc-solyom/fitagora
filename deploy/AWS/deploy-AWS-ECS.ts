// Deploy Quarkus app to AWS ECS with Fargate and DynamoDB
//
// .env (optional):
//   AWS_REGION=us-east-1
//   SUBNET_IDS=subnet-xxx,subnet-yyy
//   SECURITY_GROUP_IDS=sg-xxx
//
// What the script does:
//   1. Creates ECS task role with DynamoDB permissions
//   2. Creates DynamoDB tables (webshop-products, webshop-favorites, webshop-users)
//   3. Creates ECR repository (if needed)
//   4. Builds the Quarkus app and Docker image
//   5. Pushes image to ECR
//   6. Creates ECS cluster with Fargate
//   7. Registers task definition and creates/updates the service
//
// Prerequisites:
//   - AWS credentials configured (aws configure)
//   - Docker running
//   - ecsTaskExecutionRole IAM role exists in your account
//   - VPC subnets and security group allowing port 8080


import "dotenv/config";
import {
  ECRClient,
  CreateRepositoryCommand,
  GetAuthorizationTokenCommand,
  DescribeRepositoriesCommand,
} from "@aws-sdk/client-ecr";
import {
  ECSClient,
  CreateClusterCommand,
  RegisterTaskDefinitionCommand,
  CreateServiceCommand,
  UpdateServiceCommand,
  DescribeServicesCommand,
} from "@aws-sdk/client-ecs";
import {
  ElasticLoadBalancingV2Client,
  CreateLoadBalancerCommand,
  CreateTargetGroupCommand,
  CreateListenerCommand,
  DescribeLoadBalancersCommand,
  DescribeTargetGroupsCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import {
  EC2Client,
  DescribeSubnetsCommand,
} from "@aws-sdk/client-ec2";
import {
  IAMClient,
  CreateRoleCommand,
  GetRoleCommand,
} from "@aws-sdk/client-iam";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ensureDynamoDbPolicy, ensureDynamoDbTables } from "./dynamodb.js";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const APP_NAME = "code-with-quarkus";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "../..");
const BACKEND_DIR = path.resolve(PROJECT_ROOT, "backend");
const REGION = process.env.AWS_REGION || "us-east-1";
const CLUSTER_NAME = `${APP_NAME}-cluster`;
const SERVICE_NAME = `${APP_NAME}-service`;
const ALB_NAME = `${APP_NAME}-alb`;
const TARGET_GROUP_NAME = `${APP_NAME}-tg`;

const ecr = new ECRClient({ region: REGION });
const ecs = new ECSClient({ region: REGION });
const elbv2 = new ElasticLoadBalancingV2Client({ region: REGION });
const ec2 = new EC2Client({ region: REGION });
const iam = new IAMClient({ region: REGION });
const sts = new STSClient({ region: REGION });
const dynamodb = new DynamoDBClient({ region: REGION });

const TASK_ROLE_NAME = `${APP_NAME}-task-role`;

const ASSUME_ROLE_POLICY = JSON.stringify({
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: { Service: "ecs-tasks.amazonaws.com" },
      Action: "sts:AssumeRole",
    },
  ],
});

async function getAccountId(): Promise<string> {
  const ident = await sts.send(new GetCallerIdentityCommand({}));
  if (!ident.Account) throw new Error("Could not resolve AWS account id from STS");
  return ident.Account;
}

async function getOrCreateTaskRole(accountId: string): Promise<string> {
  const roleArn = `arn:aws:iam::${accountId}:role/${TASK_ROLE_NAME}`;

  try {
    await iam.send(new GetRoleCommand({ RoleName: TASK_ROLE_NAME }));
    console.log("Using existing ECS task role");
  } catch {
    await iam.send(
      new CreateRoleCommand({
        RoleName: TASK_ROLE_NAME,
        AssumeRolePolicyDocument: ASSUME_ROLE_POLICY,
      })
    );
    console.log("Created ECS task role, waiting for propagation...");
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  await ensureDynamoDbPolicy(iam, TASK_ROLE_NAME, REGION, accountId);
  return roleArn;
}

async function getOrCreateRepository(): Promise<string> {
  try {
    const result = await ecr.send(
      new DescribeRepositoriesCommand({ repositoryNames: [APP_NAME] })
    );
    return result.repositories![0].repositoryUri!;
  } catch {
    const result = await ecr.send(
      new CreateRepositoryCommand({ repositoryName: APP_NAME })
    );
    console.log("Created ECR repository");
    return result.repository!.repositoryUri!;
  }
}

async function loginToEcr(): Promise<void> {
  const result = await ecr.send(new GetAuthorizationTokenCommand({}));
  const authData = result.authorizationData![0];
  const token = Buffer.from(authData.authorizationToken!, "base64").toString();
  const [username, password] = token.split(":");
  const registry = authData.proxyEndpoint!;

  execSync(`docker login --username ${username} --password ${password} ${registry}`, {
    stdio: "inherit",
  });
}

function ensureJwtKeys(): void {
  const resourcesDir = path.join(BACKEND_DIR, "src", "main", "resources");
  const privateKeyPath = path.join(resourcesDir, "privateKey.pem");
  const publicKeyPath = path.join(resourcesDir, "publicKey.pem");

  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    console.log("Generating JWT RSA key pair...");
    execSync(`openssl genrsa -out "${privateKeyPath}" 2048`, { stdio: "inherit" });
    execSync(`openssl rsa -in "${privateKeyPath}" -pubout -out "${publicKeyPath}"`, { stdio: "inherit" });
    console.log("JWT keys generated");
  } else {
    console.log("JWT keys already exist");
  }
}

function buildAndPushImage(repositoryUri: string): string {
  const imageTag = `${repositoryUri}:latest`;
  const gradlew = path.join(PROJECT_ROOT, "gradlew");

  console.log("Building application...");
  ensureJwtKeys();
  execSync(`"${gradlew}" :backend:quarkusBuild`, { stdio: "inherit", cwd: PROJECT_ROOT });

  console.log("Building Docker image...");
  execSync(`docker build -f src/main/docker/Dockerfile.jvm -t ${imageTag} .`, {
    stdio: "inherit",
    cwd: BACKEND_DIR,
  });

  console.log("Pushing image to ECR...");
  execSync(`docker push ${imageTag}`, { stdio: "inherit" });

  return imageTag;
}

async function createCluster(): Promise<void> {
  try {
    await ecs.send(new CreateClusterCommand({ clusterName: CLUSTER_NAME }));
    console.log("Created ECS cluster");
  } catch (e: any) {
    if (!e.message?.includes("already exists")) throw e;
  }
}

async function getVpcId(): Promise<string> {
  const subnetIds = process.env.SUBNET_IDS?.split(",") || [];
  const result = await ec2.send(
    new DescribeSubnetsCommand({ SubnetIds: [subnetIds[0]] })
  );
  return result.Subnets![0].VpcId!;
}

async function getOrCreateALB(): Promise<{ albArn: string; dnsName: string }> {
  const subnetIds = process.env.SUBNET_IDS?.split(",") || [];
  const securityGroupIds = process.env.SECURITY_GROUP_IDS?.split(",") || [];

  // Check if ALB exists
  try {
    const result = await elbv2.send(
      new DescribeLoadBalancersCommand({ Names: [ALB_NAME] })
    );
    if (result.LoadBalancers?.[0]) {
      console.log("Using existing ALB");
      return {
        albArn: result.LoadBalancers[0].LoadBalancerArn!,
        dnsName: result.LoadBalancers[0].DNSName!,
      };
    }
  } catch {}

  // Create ALB
  const result = await elbv2.send(
    new CreateLoadBalancerCommand({
      Name: ALB_NAME,
      Subnets: subnetIds,
      SecurityGroups: securityGroupIds,
      Scheme: "internet-facing",
      Type: "application",
      IpAddressType: "ipv4",
    })
  );
  console.log("Created ALB");
  return {
    albArn: result.LoadBalancers![0].LoadBalancerArn!,
    dnsName: result.LoadBalancers![0].DNSName!,
  };
}

async function getOrCreateTargetGroup(): Promise<string> {
  // Check if target group exists
  try {
    const result = await elbv2.send(
      new DescribeTargetGroupsCommand({ Names: [TARGET_GROUP_NAME] })
    );
    if (result.TargetGroups?.[0]) {
      console.log("Using existing target group");
      return result.TargetGroups[0].TargetGroupArn!;
    }
  } catch {}

  const vpcId = await getVpcId();

  const result = await elbv2.send(
    new CreateTargetGroupCommand({
      Name: TARGET_GROUP_NAME,
      Protocol: "HTTP",
      Port: 8080,
      VpcId: vpcId,
      TargetType: "ip",
      HealthCheckEnabled: true,
      HealthCheckPath: "/q/health/live",
      HealthCheckProtocol: "HTTP",
      HealthCheckIntervalSeconds: 30,
      HealthCheckTimeoutSeconds: 5,
      HealthyThresholdCount: 2,
      UnhealthyThresholdCount: 3,
    })
  );
  console.log("Created target group");
  return result.TargetGroups![0].TargetGroupArn!;
}

async function createListenerIfNeeded(albArn: string, targetGroupArn: string): Promise<void> {
  try {
    await elbv2.send(
      new CreateListenerCommand({
        LoadBalancerArn: albArn,
        Protocol: "HTTP",
        Port: 80,
        DefaultActions: [
          {
            Type: "forward",
            TargetGroupArn: targetGroupArn,
          },
        ],
      })
    );
    console.log("Created ALB listener");
  } catch (e: any) {
    if (!e.message?.includes("already exists")) throw e;
    console.log("Using existing ALB listener");
  }
}

async function registerTaskDefinition(imageUri: string, taskRoleArn: string, accountId: string): Promise<string> {
  const result = await ecs.send(
    new RegisterTaskDefinitionCommand({
      family: APP_NAME,
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      cpu: "512",
      memory: "1024",
      executionRoleArn: `arn:aws:iam::${accountId}:role/ecsTaskExecutionRole`,
      taskRoleArn: taskRoleArn,
      containerDefinitions: [
        {
          name: APP_NAME,
          image: imageUri,
          portMappings: [{ containerPort: 8080, protocol: "tcp" }],
          essential: true,
          environment: [
            { name: "QUARKUS_PROFILE", value: "ecs" },
            { name: "AWS_REGION", value: REGION },
          ],
          logConfiguration: {
            logDriver: "awslogs",
            options: {
              "awslogs-group": `/ecs/${APP_NAME}`,
              "awslogs-region": REGION,
              "awslogs-stream-prefix": "ecs",
            },
          },
        },
      ],
    })
  );
  console.log("Registered task definition");
  return result.taskDefinition!.taskDefinitionArn!;
}

async function createOrUpdateService(taskDefinitionArn: string, targetGroupArn: string): Promise<void> {
  const subnetIds = process.env.SUBNET_IDS?.split(",") || [];
  const securityGroupIds = process.env.SECURITY_GROUP_IDS?.split(",") || [];

  try {
    const services = await ecs.send(
      new DescribeServicesCommand({
        cluster: CLUSTER_NAME,
        services: [SERVICE_NAME],
      })
    );

    if (services.services?.[0]?.status === "ACTIVE") {
      await ecs.send(
        new UpdateServiceCommand({
          cluster: CLUSTER_NAME,
          service: SERVICE_NAME,
          taskDefinition: taskDefinitionArn,
          desiredCount: 1,
          forceNewDeployment: true,
        })
      );
      console.log("Updated ECS service");
      return;
    }
  } catch {}

  await ecs.send(
    new CreateServiceCommand({
      cluster: CLUSTER_NAME,
      serviceName: SERVICE_NAME,
      taskDefinition: taskDefinitionArn,
      desiredCount: 1,
      launchType: "FARGATE",
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: subnetIds,
          securityGroups: securityGroupIds,
          assignPublicIp: "ENABLED",
        },
      },
      loadBalancers: [
        {
          targetGroupArn: targetGroupArn,
          containerName: APP_NAME,
          containerPort: 8080,
        },
      ],
    })
  );
  console.log("Created ECS service");
}

async function deploy() {
  console.log("Starting deployment to AWS ECS...\n");

  const accountId = await getAccountId();
  console.log(`Account: ${accountId}  Region: ${REGION}`);

  const taskRoleArn = await getOrCreateTaskRole(accountId);
  await ensureDynamoDbTables(dynamodb);

  const repositoryUri = await getOrCreateRepository();
  await loginToEcr();
  const imageUri = buildAndPushImage(repositoryUri);
  await createCluster();

  // Setup ALB
  const { albArn, dnsName } = await getOrCreateALB();
  const targetGroupArn = await getOrCreateTargetGroup();
  await createListenerIfNeeded(albArn, targetGroupArn);

  const taskDefinitionArn = await registerTaskDefinition(imageUri, taskRoleArn, accountId);
  await createOrUpdateService(taskDefinitionArn, targetGroupArn);

  console.log("\n========================================");
  console.log("Deployment complete!");
  console.log(`\nApplication URL: http://${dnsName}`);
  console.log("========================================\n");
}

deploy().catch(console.error);
