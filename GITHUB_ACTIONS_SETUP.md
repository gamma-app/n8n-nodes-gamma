# GitHub Actions Auto-Publishing Setup

## 🎯 What This Does

When you create a GitHub release (like v0.2.0), GitHub Actions will automatically:
1. Build the package
2. Run linter
3. Publish to npm as `@gammatech/n8n-nodes`

**No manual `npm publish` needed!**

---

## 🔑 Step 1: Create npm Granular Access Token

Since you're an **owner** of @gammatech, you can create the token now!

### Go To:
https://www.npmjs.com/settings/max.jackson/tokens

### Click:
"Generate New Token" → "Granular Access Token"

### Settings:
- **Token name**: `github-actions-n8n-publishing`
- **Expiration**: 90 days (or 1 year if you have 2FA)
- **Organizations**: Check **@gammatech** ✅
- **Permissions**: Select **"Read and write"**
- **Packages**: Select **"All packages"** or just **@gammatech/n8n-nodes**

### Copy Token:
After clicking "Generate", copy the token (starts with `npm_...`)

---

## 🔧 Step 2: Add Token to GitHub Repo

### Go To:
https://github.com/gamma-app/n8n-nodes-gamma/settings/secrets/actions

### Click:
"New repository secret"

### Add Secret:
- **Name**: `NPM_TOKEN`
- **Value**: Paste the npm token you just created
- Click "Add secret"

---

## ✅ That's It!

The workflow is already configured in `.github/workflows/publish.yml.backup`

Once the secret is added:

### To Publish a New Version:

1. **Update version** in `package.json`:
   ```json
   "version": "0.2.0"
   ```

2. **Commit and push**:
   ```bash
   git add package.json
   git commit -m "Bump version to 0.2.0"
   git push
   ```

3. **Create GitHub Release**:
   - Go to https://github.com/gamma-app/n8n-nodes-gamma/releases/new
   - Tag: `v0.2.0`
   - Title: `v0.2.0`
   - Description: What changed
   - Click "Publish release"

4. **GitHub Actions automatically publishes to npm!** ✅

---

## 🔍 Check If It Worked

After creating the release:
- Go to https://github.com/gamma-app/n8n-nodes-gamma/actions
- You should see a workflow run
- If successful, new version is on npm!

---

## 📋 Quick Summary

**You need**:
1. ✅ npm granular access token (you can create - you're an owner!)
2. ✅ Add as `NPM_TOKEN` secret in GitHub repo
3. ✅ Restore `.github/workflows/publish.yml` file

**Then**:
- Create GitHub releases → Auto-publishes to npm
- No manual publishing needed!

---

**Since you're an owner of @gammatech, you can do this all yourself!** 🔑

