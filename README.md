# @gammatech/n8n-nodes

Official Gamma community node for n8n - Create AI-powered presentations, documents, and websites directly from your n8n workflows.

**Status:** In Development  
**Created:** November 10, 2025  
**Maintained by:** Max Jackson (Gamma)

---

## 🎯 What This Does

Integrates Gamma's API v1.0 into n8n, allowing you to:
- Generate presentations, documents, social posts, and webpages with AI
- Create content from templates
- List themes and folders
- Export to PDF/PPTX
- Automate content creation workflows

---

## 📦 Installation

### Option 1: From npm (After Publishing)

```bash
# In n8n
Settings → Community Nodes → Install
# Enter: @gammatech/n8n-nodes
```

### Option 2: Local Development

```bash
# Clone and build
git clone <this-repo>
cd n8n-gamma-node
npm install
npm run build
npm link

# In your n8n installation
cd ~/.n8n/custom
npm link n8n-nodes-gamma

# Start n8n
n8n start
```

---

## 🏗️ Project Structure

Based on Gamma's OpenAPI spec and using `@devlikeapro/n8n-openapi-node` for generation.

```
n8n-gamma-node/
├── GAMMA_API_OPENAPI_SPEC.yaml   # OpenAPI spec (copied from root)
├── package.json                   # npm package config
├── tsconfig.json                  # TypeScript config
├── .gitignore
├── credentials/
│   └── GammaApi.credentials.ts   # API key authentication
├── nodes/
│   └── Gamma/
│       ├── Gamma.node.ts         # Main node (generated from OpenAPI)
│       ├── Gamma.node.json       # Node metadata
│       └── gamma.svg             # Gamma logo icon
├── docs/
│   ├── SETUP.md                  # Setup and development guide
│   ├── PUBLISHING.md             # How to publish to npm
│   ├── VERIFICATION.md           # n8n verification process
│   └── n8n-resources.md          # All n8n documentation links
└── examples/
    ├── basic-presentation.json   # Simple workflow example
    ├── zapier-alternative.json   # Replacing Zapier
    └── content-pipeline.json     # Advanced automation
```

---

## 🚀 Quick Start (Development)

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or pnpm
- n8n installed globally (`npm install n8n -g`)

### Development Workflow

```bash
# 1. Install dependencies
npm install

# 2. Build the node
npm run build

# 3. Link to local n8n
npm link
cd ~/.n8n/custom
npm link n8n-nodes-gamma

# 4. Start n8n
n8n start

# 5. Open browser at http://localhost:5678
# Search for "Gamma" in nodes panel
```

### Watch Mode (Auto-rebuild)

```bash
npm run dev
# Rebuilds automatically on file changes
```

---

## 🔑 Authentication

The node requires a Gamma API key:

