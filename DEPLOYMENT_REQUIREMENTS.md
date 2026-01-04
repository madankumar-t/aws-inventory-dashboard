# Deployment Requirements for Testing

## Quick Answer

**For Local Development:**
- ❌ **Frontend**: NO deployment needed - run locally with `npm run dev`
- ✅ **Backend**: YES - deploy to AWS (or use SAM local)
- ✅ **Cognito**: Created automatically with backend OR create manually

**For Production Testing:**
- ✅ **Frontend**: YES - deploy to S3/CloudFront or Vercel
- ✅ **Backend**: YES - deploy to AWS
- ✅ **Cognito**: Already created with backend

## Testing Scenarios

### Scenario 1: Local Development (Recommended)

**What You Need:**
- ✅ Backend deployed to AWS (Lambda + API Gateway)
- ✅ Frontend running locally (`npm run dev`)
- ✅ Cognito (created with backend deployment)

**Setup:**
```bash
# 1. Deploy backend
cd backend
sam build
sam deploy --guided

# 2. Get outputs (API URL, Cognito credentials)
aws cloudformation describe-stacks --stack-name aws-inventory-dashboard --query 'Stacks[0].Outputs'

# 3. Update frontend/.env.local with credentials

# 4. Run frontend locally
cd frontend
npm run dev
```

**What Works:**
- ✅ Full authentication flow
- ✅ All API calls to backend
- ✅ Dashboard with real data
- ✅ All features functional

**Advantages:**
- Fast frontend development (hot reload)
- Real backend for testing
- No frontend deployment needed
- Easy to debug

### Scenario 2: Full Local (Backend via SAM Local)

**What You Need:**
- ✅ SAM CLI installed
- ✅ Frontend running locally
- ✅ Cognito (create manually or deploy just Cognito)

**Setup:**
```bash
# Terminal 1: Start SAM local API
cd backend
sam local start-api --port 3001

# Terminal 2: Run frontend
cd frontend
# Update .env.local: NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev
```

**What Works:**
- ✅ Authentication (if Cognito configured)
- ✅ API calls to local backend
- ✅ Dashboard with data
- ⚠️ Some limitations (CORS, local Lambda)

**Advantages:**
- No AWS deployment needed
- Fast iteration
- Good for development

**Limitations:**
- Cognito still needs to be in AWS (or mock auth)
- Some AWS services may not work locally

### Scenario 3: Production Testing

**What You Need:**
- ✅ Backend deployed to AWS
- ✅ Frontend deployed (S3/CloudFront or Vercel)
- ✅ Cognito configured

**Setup:**
```bash
# 1. Deploy backend
cd backend
sam build
sam deploy

# 2. Build and deploy frontend
cd frontend
npm run build
# Deploy to S3/CloudFront or Vercel
```

**What Works:**
- ✅ Everything
- ✅ Production-like environment
- ✅ Real-world testing

## Recommendation: Local Development Setup

### Best Approach for Testing

**Deploy Backend + Run Frontend Locally**

This gives you:
- ✅ Real backend functionality
- ✅ Fast frontend development
- ✅ Easy debugging
- ✅ No frontend deployment needed

### Step-by-Step

1. **Deploy Backend** (one time):
   ```bash
   cd backend
   sam build
   sam deploy --guided
   ```

2. **Get Credentials**:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name aws-inventory-dashboard \
     --query 'Stacks[0].Outputs'
   ```

3. **Update Frontend .env.local**:
   ```env
   NEXT_PUBLIC_API_URL=https://your-api.execute-api.region.amazonaws.com/prod
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
   NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx
   NEXT_PUBLIC_COGNITO_REGION=us-east-1
   NEXT_PUBLIC_COGNITO_DOMAIN=aws-inventory-dashboard-auth
   ```

4. **Run Frontend Locally**:
   ```bash
   cd frontend
   npm run dev
   ```

5. **Test Everything**:
   - Open `http://localhost:3000`
   - Login works
   - Dashboard loads data
   - All features work

## What Requires Deployment

### Must Deploy:
- ✅ **Backend** - Lambda functions need AWS infrastructure
- ✅ **Cognito** - AWS service (created with backend or manually)

### Don't Need to Deploy:
- ❌ **Frontend** - Can run locally for development
- ❌ **For Testing** - Local frontend works fine

### When to Deploy Frontend:
- Production release
- Testing production environment
- Sharing with team (if not using localhost)
- CI/CD pipeline

## Cost Considerations

### Local Development (Backend Deployed):
- **Backend**: ~$0.01-0.10/day (Lambda + API Gateway minimal usage)
- **Cognito**: Free tier (50,000 MAU)
- **Frontend**: $0 (runs on your machine)

### Full Deployment:
- **Backend**: Same as above
- **Frontend**: S3 ($0.023/GB) + CloudFront ($0.085/GB) = ~$0.10-1/month
- **Cognito**: Same as above

## Summary Table

| Component | Local Dev | Production |
|-----------|-----------|------------|
| **Backend** | ✅ Deploy to AWS | ✅ Deploy to AWS |
| **Frontend** | ❌ Run locally | ✅ Deploy to S3/CloudFront |
| **Cognito** | ✅ Create in AWS | ✅ Create in AWS |
| **Testing** | ✅ Full functionality | ✅ Full functionality |

## Quick Start for Testing

**Minimum Required:**
1. Deploy backend (creates Cognito)
2. Run frontend locally
3. Test everything

**You DON'T need to:**
- Deploy frontend for testing
- Set up production infrastructure
- Configure CloudFront/CDN for testing

## Next Steps

1. **Deploy backend** (if not done):
   ```bash
   cd backend
   sam build && sam deploy --guided
   ```

2. **Configure frontend**:
   - Update `.env.local` with backend outputs
   - Run `npm run dev`

3. **Test**:
   - Authentication works
   - Dashboard loads
   - API calls succeed

That's it! No frontend deployment needed for testing.

