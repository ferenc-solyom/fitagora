# AWS ECS Deployment

Deploy the Quarkus application to AWS ECS Fargate using `deploy-AWS-ecs.ts`.

## AWS Terminology

### Core Services

**ECS (Elastic Container Service)**
AWS's container orchestration service. It manages running Docker containers across a cluster of machines. Similar to Kubernetes but simpler and AWS-native.

**ECR (Elastic Container Registry)**
AWS's Docker image registry. Like Docker Hub, but private and integrated with AWS. Stores your container images that ECS pulls from when starting tasks.

**Fargate**
A serverless compute engine for containers. Instead of managing EC2 instances yourself, Fargate automatically provisions and scales the underlying infrastructure. You only pay for the CPU/memory your containers use.

### ECS Concepts

**Cluster**
A logical grouping of tasks and services. Think of it as a namespace for your container workloads.

**Task Definition**
A blueprint for your application. Defines which Docker image to use, CPU/memory requirements, port mappings, environment variables, and logging configuration. Like a docker-compose file.

**Task**
A running instance of a Task Definition. One task can contain multiple containers that share resources and network.

**Service**
Manages long-running tasks. Ensures a specified number of tasks are always running, handles deployments, and integrates with load balancers.

### Networking

**VPC (Virtual Private Cloud)**
Your isolated network in AWS. Contains subnets, route tables, and gateways.

**Subnet**
A subdivision of a VPC with its own IP range. Tasks are launched into subnets. Public subnets can have public IPs; private subnets cannot.

**Security Group**
A virtual firewall controlling inbound/outbound traffic. Our `quarkus-sg` allows traffic on port 8080.

**ENI (Elastic Network Interface)**
A virtual network card attached to each Fargate task. Each task gets its own ENI with a private IP, and optionally a public IP. **Note:** Public IPs are dynamic - they change when tasks restart.

### Load Balancing

**ALB (Application Load Balancer)**
A Layer 7 load balancer that routes HTTP/HTTPS traffic. Provides a stable DNS name that doesn't change when tasks restart. Performs health checks and distributes traffic across multiple tasks.

**Target Group**
A group of targets (in our case, ECS task IPs) that the ALB routes traffic to. Defines health check settings and the port to forward traffic to.

**Listener**
Configured on the ALB to accept incoming traffic on a specific port (e.g., port 80 for HTTP) and forward it to the target group.

### IAM & Logging

**ecsTaskExecutionRole**
An IAM role that grants ECS permission to pull images from ECR and write logs to CloudWatch on behalf of your task.

**CloudWatch Logs**
AWS's logging service. Container stdout/stderr is automatically sent to the log group `/ecs/code-with-quarkus`.

### Why Use ALB Instead of Public IP

Fargate tasks are ephemeral. Each new task gets a fresh ENI with a new public IP. The ALB provides:
- **Stable DNS name** - doesn't change when tasks restart
- **Health checks** - automatically routes traffic only to healthy tasks
- **Load balancing** - distributes traffic across multiple tasks
- **SSL/TLS termination** - can handle HTTPS (with ACM certificates)

## Prerequisites

- AWS CLI configured (`aws configure`)
- Docker running
- Node.js 18+
- `ecsTaskExecutionRole` IAM role in your account

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```bash
   AWS_REGION=eu-central-1
   AWS_ACCOUNT_ID=<your-account-id>
   ECS_CLUSTER=code-with-quarkus-cluster
   ECS_SERVICE=code-with-quarkus-service
   ALB_NAME=code-with-quarkus-alb
   SUBNET_IDS=<subnet-1>,<subnet-2>
   SECURITY_GROUP_IDS=<sg-id>
   ```

   Get subnet/security group IDs:
   ```bash
   aws ec2 describe-subnets --query 'Subnets[*].[SubnetId,AvailabilityZone]' --output table
   aws ec2 describe-security-groups --query 'SecurityGroups[*].[GroupId,GroupName]' --output table
   ```

## Deploy

```bash
npx tsx deploy-AWS-ECS.ts
```

Or use npm script:
```bash
npm run deploy
```

## What the script does

1. Creates ECR repository (if needed)
2. Builds the Quarkus application (`./gradlew build`)
3. Builds Docker image using `src/main/docker/Dockerfile.jvm`
4. Pushes image to ECR
5. Creates ECS cluster with Fargate
6. Creates ALB, target group, and listener (if needed)
7. Registers task definition and creates/updates the service with ALB

## Access your application

The deployment script outputs the ALB DNS name. Or get it with: `source .env`

```bash
# Get ALB DNS
aws elbv2 describe-load-balancers --names $ALB_NAME --region $AWS_REGION --query 'LoadBalancers[0].DNSName' --output text

# Get task public IP (changes on restart)
TASK=$(aws ecs list-tasks --cluster $ECS_CLUSTER --service-name $ECS_SERVICE --region $AWS_REGION --query 'taskArns[0]' --output text) && ENI=$(aws ecs describe-tasks --cluster $ECS_CLUSTER --tasks "$TASK" --region $AWS_REGION --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text) && aws ec2 describe-network-interfaces --network-interface-ids "$ENI" --region $AWS_REGION --query 'NetworkInterfaces[0].Association.PublicIp' --output text
```

## Resources created

- ECR repository: `code-with-quarkus`
- ECS cluster: `code-with-quarkus-cluster`
- ECS service: `code-with-quarkus-service`
- ALB: `code-with-quarkus-alb`
- Target group: `code-with-quarkus-tg`
- CloudWatch log group: `/ecs/code-with-quarkus`

## Cost Warning

**ECS Fargate + ALB costs ~$30/month running 24/7, even with zero traffic.** Stop the service when not in use.

## Start and Stop Service

Load env vars first:
```bash
source .env
```

Stop service:
```bash
aws ecs update-service --cluster $ECS_CLUSTER --service $ECS_SERVICE --desired-count 0 --region $AWS_REGION
```

Start service:
```bash
aws ecs update-service --cluster $ECS_CLUSTER --service $ECS_SERVICE --desired-count 1 --region $AWS_REGION
```

Check status (ACTIVE=service exists, running:0=no cost):
```bash
aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_REGION --query 'services[0].{status:status,desired:desiredCount,running:runningCount}'
```

Delete ALB (to fully stop costs when service is stopped):
```bash
aws elbv2 delete-load-balancer --load-balancer-arn $(aws elbv2 describe-load-balancers --names $ALB_NAME --region $AWS_REGION --query 'LoadBalancers[0].LoadBalancerArn' --output text) --region $AWS_REGION
```

If ALB was deleted, redeploy to recreate: `npx tsx deploy-AWS-ecs.ts`
