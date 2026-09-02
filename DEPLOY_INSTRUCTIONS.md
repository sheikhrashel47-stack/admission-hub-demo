# Admission Hub Worker Deploy Instructions

## Step 1: Install Wrangler
```bash
npm install -g wrangler
```

## Step 2: Login to Cloudflare
```bash
wrangler login
```

## Step 3: Create KV Namespaces
```bash
wrangler kv:namespace create PUB_KV
wrangler kv:namespace create GK_KV
```

## Step 4: Update wrangler.toml
Replace `YOUR_PUB_KV_ID_HERE` and `YOUR_GK_KV_ID_HERE` with actual IDs from Step 3.

## Step 5: Set Secrets
```bash
wrangler secret put RESEND_KEY
wrangler secret put ADMIN_TOKEN
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
# Add other secrets as needed
```

## Step 6: Deploy
```bash
wrangler deploy
```

## Verify
```bash
curl https://admission-gk.rashelzayan213.workers.dev/api/health
```
