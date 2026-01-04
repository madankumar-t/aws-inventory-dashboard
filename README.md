# AWS Inventory Dashboard

Enterprise-grade AWS resource inventory dashboard with multi-account, multi-region support, SAML SSO, and role-based access control.

## Features

### Core Capabilities
- ✅ **Multi-Account Support**: Query resources across AWS Organizations member accounts
- ✅ **Multi-Region Support**: Parallel collection from multiple AWS regions
- ✅ **SAML SSO**: Federated authentication with Azure AD, Okta, Ping, ADFS
- ✅ **Role-Based Access Control**: Fine-grained permissions based on IdP groups
- ✅ **Real-time Inventory**: Live querying of AWS resources
- ✅ **Export Functionality**: CSV and JSON export
- ✅ **Search & Filter**: Global search across all resource attributes
- ✅ **Responsive UI**: Modern Material UI design

### Supported Services
- **EC2**: Instances, VPCs, Subnets, Security Groups
- **S3**: Buckets with encryption, versioning, public access status
- **RDS**: Database instances with encryption status
- **DynamoDB**: Tables with billing mode and item counts
- **IAM**: Roles with assume role policies
- **VPC**: Virtual Private Clouds with subnets
- **EKS**: Kubernetes clusters with node groups
- **ECS**: Container clusters with services and tasks

### Future Services (Extensible)
- Lambda functions
- ELB/ALB/NLB load balancers
- CloudFront distributions
- Route53 hosted zones
- SQS queues
- SNS topics

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

### High-Level Overview

```
Frontend (Next.js) → API Gateway → Lambda → AssumeRole → AWS Services
         ↓
    Cognito (SAML) → Corporate IdP
```

## Project Structure

```
inventory-dashboard/
├── backend/          # Lambda backend (Python 3.12)
├── frontend/         # Next.js frontend (TypeScript + Material UI)
└── frontend-react/   # ⚠️ LEGACY - Old React app (can be removed)
```

**Note**: The `frontend-react/` folder is the old basic React implementation. Use `frontend/` instead.

## Prerequisites

### Backend
- AWS CLI configured
- AWS SAM CLI installed
- Python 3.12 (forward-compatible with 3.14+)
- Access to AWS Organizations (for multi-account)

### Frontend
- Node.js 18+
- npm or yarn

### AWS Setup
- AWS Organizations (optional, for multi-account)
- IAM role `InventoryReadRole` in each member account (see deployment guide)

## Quick Start

### 1. Backend Deployment

```bash
cd backend

# Install dependencies
pip install -r requirements.txt -t layer/python/lib/python3.11/site-packages/

# Build and deploy
sam build
sam deploy --guided
```

**Important Parameters:**
- `ExternalId`: Security token for AssumeRole (generate a random UUID)
- `InventoryRoleName`: Name of IAM role in member accounts (default: `InventoryReadRole`)
- `CognitoDomain`: Optional custom domain for Cognito Hosted UI

**Capture Outputs:**
- `ApiUrl`: API Gateway endpoint
- `UserPoolId`: Cognito User Pool ID
- `ClientId`: Cognito App Client ID
- `CognitoDomain`: Cognito domain name

### 2. Configure Cognito

#### Create Groups
```bash
aws cognito-idp create-group \
  --user-pool-id <UserPoolId> \
  --group-name admins

aws cognito-idp create-group \
  --user-pool-id <UserPoolId> \
  --group-name read-only

aws cognito-idp create-group \
  --user-pool-id <UserPoolId> \
  --group-name security
```

#### Configure SAML Identity Provider (Optional)

1. Go to AWS Console → Cognito → User Pools → Your Pool → Sign-in experience → Federated identity provider sign-in
2. Add SAML provider (Azure AD, Okta, etc.)
3. Configure attribute mapping:
   - `email` → `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`
   - `groups` → `http://schemas.microsoft.com/ws/2008/06/identity/claims/groups`
4. Update `CognitoUserPoolClient` in template.yaml to include SAML provider

### 3. Setup Multi-Account IAM Roles

