# Finding Your npm 2FA Code in 1Password

## 🔍 Where to Find It

### In 1Password App:

1. **Open 1Password**
2. **Search for "npm"**
3. Click on your npm login entry
4. Look for a **6-digit rotating code** (updates every 30 seconds)
5. **That's your OTP code!**

**It might be labeled as:**
- "One-time password"
- "TOTP"
- "Verification code"
- Or just a 6-digit number that changes

---

## 🔐 If You Don't See a Code

npm might not be set up for TOTP in 1Password yet.

### Check npm Website:

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tfa
2. See what 2FA method is enabled
3. Options might be:
   - **Authenticator app** (TOTP - this generates codes)
   - **Security key** (like YubiKey - no rotating codes)
   - **Passkey** (WebAuthn - no codes)

---

## 💡 Solutions

### If Using Security Key/Passkey (Not TOTP):

You can't get an OTP code because you're using WebAuthn, not TOTP.

**Option 1: Use `npm login` in browser**
```bash
npm login
# Click the URL it gives you
# Authenticate with your security key in browser
# Then it logs in the CLI
```

**Option 2: Generate a publishing token instead**
1. Go to https://www.npmjs.com/settings/max.jackson/tokens
2. Create "Granular Access Token"
3. Set organization: @gammatech
4. Permission: Read and write
5. Copy the token
6. Use to publish:
```bash
npm publish --access public
# When prompted for password, paste the token
```

---

## 🎯 Easiest Solution: Skip OTP with Token

Instead of using password + OTP, use a token:

1. Browser: Create granular access token (as described above)
2. Terminal:
```bash
echo "//registry.npmjs.org/:_authToken=YOUR_TOKEN_HERE" > ~/.npmrc
npm publish --access public
```

This bypasses the OTP requirement!

---

**Try the token method - it's easier than finding the OTP!**

