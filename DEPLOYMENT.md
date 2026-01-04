# Deployment Guide

## Backend Deployment

### Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **AWS SAM CLI** installed (`pip install aws-sam-cli`)
3. **Python 3.12** installed (latest stable, forward-compatible with 3.14+)
4. **Docker** (for local testing with `sam local`)

### Step 1: Prepare Dependencies

```bash
cd backend

# Option 1: Use setup script (recommended)
./setup_layer.sh

# Option 2: Manual setup
mkdir -p layer/python/lib/python3.12/site-packages
pip install -r requirements.txt -t layer/python/lib/python3.12/site-packages/
```

**Note**: The code uses Python 3.12 (latest stable) and is forward-compatible with Python 3.14+. See `README_PYTHON_VERSION.md` for details.

### Step 2: Build SAM Application

```bash
sam build
```

This will:
- Install Python dependencies
- Copy source code
- Prepare Lambda deployment package

### Step 3: Deploy

```bash
sam deploy --guided
```

**Parameters to configure:**
- `Stack Name`: `aws-inventory-dashboard`
- `AWS Region`: `us-east-1` (or your preferred region)
- `ExternalId`: Generate a random UUID (e.g., `uuidgen` on macOS/Linux)
- `InventoryRoleName`: `InventoryReadRole` (default)
- `CognitoDomain`: Leave empty for auto-generated, or provide custom domain

**Important:** Save the `ExternalId` - you'll need it for member account IAM roles.

### Step 4: Capture Outputs

After deployment, note these outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name aws-inventory-dashboard \
  --query 'Stacks[0].Outputs'
```

**Required outputs:**
- `ApiUrl`: API Gateway endpoint
- `UserPoolId`: Cognito User Pool ID
- `ClientId`: Cognito App Client ID
- `CognitoDomain`: Cognito domain name

### Step 5: Configure Cognito Groups

```bash
USER_POOL_ID="<from outputs>"

# Create groups
aws cognito-idp create-group \
  --user-pool-id $USER_POOL_ID \
  --group-name admins \
  --description "Full access to all services"

aws cognito-idp create-group \
  --user-pool-id $USER_POOL_ID \
  --group-name read-only \
  --description "Read-only access to EC2 and S3"

aws cognito-idp create-group \
  --user-pool-id $USER_POOL_ID \
  --group-name security \
  --description "Security-focused access"
```

### Step 6: Configure SAML Identity Provider (Optional)

#### For Azure AD:

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Create new registration
3. Configure:
   - Redirect URI: `https://<CognitoDomain>.auth.<region>.amazoncognito.com/saml2/idpresponse`
   - Logout URL: `https://<CognitoDomain>.auth.<region>.amazoncognito.com/saml2/logout`
4. Get Federation Metadata URL
5. In AWS Console → Cognito → User Pools → Your Pool:
   - Add SAML identity provider
   - Metadata URL: `https://login.microsoftonline.com/<tenant-id>/federationmetadata/2007-06/federationmetadata.xml`
   - Attribute mapping:
     - `email` → `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`
     - `groups` → `http://schemas.microsoft.com/ws/2008/06/identity/claims/groups`

#### For Okta:

1. Create SAML 2.0 application in Okta
2. Configure:
   - Single sign-on URL: `https://<CognitoDomain>.auth.<region>.amazoncognito.com/saml2/idpresponse`
   - Audience URI: `urn:amazon:cognito:sp:<UserPoolId>`
3. Download SAML metadata
4. In Cognito, upload metadata document or provide metadata URL

### Step 7: Setup Multi-Account IAM Roles

For each member account, create the `InventoryReadRole`:

#### Trust Policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<MANAGEMENT_ACCOUNT_ID>:role/aws-inventory-dashboard-InventoryFunction-<RANDOM>"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "<EXTERNAL_ID_FROM_DEPLOYMENT>"
        }
      }
    }
  ]
}
```

#### Permissions Policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "s3:GetBucketVersioning",
        "s3:GetBucketEncryption",
        "s3:GetBucketPolicyStatus",
        "s3:GetBucketTagging",
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters",
        "dynamodb:ListTables",
        "dynamodb:DescribeTable",
        "iam:ListRoles",
        "iam:GetRole",
        "eks:ListClusters",
        "eks:DescribeCluster",
        "eks:ListNodegroups",
        "ecs:ListClusters",
        "ecs:DescribeClusters",
        "ecs:ListServices",
        "ecs:ListTasks"
      ],
      "Resource": "*"
    }
  ]
}
```

