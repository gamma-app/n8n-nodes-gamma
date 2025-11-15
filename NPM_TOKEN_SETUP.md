# npm Granular Access Token Setup

## 🔑 Token Settings for Publishing @gammatech/n8n-nodes

Go to: **https://www.npmjs.com/settings/YOUR_USERNAME/tokens/granular-access-tokens/new**

---

## ✅ Required Settings

### Token Name
```
Gamma n8n Node Publishing Token
```

### Expiration
```
Custom - 90 days (or longer if you have 2FA enabled)
```

### Packages and scopes

#### Permissions
Select: **Read and write**

#### Organizations
Select: **@gammatech**

#### Packages
Select: **All packages** (or specifically select `@gammatech/n8n-nodes` if it exists)

---

## 📋 Full Configuration

```
Token name: Gamma n8n Node Publishing Token
Description: Token for publishing n8n community node
Expiration: 90 days
Organizations: @gammatech
Permissions: Read and write
Packages: All packages in @gammatech
```

---

## ⚠️ Required Permissions

For publishing, you MUST have:
- ✅ **Read and write** access
- ✅ Access to **@gammatech** organization
- ✅ **Publish** permission enabled

---

## 🚀 After Creating Token

1. **Copy the token** (starts with `npm_...`)
2. **Save it securely** (you won't see it again!)
3. Run:
   ```bash
   npm login
   ```
   When prompted, paste the token as your password

4. Or set it directly:
   ```bash
   npm config set //registry.npmjs.org/:_authToken npm_YOUR_TOKEN
   ```

---

## ✅ Then Publish

```bash
cd "/Users/max.jackson/claude-skills + documentation extracter/n8n-gamma-node"
npm publish --access public
```

---

## 🔍 If You Don't See @gammatech

You may not have access yet. Ask your CTO to:

```bash
npm org add gammatech YOUR_NPM_USERNAME --role developer
```

**Role**: Developer (allows publishing)

---

## 📝 Quick Summary

**Minimum permissions needed:**
- Organization: @gammatech
- Permission: Read and write
- Type: Granular Access Token
- Scope: All packages (or specific to @gammatech/n8n-nodes)

That's it!

