# Design Decisions

This document explains key design decisions made in building the AWS Inventory Dashboard.

## Architecture Decisions

### 1. Serverless Architecture (Lambda + API Gateway)

**Decision**: Use AWS Lambda for backend instead of EC2/ECS/containers.

**Rationale**:
- **Cost-effective**: Pay only for requests, no idle costs
- **Scalability**: Auto-scales to handle traffic spikes
- **Maintenance**: No server management required
- **Integration**: Native integration with Cognito, API Gateway

**Trade-offs**:
- Cold starts (mitigated with provisioned concurrency if needed)
- 15-minute max execution time (sufficient for our use case)
- Limited to 10GB memory (more than enough)

### 2. Next.js for Frontend

**Decision**: Use Next.js instead of plain React or other frameworks.

**Rationale**:
- **SSR/SSG**: Better SEO and initial load performance
- **App Router**: Modern routing with better performance
- **TypeScript**: Built-in TypeScript support
- **API Routes**: Can add server-side API routes if needed
- **Deployment**: Easy deployment to Vercel, S3, or any platform

**Trade-offs**:
- Slightly more complex than plain React
- Learning curve for App Router (but worth it)

### 3. Material UI

**Decision**: Use Material UI instead of Ant Design or custom CSS.

**Rationale**:
- **Enterprise-ready**: Professional look and feel
- **Accessibility**: Built-in ARIA support
- **Theming**: Easy customization
- **Components**: Rich component library
- **Documentation**: Excellent documentation

**Trade-offs**:
- Larger bundle size (mitigated with tree-shaking)
- Opinionated design (but customizable)

### 4. Multi-Account via AssumeRole

**Decision**: Use AssumeRole instead of cross-account IAM roles or resource sharing.

**Rationale**:
- **Security**: ExternalId prevents confused deputy attacks
- **Isolation**: Each account maintains its own IAM policies
- **Flexibility**: Easy to add/remove accounts
- **Audit**: CloudTrail logs all AssumeRole calls
- **Standard**: AWS best practice for multi-account access

**Trade-offs**:
- Requires role setup in each account (one-time setup)
- Slightly slower (but negligible with caching)

### 5. Parallel Region Collection

**Decision**: Use ThreadPoolExecutor for parallel region queries.

**Rationale**:
- **Performance**: 10x faster than sequential queries
- **Scalability**: Can adjust worker count based on needs
- **Resilience**: One region failure doesn't block others
- **Simple**: Python standard library, no extra dependencies

**Trade-offs**:
- More complex error handling (but manageable)
- Higher Lambda memory usage (mitigated with 512MB)

### 6. Collector Pattern

**Decision**: Use separate collector classes for each service.

**Rationale**:
- **Separation of Concerns**: Each service has its own logic
- **Extensibility**: Easy to add new services
- **Testability**: Can test each collector independently
- **Maintainability**: Changes to one service don't affect others
- **Reusability**: Base collector provides common functionality

**Trade-offs**:
- More files (but better organization)
- Slight overhead (negligible)

### 7. SAML Federation

**Decision**: Support SAML federation with corporate IdPs.

**Rationale**:
- **Enterprise Requirement**: Most enterprises use SSO
- **Security**: Centralized authentication
- **User Experience**: Single sign-on
- **Compliance**: Meets enterprise security requirements

**Trade-offs**:
- More complex setup (but one-time)
- Requires IdP configuration (but standard)

### 8. Role-Based Access Control (RBAC)

**Decision**: Implement RBAC based on IdP group claims.

**Rationale**:
- **Security**: Fine-grained access control
- **Flexibility**: Easy to add new roles/permissions
- **Audit**: Clear who has access to what
- **Enterprise Standard**: Common pattern in enterprise apps

**Trade-offs**:
- Requires group management in IdP (but standard)
- More complex authorization logic (but manageable)

### 9. Server-Side Authorization

**Decision**: Enforce authorization in Lambda, not just frontend.

**Rationale**:
- **Security**: Frontend can be bypassed
- **Defense in Depth**: Multiple layers of security
- **Compliance**: Required for enterprise security
- **Audit**: Server-side logs show authorization decisions

**Trade-offs**:
- Slightly more code (but essential for security)

### 10. Stateless Design

**Decision**: No database, all queries are real-time.

**Rationale**:
- **Simplicity**: No database to manage
- **Freshness**: Always up-to-date data
- **Cost**: No database costs
- **Scalability**: No database bottlenecks

