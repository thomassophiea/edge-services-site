# 🚀 Push to GitHub and Deploy to Railway

Your code is ready! All files are committed. Now follow these steps to push to GitHub and deploy to Railway.

---

## ✅ Step 1: Push to GitHub (5 minutes)

### Option A: Create a New GitHub Repository

1. **Go to GitHub** and create a new repository:
   - Visit: https://github.com/new
   - Repository name: `edge-services-site` (or your preferred name)
   - Make it **Private** (recommended) or Public
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
   - Click "Create repository"

2. **Copy the repository URL** from GitHub
   - It will look like: `https://github.com/YOUR_USERNAME/edge-services-site.git`

3. **Run these commands in your terminal:**

```bash
# Add GitHub as remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/edge-services-site.git

# Push to GitHub
git push -u origin main
```

### Option B: Use an Existing GitHub Repository

If you already have a repository:

```bash
# Add your existing repo as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git push -u origin main
```

### Verify Push Successful

After pushing, you should see:
```
Enumerating objects: 214, done.
Counting objects: 100% (214/214), done.
...
To https://github.com/YOUR_USERNAME/edge-services-site.git
 * [new branch]      main -> main
```

✅ **Go to your GitHub repository in your browser to verify all files are there!**

---

## ✅ Step 2: Setup GitHub Actions (5 minutes)

GitHub Actions will collect metrics every 30 minutes for FREE.

### Add GitHub Secrets:

1. **Go to your GitHub repository**
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each of these:

| Secret Name | Value | Where to Get It |
|-------------|-------|-----------------|
| `CAMPUS_CONTROLLER_URL` | `https://tsophiea.ddns.net:443/management` | Your Campus Controller URL |
| `CAMPUS_CONTROLLER_USER` | Your username | Campus Controller login |
| `CAMPUS_CONTROLLER_PASSWORD` | Your password | Campus Controller login |
| `SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` | Supabase → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | `eyJhbG...` | Supabase → Settings → API → Project API keys → anon public |

### Test GitHub Action:

1. Go to **Actions** tab in your repository
2. You should see "Network Metrics Collection" workflow
3. Click it → **Run workflow** → **Run workflow**
4. Wait ~2 minutes and check if it succeeds (green checkmark)

✅ **If successful, GitHub Actions will now run every 30 minutes automatically!**

---

## ✅ Step 3: Setup Supabase Database (5 minutes)

### Create/Verify Supabase Project:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. Create a new project or use existing one
3. Wait for project to be ready

### Run Database Schema:

1. **Go to SQL Editor**: Project → SQL Editor
2. Click **"New query"**
3. **Copy the entire contents** of `supabase-schema.sql` from your project
4. **Paste** into the SQL Editor
5. Click **Run** (or press Ctrl/Cmd + Enter)
6. You should see: "Success. No rows returned"

### Verify Schema:

Run this query in SQL Editor:
```sql
SELECT COUNT(*) FROM service_metrics;
```

