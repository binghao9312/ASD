# ASD Project Structure

## Overview

This is a Vite + React + Firebase web app for dorm luggage registration, lookup, history, and admin management.

## Root Files

- `package.json` - npm scripts and dependencies.
- `vite.config.ts` - Vite build configuration.
- `firebase.json` - Firebase Hosting, Firestore rules/index config, cache headers, and SPA rewrites.
- `.firebaserc` - Firebase project alias. Default project is `asd-jg`.
- `firestore.rules` - Firestore access rules.
- `firestore.indexes.json` - Firestore index definitions.
- `index.html` - Vite HTML entry.

## Source Layout

```text
src/
  App.tsx
  main.tsx
  firebase.ts
  index.css
  components/
    Layout.tsx
  hooks/
    useAuth.tsx
  services/
    settings.ts
  pages/
    Login.tsx
    PendingApproval.tsx
    SetupProfile.tsx
    Scan.tsx
    History.tsx
    Admin.tsx
    admin/
      AdminLuggages.tsx
      AdminUsers.tsx
      AdminRoles.tsx
      AdminForm.tsx
      AdminBuildings.tsx
```

## Key Areas

- `src/main.tsx` - React bootstrapping and legacy PWA cache/service-worker cleanup.
- `src/App.tsx` - App routing and auth gate.
- `src/firebase.ts` - Firebase app, Auth, and Firestore initialization.
- `src/hooks/useAuth.tsx` - Google auth state, user profile loading, and approval status.
- `src/components/Layout.tsx` - Shared mobile shell, header, dark mode, logout, and bottom navigation.

## Pages

- `src/pages/Scan.tsx` - Luggage registration and QR lookup.
  - Allows empty QR ID for registration.
  - Supports 0 luggage pieces.
  - Uses building-specific luggage limits.
  - Shows a custom Double Check modal before writing.
- `src/pages/History.tsx` - Recent scan history for the current user or admin.
  - Applies the admin-configured data date range.
  - Supports editing luggage count.
- `src/pages/Admin.tsx` - Admin tab shell and permission-based tab rendering.
- `src/pages/admin/AdminLuggages.tsx` - Global luggage data management and progress stats.
  - Applies the admin-configured date range.
  - Lets superadmin adjust building people/staff/luggage limits and date range.
- `src/pages/admin/AdminUsers.tsx` - User approval and role assignment.
- `src/pages/admin/AdminRoles.tsx` - Role group and permission settings.
- `src/pages/admin/AdminForm.tsx` - Per-building inspection checklist settings.
- `src/pages/admin/AdminBuildings.tsx` - Per-building floor and luggage-limit settings.

## Shared Settings

- `src/services/settings.ts`
  - Role defaults and role persistence.
  - Inspection form defaults and per-building form persistence.
  - Building config defaults:
    - `毅志`: luggage limit 5
    - `弘德`: luggage limit 5
    - `慧樓`: luggage limit 6
  - Data validity date range:
    - `startDate`
    - `endDate`
    - Empty values mean no limit.

## Public Assets

- `public/sw.js` and `public/service-worker.js` - Legacy PWA retirement service workers.
- `public/registerSW.js` - Legacy PWA registration cleanup helper.
- `public/manifest.webmanifest` - Browser display manifest.
- `public/favicon.svg`, `public/icons.svg` - App icons.

## Build And Deploy

```powershell
npm.cmd run build
npx.cmd firebase-tools deploy --only hosting --project asd-jg
```

Deploying only Hosting avoids unintentionally changing Firestore rules or indexes.
