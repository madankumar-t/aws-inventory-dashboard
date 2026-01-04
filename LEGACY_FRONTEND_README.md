# Legacy Frontend (frontend-react)

## ⚠️ This folder is deprecated

The `frontend-react` folder contains the **old basic React implementation** that was replaced by the new Next.js frontend.

## Current Frontend

**Use the `frontend/` folder instead** - it contains:
- ✅ Next.js 14 with App Router
- ✅ TypeScript
- ✅ Material UI
- ✅ Full enterprise features
- ✅ SAML SSO support
- ✅ All requirements implemented

## Migration

If you were using `frontend-react`, migrate to `frontend/`:

1. **Stop using `frontend-react`**
2. **Use `frontend/` for all development**
3. **Delete `frontend-react` folder** (or keep as reference)

## Old Frontend Details

The `frontend-react` folder was a basic Create React App implementation with:
- Plain React (no Next.js)
- JavaScript (no TypeScript)
- Basic styling (no Material UI)
- Limited features

This has been **completely replaced** by the new `frontend/` implementation.

## Cleanup

To remove the legacy frontend:

```bash
# Backup first (optional)
mv frontend-react frontend-react.backup

# Remove
rm -rf frontend-react
```

Or simply delete the `frontend-react` folder from your file system.

