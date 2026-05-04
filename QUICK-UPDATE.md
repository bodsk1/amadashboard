# 🚀 Quick Data Update

## When you get new monthly data:

```bash
# 1. Place CSV file in ../data/ folder
# 2. Run this command:
cd anteraja-dashboard && ./update-data.sh
```

That's it! ✨

---

## What the script does:
- ✅ Finds new CSV files in `../data/`
- ✅ Copies them to `public/data/`
- ✅ Builds the dashboard
- ✅ Commits and pushes to GitHub
- ✅ Triggers Vercel deployment

## After running:
- Wait 2-3 minutes
- Visit https://amadashboard.vercel.app/
- Hard refresh: `Cmd+Shift+R`

---

**Need help?** See [DATA-UPDATE-GUIDE.md](./DATA-UPDATE-GUIDE.md) for detailed instructions.
