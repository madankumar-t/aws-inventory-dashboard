# AWS Inventory Dashboard - Architecture Documentation

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React UI   │  │  Material UI │  │  TypeScript  │          │
│  │  Components  │  │   Theming     │  │   Types      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│           │                                                      │
│           │ HTTPS (JWT Token)                                    │
└───────────┼──────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS COGNITO (Auth Layer)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  User Pool + Hosted UI (OAuth2 Authorization Code Flow)  │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                                      │
│           │ SAML Federation                                      │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Corporate IdP (Azure AD / Okta / Ping / ADFS)          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
            │
            │ JWT Token (ID Token)
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (REST API)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Cognito Authorizer (Validates JWT, Extracts Groups)     │  │
│  └──────────────────────────────────────────────────────────┘  │
│           │                                                      │
│           │ Authorized Request                                   │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Lambda Function (Python)                                │  │
│  │  - Multi-account support (AssumeRole)                     │  │
│  │  - Multi-region parallel collection                      │  │
│  │  - Service collectors (EC2, S3, RDS, etc.)              │  │
│  │  - RBAC enforcement                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
            │
            │ AssumeRole (with ExternalId)
            ▼
┌─────────────────────────────────────────────────────────────────┐
│              AWS ORGANIZATIONS (Multi-Account)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Account 1   │  │  Account 2   │  │  Account N   │        │
│  │  (Prod)      │  │  (Dev)       │  │  (Staging)    │        │
│  │              │  │              │  │              │        │
│  │ InventoryRead│  │ InventoryRead│  │ InventoryRead│        │
│  │ Role         │  │ Role         │  │ Role         │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
            │
            │ Read-only API calls
            ▼
┌─────────────────────────────────────────────────────────────────┐
│              AWS SERVICES (Multi-Region)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │   EC2    │ │    S3    │ │   RDS    │ │   EKS    │ ...     │
│  │  VPC     │ │ DynamoDB │ │   IAM    │ │   ECS    │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  us-east-1, us-west-2, eu-west-1, ap-southeast-1, ...         │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Authentication Flow

```
User → Frontend → Cognito Hosted UI → IdP (SAML) → Cognito → JWT Token → Frontend
```

1. User clicks "Sign In with SSO" in frontend
2. Frontend redirects to Cognito Hosted UI
3. Cognito redirects to corporate IdP (SAML)
4. User authenticates with IdP
5. IdP sends SAML assertion to Cognito
6. Cognito issues JWT ID Token (contains groups from IdP)
7. Frontend receives token and stores it
8. Frontend includes token in API requests

### 2. Inventory Collection Flow

```
Frontend → API Gateway → Lambda → AssumeRole → Target Account → AWS Services
```

1. Frontend sends request with JWT token
2. API Gateway validates token via Cognito Authorizer
3. Lambda extracts groups from JWT claims
4. Lambda checks RBAC (can user access this service?)
5. Lambda determines target accounts and regions
6. For each account:
   - Lambda assumes InventoryReadRole in target account
   - Creates boto3 clients for each region
   - Collects resources in parallel using ThreadPoolExecutor
7. Lambda aggregates results, filters, paginates
8. Returns JSON response to frontend

### 3. Multi-Account Trust Model

```
Management Account (Lambda Execution Role)
    │
    │ AssumeRole (with ExternalId)
    ▼
Member Account (InventoryReadRole)
    │
    │ Trust Policy:
    │ - Principal: Management Account Lambda Role
    │ - Condition: ExternalId matches
    │ - Actions: sts:AssumeRole
    ▼
Read-only permissions to AWS services
```

**Security Best Practices:**
- ExternalId prevents confused deputy attacks
- Least-privilege IAM policies on InventoryReadRole
- No write permissions
- CloudTrail logs all AssumeRole calls

## Security Boundaries

### 1. Authentication Boundary
- **Entry Point**: Cognito Hosted UI
- **Validation**: API Gateway Cognito Authorizer
- **Token**: JWT ID Token (signed by Cognito)
- **Expiration**: 1 hour (configurable)

### 2. Authorization Boundary
- **Enforcement**: Lambda function (server-side)
- **Basis**: IdP group claims in JWT
- **Rules**: Role-based access control (RBAC)
- **Audit**: CloudWatch Logs + CloudTrail

### 3. Network Boundary
- **Frontend**: S3 + CloudFront (HTTPS only)
- **API**: API Gateway (HTTPS only)
- **Backend**: Lambda (VPC optional, not required)

### 4. Data Boundary
- **Read-only**: All AWS API calls are read-only
- **No PII**: No sensitive data stored
- **Encryption**: TLS in transit, S3 encryption at rest

