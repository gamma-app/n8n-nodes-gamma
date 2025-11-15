# npm Organization Permissions Explained

## ❓ Do You Need to Be an Owner?

**NO!** You just need to be a **member** with **developer** role.

---

## 🔑 npm Organization Roles

### Owner
- Full admin access
- Can add/remove members
- Can publish packages
- Can manage billing

### Admin  
- Can add/remove members
- Can publish packages
- Cannot manage billing

### Developer (What You Need!)
- ✅ **Can publish packages** ✅
- Can read all packages
- Cannot add members

### Member (Read-only)
- Can only read packages
- Cannot publish

---

## ✅ What You Need

**For publishing @gammatech/n8n-nodes:**

1. **Be added to @gammatech org** (any role except "member")
2. **Have "developer" role or higher**
3. **Create your own personal access token** (on YOUR npm account)
4. **That token inherits YOUR permissions** (including @gammatech access)

---

## 🔍 Check Your Access

```bash
# Check if you're in the org
npm org ls gammatech

# Check your role
npm org ls gammatech YOUR_NPM_USERNAME
```

**If you see your name → you have access!**

**If "developer" or "admin" or "owner" → you can publish!**

---

## 🎯 The Token

**You create the token on YOUR account:**
- Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
- Create granular access token
- Select organization: @gammatech
- Permission: Read and write
- **The token gets YOUR permissions automatically**

You DON'T need to be an owner to create a token!

---

## 📝 Ask Your CTO

> "Can you add me to the @gammatech npm org with developer role? That will let me publish the n8n package."

Command he runs:
```bash
npm org add gammatech YOUR_NPM_USERNAME --role developer
```

---

**tl;dr: You need "developer" role, not "owner"!**

