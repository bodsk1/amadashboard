# Anteraja Dashboard - Data Update Guide

## 📋 Overview

This guide explains how to update the dashboard with new monthly data.

## 🗂️ File Naming Convention

**IMPORTANT:** The CSV filenames are offset by 1 month from the actual data inside:

| Filename | Contains Data For |
|----------|-------------------|
| `aca_order_20260201.csv` | January 2026 |
| `aca_order_20260301.csv` | February 2026 |
| `aca_order_20260401.csv` | March 2026 |
| `aca_order_20260501.csv` | April 2026 |
| `aca_order_20260601.csv` | May 2026 |

The data inside uses DD/MM/YYYY format:
- January data: `01/01/2026`, `02/01/2026`, etc.
- April data: `01/04/2026`, `02/04/2026`, etc.

## 🚀 Quick Update Process

### Option 1: Automated Script (Recommended)

1. Place new CSV files in the `../data/` folder (parent directory)
2. Run the update script:
   ```bash
   cd anteraja-dashboard
   ./update-data.sh
   ```
3. Wait 2-3 minutes for Vercel to deploy
4. Visit https://amadashboard.vercel.app/ and hard refresh

### Option 2: Manual Update

1. Copy new CSV file(s) to `anteraja-dashboard/public/data/`
   ```bash
   cp ../data/aca_order_20260601.csv anteraja-dashboard/public/data/
   ```

2. Build the project:
   ```bash
   cd anteraja-dashboard
   npm run build
   ```

3. Commit and push:
   ```bash
   git add public/data/*.csv build/
   git commit -m "data: add May 2026 data"
   git push origin main
   ```

4. Wait 2-3 minutes for Vercel deployment

## 🔍 Verification

After deployment:

1. Visit https://amadashboard.vercel.app/
2. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Switch to "Monthly View"
4. Check the dropdown - new month should appear
5. Verify data loads correctly for the new month

## 📁 File Locations

- **Source data**: `../data/` (parent directory)
- **Dashboard data**: `anteraja-dashboard/public/data/`
- **Update script**: `anteraja-dashboard/update-data.sh`

## ⚠️ Troubleshooting

### New month not showing after deployment

1. Check browser console (F12) for errors
2. Verify the CSV file is in `public/data/`
3. Check the dates inside the CSV match expected month
4. Clear browser cache completely
5. Try incognito/private browsing mode

### Script fails to copy files

- Ensure `../data/` directory exists
- Check file permissions
- Verify CSV files match pattern `aca_order_*.csv`

## 📝 Notes

- The dashboard automatically detects all CSV files in `public/data/`
- Files are explicitly listed in `App.tsx` - no directory scanning needed
- Vercel rebuilds automatically on every push to `main` branch
- Build time: ~30 seconds
- Deployment time: ~2-3 minutes total
