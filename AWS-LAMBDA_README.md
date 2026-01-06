# AWS Lambda Deployment

Deploy the Quarkus application to AWS Lambda + API Gateway HTTP API using `deploy-AWS-Lambda.ts`.

## Terminology

**Lambda**
Serverless compute service that runs code in response to events. Pay only for compute time used (per millisecond). Scales automatically from zero.

**API Gateway HTTP API**
Lightweight HTTP endpoint for Lambda. Cheaper and faster than REST API. Provides stable URL and routes requests to Lambda.

**Cold Start**
First invocation after idle period takes longer (~2s for Quarkus JVM). Subsequent requests are fast (~100ms).

**Execution Role**
IAM role that grants Lambda permission to write logs to CloudWatch.

## Prerequisites

- AWS CLI configured (`aws configure`)
- Node.js 18+

## Setup

1. Install dependencies:
```bash
npm install
```

2. Add to `.env` file:
```bash
AWS_REGION=eu-central-1
LAMBDA_FUNCTION=code-with-quarkus
LAMBDA_ROLE=lambda-execution-role
```

## Deploy

```bash
npx tsx deploy-AWS-Lambda.ts
```

## What the script does

1. Builds Quarkus app with `legacy-jar` packaging for Lambda
2. Creates IAM execution role (if needed)
3. Creates or updates Lambda function
4. Creates HTTP API with Lambda integration
5. Outputs the API URL

## Access your application

The deployment script outputs the HTTP API URL:
```
https://<api-id>.execute-api.<region>.amazonaws.com/hello
```

Get API URL manually:
```bash
source .env
aws apigatewayv2 get-apis --region $AWS_REGION --query "Items[?Name=='${LAMBDA_FUNCTION}-http-api'].ApiEndpoint" --output text
```

## Cost

**Pay-per-request with generous free tier:**

| Resource | Free Tier | Price After |
|----------|-----------|-------------|
| Lambda Requests | 1M/month | $0.20/1M |
| Lambda Compute | 400K GB-sec/month | ~$0.017/GB-sec |
| API Gateway | 1M requests/month (12mo) | $1.00/1M |

For low-traffic sites, effectively **free**.

## Delete Resources

```bash
source .env
```

Delete API Gateway:
```bash
API_ID=$(aws apigatewayv2 get-apis --region $AWS_REGION --query "Items[?Name=='${LAMBDA_FUNCTION}-http-api'].ApiId" --output text)
aws apigatewayv2 delete-api --api-id $API_ID --region $AWS_REGION
```

Delete Lambda function:
```bash
aws lambda delete-function --function-name $LAMBDA_FUNCTION --region $AWS_REGION
```

Delete IAM role:
```bash
aws iam detach-role-policy --role-name $LAMBDA_ROLE --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name $LAMBDA_ROLE
```

## Resources created

- Lambda function: `code-with-quarkus`
- HTTP API: `code-with-quarkus-http-api`
- IAM role: `lambda-execution-role`
- CloudWatch log group: `/aws/lambda/code-with-quarkus`
