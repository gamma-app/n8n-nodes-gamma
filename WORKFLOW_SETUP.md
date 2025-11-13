# For CTO: GitHub Actions Workflow Setup

## The repo is ready at:
**https://github.com/gamma-app/n8n-nodes-gamma**

---

## ⚠️ The CI/CD workflow file needs to be added

Due to OAuth permissions, I couldn't push the workflow file automatically.

---

## 🔧 Option 1: Add via GitHub Web (2 minutes)

1. Go to: https://github.com/gamma-app/n8n-nodes-gamma
2. Click **"Add file"** → **"Create new file"**
3. Name it: `.github/workflows/publish.yml`
4. Copy/paste this content:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run linter
        run: npm run lint

      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

5. **Commit the file**

---

## 🔑 Then Add the NPM Token

1. Stay in the repo
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Your npm automation token
6. Click **Add secret**

---

## ✅ That's It!

Once those two things are done:
- Creating a GitHub release will automatically publish to npm
- Package name: `@gammatech/n8n-nodes`

---

## 📝 Or Option 2: Clone and Push

If you prefer command line:

```bash
git clone https://github.com/gamma-app/n8n-nodes-gamma.git
cd n8n-nodes-gamma
# Copy the workflow file from the backup
git add .github/workflows/publish.yml
git commit -m "Add CI/CD workflow"
git push
```

The workflow file content is in the repo as `.github/workflows/publish.yml.backup`

