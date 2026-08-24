# Atlas — AI Assistant

A ChatGPT/Claude-style assistant: sidebar chat history, markdown responses, and download buttons on any code or document it writes.

## What you need (all free)

| Service | For | Get it at | Card needed? |
|---|---|---|---|
| Groq | Powers the AI replies | console.groq.com | No |
| MongoDB Atlas | Saves chat history | mongodb.com/cloud/atlas/register | No |
| Vercel | Hosts the site | vercel.com | No |

### 1. Get a Groq API key
1. Go to **console.groq.com** and sign up (email or Google — no card).
2. Go to **API Keys** in the left menu → **Create API Key**.
3. Copy the key (starts with `gsk_...`). You won't be able to see it again, so paste it somewhere safe for a moment.

### 2. Get a MongoDB Atlas connection string
1. Go to **mongodb.com/cloud/atlas/register** and sign up.
2. When asked to create a cluster, choose the **M0 (Free)** tier — it's free forever, no card required.
3. Under **Database Access**, create a database user (username + password — save these).
4. Under **Network Access**, click **Add IP Address** → **Allow Access From Anywhere** (`0.0.0.0/0`). This is required because Vercel's servers don't have a fixed IP.
5. Go to your cluster → **Connect** → **Drivers** → copy the connection string. It looks like:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Replace `<username>` and `<password>` with the ones you created in step 3.

## Deploy to Vercel

1. Push this whole folder to GitHub — `index.html`, `package.json`, and the `api` folder.
2. Go to vercel.com → **Add New → Project** → import the repo. Leave Build/Output/Install commands blank as usual.
3. Before deploying (or right after, then redeploy), go to **Settings → Environment Variables** and add these — you *do* type them in yourself, since these are secrets from your AI provider and MongoDB, not something Vercel can auto-generate:

   | Name | Value |
   |---|---|
   | `AI_API_KEY` | your API key from whichever provider you're using (see below) |
   | `AI_PROVIDER` | `groq`, `gemini`, or `openrouter` — tells the code which one you picked |
   | `MONGODB_URI` | the connection string from the MongoDB step above |

4. Click **Deploy** (or **Redeploy** if you already deployed before adding the variables).
5. Open your site. Try sending a message — chat history will appear in the sidebar and persist across visits on the same browser.

## Choosing (or switching) an AI provider

The code supports three free providers out of the box. You only ever need to set `AI_API_KEY` and `AI_PROVIDER` — nothing in the code itself needs to change.

| Provider | `AI_PROVIDER` value | Get a key at | Card needed? |
|---|---|---|---|
| Groq | `groq` | console.groq.com | No |
| Google Gemini | `gemini` | aistudio.google.com/apikey | No |
| OpenRouter | `openrouter` | openrouter.ai/keys | No |

**If one provider gives you trouble, switching is just this:** go to Vercel → Settings → Environment Variables, update `AI_API_KEY` to the new key and `AI_PROVIDER` to the new provider name, then Redeploy. No code edits.

If you were already running this with just `GROQ_API_KEY` set (no `AI_PROVIDER`/`AI_API_KEY`), that still works exactly as before — it's kept as a fallback, so you don't need to change anything unless you want to switch providers.

**Using a different model:** each provider has a sensible default model already picked. To use a different one, add an `AI_MODEL` environment variable with the exact model name from that provider's docs (e.g. `gemini-1.5-flash`, or another model listed on openrouter.ai/models with a `:free` tag so it stays free).

## How it works
- **No login system** — each browser gets a random device ID (stored locally) and its chat history is scoped to that ID. Opening the site on a different device starts a fresh, separate history. Real user accounts (email/password login) would be the next step up if you want history to follow *you* rather than the device.
- **Errors are now specific** — if something's misconfigured (wrong key, wrong model name, database unreachable), the chat will show you the actual reason in a red banner rather than a generic "couldn't reach the server" message.
- **File generation**: whenever the AI writes code in a fenced block, a Download button appears on it automatically (Python, JavaScript, HTML, etc. all get the right file extension). There's also a "Download response" button on every reply for downloading a whole answer as a `.md` file.

## Costs to be aware of
All three AI providers and MongoDB Atlas's free tiers are generous for personal or small-team use, but they are rate/storage limited — if usage grows a lot, check each provider's pricing page before it becomes a surprise.
