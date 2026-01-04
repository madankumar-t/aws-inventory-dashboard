# Cleanup Legacy Frontend

## Issue

The project currently has **three folders**:
1. ✅ `backend/` - Lambda backend (KEEP)
2. ✅ `frontend/` - Next.js frontend (KEEP)
3. ❌ `frontend-react/` - Legacy React app (REMOVE)

## Recommendation

**Remove the `frontend-react/` folder** as it's the old implementation that has been completely replaced by the new `frontend/` folder.

## Why Remove?

- `frontend-react/` is the old basic React implementation
- `frontend/` is the new enterprise-grade Next.js implementation
- Having both causes confusion
- The new frontend has all features and more

## How to Remove

### Option 1: Delete the folder (Recommended)

```bash
# Windows
rmdir /s /q frontend-react

# Linux/Mac
rm -rf frontend-react
```

### Option 2: Move to backup (if you want to keep for reference)

```bash
# Windows
move frontend-react frontend-react.backup

# Linux/Mac
mv frontend-react frontend-react.backup
```

### Option 3: Add to .gitignore (if you want to keep locally but not commit)

The `.gitignore` has been updated to ignore `frontend-react/` if you want to keep it locally but not commit it.

## After Cleanup

The project will have a clean structure:

```
inventory-dashboard/
├── backend/          # Lambda backend
├── frontend/         # Next.js frontend
├── README.md
├── ARCHITECTURE.md
└── ... (other docs)
```

## Verification

After removal, verify:
- ✅ `frontend/` folder exists and works
- ✅ `backend/` folder exists and works
- ✅ No references to `frontend-react` in documentation
- ✅ `.gitignore` ignores `frontend-react/` (already done)

## Current Status

- ✅ `.gitignore` updated to ignore `frontend-react/`
- ✅ `LEGACY_FRONTEND_README.md` created (explains the legacy folder)
- ✅ README.md updated to clarify project structure
- ⏳ **Action Required**: Delete `frontend-react/` folder