**Trade-offs**:
- Slower for large queries (but acceptable with pagination)
- No historical data (can be added later with S3 snapshots)

## Code Organization Decisions

### 1. Flat Collector Structure

**Decision**: All collectors in one directory, not nested by service type.

**Rationale**:
- **Simplicity**: Easy to find collectors
- **Consistency**: All collectors follow same pattern
- **Scalability**: Can organize later if needed

### 2. Utility Modules

**Decision**: Separate utils for auth, AWS client, response handling.

**Rationale**:
- **Reusability**: Utils can be used across modules
- **Testability**: Easy to test utilities independently
- **Maintainability**: Clear separation of concerns

### 3. TypeScript Types

**Decision**: Centralized types in `types/index.ts`.

**Rationale**:
- **Consistency**: Single source of truth for types
- **Reusability**: Types used across components
- **Documentation**: Types serve as documentation

## Security Decisions

### 1. ExternalId for AssumeRole

**Decision**: Require ExternalId for all AssumeRole calls.

**Rationale**:
- **Prevents Confused Deputy**: Protects against unauthorized role assumption
- **Best Practice**: AWS recommended security practice
- **Audit**: Clear in CloudTrail logs

### 2. Read-Only Permissions

**Decision**: All IAM roles have read-only permissions.

**Rationale**:
- **Least Privilege**: Only permissions needed for inventory
- **Security**: Can't accidentally modify resources
- **Compliance**: Meets security requirements

### 3. JWT Token Validation

**Decision**: Validate JWT tokens in API Gateway, not just Lambda.

**Rationale**:
- **Performance**: Rejects invalid tokens before Lambda
- **Security**: Gateway-level protection
- **Cost**: Saves Lambda invocations

### 4. CORS Configuration

**Decision**: Allow all origins in CORS (configurable).

**Rationale**:
- **Development**: Easier local development
- **Flexibility**: Can restrict in production
- **Security**: JWT tokens provide actual security

**Note**: In production, restrict to specific domains.

## Performance Decisions

### 1. Pagination

**Decision**: Server-side pagination with 50 items per page default.

**Rationale**:
- **Performance**: Faster response times
- **User Experience**: Manageable page sizes
- **Cost**: Reduces Lambda execution time

### 2. Parallel Processing

**Decision**: Use ThreadPoolExecutor with 10 workers.

**Rationale**:
- **Balance**: Good balance between speed and resource usage
- **Configurable**: Can adjust based on needs
- **Standard**: Python best practice

### 3. No Caching (Initial Version)

**Decision**: No caching layer in initial version.

**Rationale**:
- **Simplicity**: Easier to build and maintain
- **Freshness**: Always up-to-date data
- **Future**: Can add DynamoDB cache later

## Future Improvements

### Planned Enhancements

1. **Caching Layer**
   - DynamoDB with TTL
   - Reduce AWS API calls
   - Faster response times

2. **Historical Snapshots**
   - S3-based snapshots
   - Drift detection
   - Change tracking

3. **Scheduled Reports**
   - EventBridge triggers
   - Email reports
   - Compliance reports

4. **Real-time Updates**
   - WebSocket API
   - SNS notifications
   - Live resource updates

5. **Additional Services**
   - Lambda functions
   - Load balancers
   - CDN distributions
   - DNS zones

## Trade-offs Summary

| Decision | Pros | Cons | Mitigation |
|----------|------|------|------------|
| Serverless | Cost, scalability | Cold starts | Provisioned concurrency if needed |
| Next.js | Performance, SSR | Complexity | Worth the learning curve |
| Material UI | Professional, accessible | Bundle size | Tree-shaking |
| AssumeRole | Security, isolation | Setup complexity | One-time setup, documented |
| Parallel queries | Speed | Complexity | Well-tested pattern |
| No caching | Simplicity, freshness | Slower queries | Pagination, can add later |
| SAML | Enterprise-ready | Setup complexity | Standard, well-documented |

## Conclusion

These design decisions prioritize:
1. **Security**: Defense in depth, least privilege
2. **Scalability**: Serverless, parallel processing
3. **Maintainability**: Clear structure, separation of concerns
4. **Extensibility**: Easy to add services, features
5. **Enterprise-ready**: SAML, RBAC, audit logging

The architecture is designed to be production-ready while remaining extensible for future enhancements.