**To get the management account role ARN:**

```bash
aws iam get-role \
  --role-name aws-inventory-dashboard-InventoryFunction-<RANDOM> \
  --query 'Role.Arn'
```

Or check CloudFormation stack outputs.

### Step 8: Test Backend

```bash
# Get a test token (if using Cognito directly)
# Or use Postman/curl with a valid JWT

curl -X GET \
  "https://<ApiUrl>/inventory?service=ec2&page=1&size=10" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

## Frontend Deployment

### Option 1: S3 + CloudFront (Recommended for Production)

#### Step 1: Build

```bash
cd frontend
npm install
npm run build
```

#### Step 2: Create S3 Bucket

```bash
aws s3 mb s3://aws-inventory-dashboard-ui
aws s3 website s3://aws-inventory-dashboard-ui \
  --index-document index.html \
  --error-document index.html
```

#### Step 3: Upload Build

```bash
aws s3 sync .next/static s3://aws-inventory-dashboard-ui/static
aws s3 cp .next/standalone/. s3://aws-inventory-dashboard-ui/ --recursive
```

#### Step 4: Configure CloudFront

1. Create CloudFront distribution
2. Origin: S3 bucket (or S3 website endpoint)
3. Viewer Protocol Policy: Redirect HTTP to HTTPS
4. Default Root Object: `index.html`
5. Error Pages: 404 → `/index.html` (for client-side routing)

#### Step 5: Set Environment Variables

Create `.env.production`:

```env
NEXT_PUBLIC_API_URL=https://<ApiUrl>
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<UserPoolId>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<ClientId>
NEXT_PUBLIC_COGNITO_REGION=<region>
NEXT_PUBLIC_COGNITO_DOMAIN=<CognitoDomain>
```

Rebuild with production env vars:

```bash
npm run build
```

### Option 2: Vercel (Easiest)

1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Option 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Post-Deployment Configuration

### 1. Update Cognito Callback URLs

In AWS Console → Cognito → User Pools → Your Pool → App integration:

Add your frontend URLs to:
- **Allowed callback URLs**: `https://your-domain.com/auth/callback`
- **Allowed sign-out URLs**: `https://your-domain.com`

### 2. Configure CORS (if needed)

If frontend is on a different domain, update API Gateway CORS settings.

### 3. Enable CloudWatch Logs

Logs are automatically enabled. Monitor:
- `/aws/lambda/aws-inventory-dashboard-InventoryFunction-*`
- API Gateway access logs

### 4. Set Up Alarms

```bash
# Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name inventory-lambda-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

## Troubleshooting

### Deployment Fails

- Check IAM permissions for SAM
- Verify region supports all services
- Check CloudFormation stack events

### Lambda Timeout

- Increase timeout in `template.yaml`
- Reduce number of regions queried
- Check CloudWatch Logs for errors

### AssumeRole Fails

- Verify ExternalId matches
- Check trust policy
- Ensure role exists in target account
- Check CloudTrail for detailed errors

### Frontend Can't Authenticate

- Verify callback URLs in Cognito
- Check CORS settings
- Verify environment variables
- Check browser console for errors

## Rollback

```bash
# Delete stack
aws cloudformation delete-stack --stack-name aws-inventory-dashboard

# Or rollback to previous version
aws cloudformation cancel-update-stack --stack-name aws-inventory-dashboard
```

## Updates

```bash
# Make changes to code
# Rebuild
sam build

# Deploy updates
sam deploy
```

## Cleanup

```bash
# Delete stack
sam delete --stack-name aws-inventory-dashboard

# Delete S3 bucket
aws s3 rb s3://aws-inventory-dashboard-ui --force
```