Should return `0` (table exists but empty - that's correct!)

✅ **Database is ready to receive metrics!**

---

## ✅ Step 4: Deploy to Railway (10 minutes)

### Create Railway Project:

1. **Go to Railway**: https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. **Authorize Railway** to access your GitHub (if not already)
5. **Select your repository** from the list
6. Click to deploy

### Railway will automatically:
- ✅ Detect Node.js project
- ✅ Install dependencies
- ✅ Build with Vite
- ✅ Deploy the web app

### Add Environment Variables:

1. Click on your **service** in Railway
2. Go to **"Variables"** tab
3. Click **"New Variable"** and add:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

(Use the same Supabase URL and key from Step 2)

4. Service will **automatically redeploy** with new variables

### Get Your App URL:

1. Go to **"Settings"** tab
2. Scroll to **"Domains"**
3. You'll see a URL like: `https://edge-services-site-production.up.railway.app`
4. Click it to open your deployed app!

✅ **Your web app is now live!**

---

## ✅ Step 5: Verify Everything Works (30-60 minutes)

### Immediate (Right Now):

1. **Open your Railway URL** in browser
2. **Login** with Campus Controller credentials
3. Navigate to **"Service Levels"** page
4. Select a service
5. You should see the **Network Rewind component** (will show "No Data" initially)

### After 30 minutes:

1. **Check GitHub Actions**:
   - Go to Actions tab → Check latest run
   - Should show green checkmark (success)

2. **Check Supabase data**:
   - Go to SQL Editor
   - Run:
     ```sql
     SELECT
       service_name,
       timestamp,
       (metrics->>'clientCount')::int as clients
     FROM service_metrics
     ORDER BY timestamp DESC
     LIMIT 10;
     ```
   - Should see 1-2 rows of data

### After 60 minutes:

1. **Test Network Rewind**:
   - Open your Railway app
   - Go to Service Levels
   - Select a service
   - Network Rewind should show **time slider** (not grayed out)
   - Drag slider to view historical data!

✅ **Everything is working! Network Rewind is live!**

---

## 📊 Summary of What You've Deployed

| Component | Status | Cost | Purpose |
|-----------|--------|------|---------|
| **GitHub Repo** | ✅ Live | FREE | Source code hosting |
| **GitHub Actions** | ✅ Running every 30 min | FREE | Metrics collection |
| **Supabase DB** | ✅ Storing data | FREE | 90-day historical storage |
| **Railway Web** | ✅ Deployed | FREE | Web app hosting |
| **Total Cost** | | **$0/month** | 🎉 |

---

## 🎯 Quick Commands Reference

```bash
# Check git status
git status

# View commit history
git log --oneline

# Check remote
git remote -v

# Push future changes
git add .
git commit -m "Your message"
git push origin main
```

---

## 🆘 Troubleshooting

### "Permission denied" when pushing to GitHub

**Solution:** Set up authentication:

**Option 1 - HTTPS (Recommended):**
```bash
git remote set-url origin https://YOUR_USERNAME@github.com/YOUR_USERNAME/REPO.git
git push -u origin main
# Enter your GitHub password when prompted
# OR use a Personal Access Token (Settings → Developer settings → Tokens)
```

**Option 2 - SSH:**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to GitHub (Settings → SSH Keys → New SSH key)
cat ~/.ssh/id_ed25519.pub

# Change remote to SSH
git remote set-url origin git@github.com:YOUR_USERNAME/REPO.git
git push -u origin main
```

### GitHub Actions failing

**Check:**
1. All 5 secrets are added correctly (no typos)
2. Campus Controller credentials work (test in browser)
3. Supabase schema is installed
4. View detailed logs in Actions → Latest run → View logs

### Railway build failing

**Check:**
1. package.json exists
2. All dependencies listed
3. Build logs in Railway dashboard
4. Try manual redeploy

### Network Rewind shows "No Data"

**Wait:** Initial data collection takes 30-60 minutes

**Then check:**
1. GitHub Actions succeeded (green checkmark)
2. Supabase has data (run SQL query above)
3. Browser console for errors (F12)
4. Railway environment variables are set

---

## 🎉 Success!

Once deployed, you have:
- ✅ Live web application on Railway
- ✅ Automatic metrics collection every 30 minutes
- ✅ 90 days of historical network data
- ✅ Network Rewind time slider in UI
- ✅ 100% free cloud infrastructure
- ✅ Zero maintenance required

**Enjoy your Network Rewind feature!** 🚀

---

## 📞 Need Help?

1. **Check logs** in Railway and GitHub Actions
2. **Review documentation**:
   - [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
   - [RAILWAY_FREE_TIER_DEPLOYMENT.md](./RAILWAY_FREE_TIER_DEPLOYMENT.md)
3. **Verify all steps** were completed
4. **Check browser console** for JavaScript errors