## IAM Trust Model

### Management Account (Lambda Execution Role)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sts:AssumeRole",
        "organizations:ListAccounts"
      ],
      "Resource": "arn:aws:iam::*:role/InventoryReadRole"
    }
  ]
}
```

### Member Account (InventoryReadRole)

**Trust Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::MANAGEMENT_ACCOUNT:role/LambdaExecutionRole"
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

**Permissions Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "s3:ListAllMyBuckets",
        "s3:GetBucket*",
        "rds:Describe*",
        "dynamodb:ListTables",
        "dynamodb:DescribeTable",
        "iam:ListRoles",
        "eks:ListClusters",
        "eks:Describe*",
        "ecs:List*",
        "ecs:Describe*"
      ],
      "Resource": "*"
    }
  ]
}
```

## Scalability Considerations

### 1. Lambda Concurrency
- **Default**: 1000 concurrent executions
- **Burst**: Can handle traffic spikes
- **Throttling**: Configure reserved concurrency if needed

### 2. Parallel Processing
- **Multi-region**: Uses ThreadPoolExecutor (10 workers default)
- **Multi-account**: Sequential account processing (can be parallelized)
- **Timeout**: 300 seconds (5 minutes) for large queries

### 3. API Gateway
- **Rate Limiting**: Configure usage plans if needed
- **Caching**: Can enable caching for summary endpoints
- **Throttling**: Default 10,000 requests/second

### 4. Frontend
- **Static Assets**: S3 + CloudFront (global CDN)
- **Client-side Caching**: React Query or SWR for API responses
- **Pagination**: Server-side pagination (50 items per page default)

### 5. Cost Optimization
- **Lambda**: Pay per request (minimal cost)
- **API Gateway**: $3.50 per million requests
- **CloudFront**: $0.085 per GB (first 10 TB)
- **Cognito**: $0.0055 per MAU (monthly active user)

## Extensibility

### Adding New Services

1. **Create Collector** (`backend/src/collectors/new_service_collector.py`):
```python
from .base import BaseCollector

class NewServiceCollector(BaseCollector):
    def __init__(self):
        super().__init__('newservice')
    
    def collect_single_region(self, client, region, account_id=None):
        # Implementation
        pass
```

2. **Register Collector** (`backend/src/collectors/__init__.py`):
```python
from .new_service_collector import NewServiceCollector
COLLECTORS['newservice'] = NewServiceCollector
```

3. **Add IAM Permissions** (`backend/template.yaml`):
```yaml
- newservice:Describe*
- newservice:List*
```

4. **Add Frontend Type** (`frontend/src/types/index.ts`):
```typescript
export interface NewServiceResource extends AWSResource {
  // Fields
}
```

5. **Add UI Component** (optional):
- Add to service selector
- Add to sidebar
- Create service-specific views

### Adding New Authorization Rules

Edit `backend/src/utils/auth.py`:
```python
def can_access_service(groups: List[str], service: str) -> bool:
    # Add new rules
    if 'new-group' in groups:
        return service in ['ec2', 's3', 'newservice']
```

## Deployment Architecture

### Backend Deployment (SAM)

```bash
cd backend
sam build
sam deploy --guided
```

**Outputs:**
- API URL
- Cognito User Pool ID
- Cognito Client ID
- Cognito Domain

### Frontend Deployment

```bash
cd frontend
npm install
npm run build
# Deploy to S3 + CloudFront
```

**Environment Variables:**
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`
- `NEXT_PUBLIC_COGNITO_REGION`
- `NEXT_PUBLIC_COGNITO_DOMAIN`

## Monitoring & Observability

### CloudWatch Logs
- Lambda function logs
- API Gateway access logs
- Error tracking

### CloudTrail
- All AssumeRole calls
- API Gateway requests
- IAM policy changes

### Metrics
- Lambda invocations, duration, errors
- API Gateway 4XX/5XX errors
- Cognito sign-ins

## Future Improvements

1. **Caching Layer**
   - DynamoDB for inventory cache (TTL-based)
   - Reduce API calls to AWS services

2. **Historical Tracking**
   - Store snapshots in S3
   - Compare snapshots for drift detection

3. **Scheduled Reports**
   - EventBridge scheduled rules
   - Generate and email reports

4. **Real-time Updates**
   - WebSocket API for live updates
   - SNS notifications for resource changes

5. **Advanced Filtering**
   - Tag-based filtering
   - Cost-based filtering
   - Compliance checks

6. **Additional Services**
   - Lambda functions
   - ELB/ALB/NLB
   - CloudFront distributions
   - Route53 hosted zones
   - SQS queues
   - SNS topics