1. Log into [gamma.app](https://gamma.app)
2. Go to Settings & Members → API
3. Generate API key
4. Copy key (starts with `sk-gamma-`)
5. In n8n: Create credential → Gamma API
6. Paste API key

---

## 📚 Available Operations

### Generations Resource

**Create Generation**
- Generate presentations, documents, social posts, or webpages
- Parameters: inputText, textMode, format, numCards, themeId, imageOptions, etc.
- Returns: generationId for status polling

**Get Generation Status**
- Poll for generation completion
- Returns: status, gammaUrl, exportUrl, credits used

**Create from Template**
- Remix existing Gamma with new prompt
- Parameters: prompt, gammaId (template), themeId, imageOptions
- Returns: generationId

### Themes Resource

**List Themes**
- Get available themes for styling
- Parameters: limit, query (search), cursor (pagination)
- Returns: themes with IDs and names

### Folders Resource

**List Folders**
- Get workspace folders for organization
- Parameters: limit, query (search), cursor (pagination)
- Returns: folders with IDs and names

### User Resource

**Get Me**
- Get authenticated user info
- Returns: email, workspaceName

---

## 🎨 Example Workflows

### ⚡ Auto-Polling Workflow (Recommended!)

**Problem**: Gamma generations are async and take 30-90 seconds to complete.  
**Solution**: Use our auto-polling workflow template!

📥 **Import the workflow**: `examples/auto-polling-workflow.json`

This workflow automatically:
- ✅ Creates the generation
- ✅ Waits 30 seconds
- ✅ Checks status
- ✅ Loops until completed
- ✅ Outputs gammaUrl when done

**No more manual clicking!** This gives users a much better experience.

### Basic: Generate Presentation (Manual Polling)

```
Trigger (Manual/Schedule)
    ↓
Gamma: Create Generation
    - inputText: "Introduction to renewable energy"
    - format: presentation
    - textMode: generate
    - numCards: 10
    ↓
Gamma: Get Generation Status 
    (Click Execute repeatedly until status = "completed")
    ↓
Send Email with gammaUrl
```

⚠️ **Note**: Manual polling requires clicking "Execute" every 30 seconds. Use the auto-polling workflow above for better UX!

### Advanced: Content Pipeline

```
RSS Feed (New Article)
    ↓
Extract Content
    ↓
Gamma: Create Generation
    - inputText: {{article content}}
    - format: presentation
    ↓
Wait for Completion (poll)
    ↓
Gamma: Create from Template (social version)
    - gammaId: {{generated gammaId}}
    - format: social
    ↓
Post to Social Media
```

---

## 🛠️ Development Guide

### Built With

- **TypeScript** - Node language
- **@devlikeapro/n8n-openapi-node** - OpenAPI → n8n generator
- **n8n-workflow** - n8n node types
- **Gamma OpenAPI v3 spec** - API specification

### Key Files

**`nodes/Gamma/Gamma.node.ts`**
- Main node implementation
- Auto-generated from OpenAPI spec using `@devlikeapro/n8n-openapi-node`
- Handles all API operations

**`credentials/GammaApi.credentials.ts`**
- API key authentication
- Header: `X-API-KEY`

**`package.json`**
- npm package configuration
- MUST include `n8n-community-node-package` in keywords
- MUST start with `n8n-nodes-`

---

## 📝 Publishing

### To npm (Unverified)

```bash
# 1. Update version
npm version patch  # or minor, major

# 2. Build
npm run build

# 3. Publish
npm publish
```

Anyone with self-hosted n8n can install immediately.

### For Verification (n8n Cloud)

Requirements for verified community nodes:
- ✅ MIT license
- ✅ No runtime dependencies in package.json
- ✅ Passes `npm run lint`
- ✅ Good documentation
- ✅ Follows n8n conventions

**Steps:**
1. Publish to npm (unverified first)
2. Submit via [n8n Creator Portal](https://n8n.io/creators)
3. Wait for manual review
4. Once approved → available on n8n Cloud

See `docs/VERIFICATION.md` for details.

---

## 🔗 Resources

**Official Gamma:**
- API Docs: https://developers.gamma.app
- Help Center: https://help.gamma.app
- API Slack: [Contact for access]

**n8n Documentation:**
- Creating Nodes: https://docs.n8n.io/integrations/creating-nodes/
- Community Nodes: https://docs.n8n.io/integrations/community-nodes/
- Declarative Style: https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/

**OpenAPI Generator:**
- devlikeapro/n8n-openapi-node: https://github.com/devlikeapro/n8n-openapi-node
- npm package: https://www.npmjs.com/package/@devlikeapro/n8n-openapi-node

---

## 💪 Why This Matters for Gamma

### Developer Relations Play

**This n8n node:**
- Expands Gamma's automation ecosystem beyond Zapier/Make
- Reaches self-hosted automation users (enterprises, privacy-focused)
- Shows commitment to open integration ecosystem
- Provides reference implementation for community

**For your DevRel role:**
- Demonstrates technical ability (built official integration)
- Shows ownership (end-to-end from spec to published node)
- Community engagement (support users in n8n forums)
- Content creation opportunity (tutorials, videos, blog posts)

---

## 📊 Success Metrics

Track these to show impact:
- npm downloads/week
- n8n Cloud installations (after verification)
- Community forum mentions
- GitHub stars/forks
- Support tickets reduced (self-service via node)

---

## 🎯 Roadmap

**Phase 1: MVP** (You are here)
- [x] Project setup
- [ ] Generate node from OpenAPI spec
- [ ] Test locally
- [ ] Publish to npm (unverified)

**Phase 2: Polish**
- [ ] Add examples folder with workflows
- [ ] Create video tutorial
- [ ] Write blog post
- [ ] Submit for verification

**Phase 3: Growth**
- [ ] Community support in n8n forums
- [ ] Advanced workflow examples
- [ ] Integration guides
- [ ] Case studies

---

**Status:** Ready for development  
**Next Step:** Run setup script to generate node from OpenAPI spec

See `docs/SETUP.md` for complete development guide.



