# Accounts Configuration Guide

## Overview

The AWS Inventory Dashboard supports multiple ways to configure accounts:

1. **AWS Organizations** (Recommended) - Automatically discovers all accounts
2. **Environment Variable** - Hardcoded list of accounts (fallback)
3. **Current Account** - Single account mode (automatic fallback)

## Configuration Methods

### 1. AWS Organizations (Automatic Discovery) ✅ Recommended

**How it works:**
- The backend automatically queries AWS Organizations API
- Lists all ACTIVE accounts in your organization
- Returns account ID and name for each account

**Requirements:**
- Lambda must have `organizations:ListAccounts` permission
- Must be in the management account or have delegated access

**IAM Permission:**
```json
{
  "Effect": "Allow",
  "Action": "organizations:ListAccounts",
  "Resource": "*"
}
```

**Advantages:**
- ✅ Automatic discovery
- ✅ Always up-to-date
- ✅ No manual configuration needed
- ✅ Works with AWS Organizations structure

### 2. Environment Variable (Hardcoded Accounts)

**When to use:**
- Organizations API not available
- Want to limit visible accounts
- Testing/development scenarios

**Configuration:**
Set the `INVENTORY_ACCOUNTS` environment variable in your Lambda:

**Format 1: With Account Names**
```
INVENTORY_ACCOUNTS=123456789012:Production Account,987654321098:Development Account,111222333444:Staging Account
```

**Format 2: Account IDs Only**
```
INVENTORY_ACCOUNTS=123456789012,987654321098,111222333444
```

**In SAM Template:**
```yaml
Environment:
  Variables:
    INVENTORY_ACCOUNTS: "123456789012:Production,987654321098:Development"
```

**In AWS Console:**
1. Go to Lambda → Configuration → Environment variables
2. Add: `INVENTORY_ACCOUNTS` = `123456789012:Production,987654321098:Development`

**Advantages:**
- ✅ Works without Organizations access
- ✅ Can limit visible accounts
- ✅ Good for testing

**Disadvantages:**
- ❌ Manual configuration required
- ❌ Must update when accounts change
- ❌ Not automatically synchronized

### 3. Current Account (Automatic Fallback)

**How it works:**
- If Organizations API fails and no hardcoded accounts
- Automatically uses the current account (where Lambda runs)
- Shows as "Current Account" in the UI

**When it happens:**
- No Organizations access
- No `INVENTORY_ACCOUNTS` environment variable
- Single account setup

**Advantages:**
- ✅ Works out of the box
- ✅ No configuration needed
- ✅ Good for single-account setups

## Priority Order

The backend checks accounts in this order:

1. **AWS Organizations API** (if available)
2. **INVENTORY_ACCOUNTS environment variable** (if set)
3. **Current account** (automatic fallback)

## Examples

### Example 1: Multi-Account with Organizations
```yaml
# template.yaml - No special configuration needed
# Just ensure organizations:ListAccounts permission
```

**Result:**
- Automatically discovers all accounts
- Shows account names from Organizations

### Example 2: Hardcoded Accounts
```yaml
Environment:
  Variables:
    INVENTORY_ACCOUNTS: "123456789012:Prod,987654321098:Dev"
```

**Result:**
- Shows only the specified accounts
- Uses custom account names

### Example 3: Single Account
```yaml
# No configuration needed
# Just deploy and use
```

**Result:**
- Shows "Current Account"
- Works for single-account setups

## Frontend Behavior

### Accounts Dropdown

**When accounts are available:**
- Shows checkboxes for each account
- Displays account name and ID
- Allows multi-select

**When no accounts available:**
- Shows "No accounts available. Using current account."
- Dropdown is enabled but empty
- System uses current account automatically

**Loading state:**
- Shows "Loading accounts..." with spinner
- Dropdown is disabled during loading

## Troubleshooting

### Issue: Accounts dropdown is empty/greyed out

**Possible causes:**
1. Organizations API not accessible
2. No `INVENTORY_ACCOUNTS` environment variable
3. Lambda doesn't have required permissions
4. Backend API not responding

**Solutions:**
1. Check CloudWatch logs for errors
2. Verify `organizations:ListAccounts` permission
3. Add `INVENTORY_ACCOUNTS` environment variable as fallback
4. Check API endpoint `/accounts` is accessible

### Issue: Accounts not showing names

**Possible causes:**
1. Organizations API returns accounts without names
2. Hardcoded accounts format incorrect

**Solutions:**
1. Check Organizations account names are set
2. Use format: `accountId:AccountName` in environment variable

### Issue: Can't select accounts

**Possible causes:**
1. Dropdown is disabled
2. Accounts list is empty
3. Frontend error

**Solutions:**
1. Check browser console for errors
2. Verify backend `/accounts` endpoint returns data
3. Check network tab for API calls

## Best Practices

1. **Use AWS Organizations** when possible
   - Automatic discovery
   - Always up-to-date
   - No manual maintenance

2. **Use Environment Variables** for:
   - Testing/development
   - Limiting visible accounts
   - When Organizations not available

3. **Monitor CloudWatch Logs**
   - Check for account discovery errors
   - Verify accounts are being fetched

4. **Test Account Selection**
   - Verify accounts appear in dropdown
   - Test multi-account queries
   - Verify cross-account role assumption works

## Security Considerations

1. **Least Privilege:**
   - Only grant `organizations:ListAccounts` if needed
   - Limit `INVENTORY_ACCOUNTS` to necessary accounts

2. **External ID:**
   - Always use `EXTERNAL_ID` for role assumption
   - Prevents confused deputy attacks

3. **Role Trust Policy:**
   - Ensure `InventoryReadRole` has proper trust policy
   - Include `ExternalId` condition

## Summary

✅ **Accounts are NOT hardcoded by default**
✅ **Automatically fetched from AWS Organizations**
✅ **Can be configured via environment variable if needed**
✅ **Falls back to current account if nothing else works**

The system is designed to work automatically with minimal configuration, but provides flexibility for custom setups.

