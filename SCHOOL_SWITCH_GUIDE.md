# School ID Configuration Guide

## Quick Switch: Change Active School

To switch to a different school throughout the entire project:

### Step 1: Update `.env`
Edit `.env` and change only this line:
```bash
NEXT_PUBLIC_SCHOOL_ID=<NEW_SCHOOL_ID>
```

Example:
```bash
NEXT_PUBLIC_SCHOOL_ID=6a36672f894ca7368ab49e84
```

### Step 2: Restart Dev Server
```bash
npm run dev
```

### Step 3: Verify
- Public site (login page, landing page) → school name, logo, theme from DB
- After login → dashboard uses school's saved settings
- Super admin theme editor → works with the new school ID

## What Gets Updated Automatically

| Component | Source | Auto-Updated? |
|-----------|--------|---------------|
| **Theme (colors)** | DB: School.theme_config | ✅ Yes |
| **Logo URL** | DB: School.logo_url | ✅ Yes |
| **School Name** | DB: School.name | ✅ Yes |
| **School Slug** | DB: School.slug | ✅ Yes |
| **Public pages** | `/api/public/theme` endpoint | ✅ Yes |
| **Dashboard** | `/api/theme` endpoint (logged-in users) | ✅ Yes |
| **Super Admin Preview** | `/api/theme?school_id=X` | ✅ Yes |

## Affected Files (Automatically Updated)

- `app/layout.tsx` → Loads `ServerThemeStyles` (uses `NEXT_PUBLIC_SCHOOL_ID`)
- `app/components/ServerThemeStyles.tsx` → Injects CSS vars from DB
- `app/components/SchoolThemeProvider.tsx` → Client-side theme sync
- `.env.local` or `.env` → Central config

## Manual Setup (One-Time)

If you're setting up a completely new school:

1. Create school in database via `/api/setup` or directly in MongoDB
2. Update `.env` with its ID
3. Restart server
4. Use Super Admin UI to set theme, logo, landing page content

## Troubleshooting

**Theme not updating after changing ID?**
- Confirm `.env` was saved
- Restart dev server: `npm run dev`
- Check browser DevTools → Network → `/api/public/theme` response

**Getting "School not found"?**
- Verify school ID exists in MongoDB
- Run: `node debug-theme.js` to check

**Admin panel changes not showing on public site?**
- Refresh page (Ctrl+Shift+R for hard refresh)
- Clear browser cache if needed
