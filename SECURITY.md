# Security & Launch Checklist

## ✅ Safe to Push to GitHub Now

- ✓ No API keys or secrets in code
- ✓ `.gitignore` properly configured (excludes `.env`, `dist/`, `node_modules/`)
- ✓ No hardcoded credentials
- ✓ All package dependencies verified (legitimate npm packages)
- ✓ No sensitive file permissions issues

## ⚠️ Before Launch — Replace Placeholders

These values are intentionally placeholder and MUST be replaced before going live:

### In `astro.config.mjs`
```js
site: 'https://PLACEHOLDER-DOMAIN.example',  // → Replace with actual domain
```

### In `src/pages/menu.astro`
```html
href="tel:+1-TODO"  // → Replace with actual phone number
```

**Launch gate:** After replacing both, search the codebase:
```bash
grep -r "PLACEHOLDER\|TODO" src/ astro.config.mjs
```
Should return 0 results.

---

## Environment Variables (If Needed Later)

If PagesCMS or other integrations require API keys:

1. **Create `.env.local` (gitignored):**
   ```
   PAGESCMS_API_KEY=your-key-here
   ```

2. **Reference in code:**
   ```ts
   const apiKey = import.meta.env.PAGESCMS_API_KEY;
   ```

3. **For production (Vercel, etc.):**
   Set environment variables in platform settings, never in git.

---

## Safe to Push

- `package.json` & `package-lock.json` ✓
- `astro.config.mjs` (with PLACEHOLDER-DOMAIN) ✓
- `.pages.yml` ✓
- All source code ✓
- All config files except `.env*` ✓

## DO NOT PUSH

- `.env` (local secrets)
- `.env.local` (development secrets)
- `.env.production` (if accidentally created)
- `node_modules/` (auto-reinstalled from package.json)
- `dist/` (rebuilt on deploy)
- `.astro/` (generated)
- Any files with actual domain/phone/passwords

---

## GitHub Recommendations

1. Enable branch protection on `main`
2. Require PR reviews before merge
3. Enable "Require status checks to pass" (if CI/CD set up)
4. Use GitHub Secrets for any sensitive deploy values

---

## Safe to Share

- This entire GitHub repo ✓
- `.pages.yml` with other developers ✓
- All documentation and code ✓

## NOT Safe to Share

- `.env` or any `.env.*` files
- PagesCMS admin credentials
- Domain registrar details
- Google Business Profile credentials