In each member account, create the `InventoryReadRole`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::MANAGEMENT_ACCOUNT:role/InventoryFunction-ExecutionRole"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "YOUR_EXTERNAL_ID"
        }
      }
    }
  ]
}
```

Attach read-only policies (see ARCHITECTURE.md for full policy).

### 4. Frontend Deployment (Optional - Only for Production)

**For Testing**: You DON'T need to deploy the frontend. Just run it locally with `npm run dev`.

**For Production**: Deploy frontend to S3/CloudFront or Vercel.

```bash
cd frontend

# Build
npm run build

# Deploy to S3 + CloudFront (or use your preferred hosting)
# See DEPLOYMENT.md for detailed instructions
```

**Environment Variables for Production:**
```env
NEXT_PUBLIC_API_URL=https://your-api.execute-api.region.amazonaws.com/prod
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxx
NEXT_PUBLIC_COGNITO_REGION=us-east-1
NEXT_PUBLIC_COGNITO_DOMAIN=your-domain-name
```

### 5. Local Development

#### Backend
```bash
cd backend
sam local start-api
```

#### Frontend
```bash
cd frontend
npm run dev
```

## Usage

### Authentication

1. Navigate to the dashboard
2. Click "Sign In with SSO"
3. Authenticate with your corporate IdP (if SAML configured) or Cognito
4. You'll be redirected back with a JWT token

### Access Control

**Group-Based Permissions:**
- `admins` / `infra-admins`: Full access to all services
- `read-only` / `cloud-readonly`: Access to EC2 and S3 only
- `security`: Access to IAM, EC2, S3, RDS, VPC (security-focused)

### Querying Resources

1. Select a service from the sidebar
2. Optionally filter by:
   - Account(s)
   - Region(s)
   - Search term
3. View results in the table
4. Click a resource to see detailed information

### Exporting Data

1. Use the export endpoint: `/inventory/export?service=ec2&format=csv`
2. Or use the API client in the frontend

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── app.py                 # Main Lambda handler
│   │   ├── collectors/           # Service collectors
│   │   │   ├── base.py
│   │   │   ├── ec2_collector.py
│   │   │   ├── s3_collector.py
│   │   │   └── ...
│   │   └── utils/
│   │       ├── aws_client.py    # Multi-account client manager
│   │       ├── auth.py           # RBAC utilities
│   │       └── response.py       # Lambda response helpers
│   ├── template.yaml             # SAM template
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js app router
│   │   │   ├── page.tsx          # Login page
│   │   │   └── dashboard/        # Dashboard pages
│   │   ├── components/           # React components
│   │   ├── lib/                  # Utilities
│   │   │   ├── auth.ts           # Cognito auth
│   │   │   └── api.ts            # API client
│   │   └── types/                # TypeScript types
│   └── package.json
├── ARCHITECTURE.md               # Architecture documentation
└── README.md                     # This file
```

## Security Best Practices

1. **ExternalId**: Always use ExternalId for AssumeRole to prevent confused deputy attacks
2. **Least Privilege**: IAM roles have read-only permissions
3. **HTTPS Only**: All traffic encrypted in transit
4. **JWT Validation**: API Gateway validates tokens server-side
5. **RBAC**: Authorization enforced in Lambda (not just frontend)
6. **Audit Logging**: CloudTrail logs all AssumeRole calls
7. **No Secrets**: No credentials stored in code or environment variables

## Troubleshooting

### Lambda Timeout
- Increase timeout in `template.yaml` (default: 300 seconds)
- Reduce number of regions/accounts queried simultaneously

### AssumeRole Fails
- Verify ExternalId matches in both accounts
- Check trust policy allows management account role
- Ensure role name matches `InventoryRoleName` parameter

### Cognito SAML Not Working
- Verify SAML metadata URL is accessible
- Check attribute mapping matches IdP claims
- Ensure user is assigned to a group

### Frontend Can't Connect to API
- Verify CORS headers in API Gateway
- Check API URL in environment variables
- Verify JWT token is included in Authorization header

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check ARCHITECTURE.md for detailed architecture information
- Review CloudWatch Logs for Lambda errors

## Roadmap

- [ ] Historical snapshots and drift detection
- [ ] Scheduled reports (EventBridge)
- [ ] Real-time updates (WebSocket)
- [ ] Additional AWS services (Lambda, ELB, CloudFront, etc.)
- [ ] Cost analysis integration
- [ ] Compliance reporting
- [ ] Resource tagging management
- [ ] Bulk operations

