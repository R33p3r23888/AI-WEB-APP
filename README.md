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
3. Before deploying (or right after, then redeploy), go to **Settings → Environment Variables** and add these two — this time you *do* type them in yourself, since these are secrets from Groq and MongoDB, not something Vercel can auto-generate:

   | Name | Value |
   |---|---|
   | `GROQ_API_KEY` | the `gsk_...` key from step 1 |
   | `MONGODB_URI` | the connection string from step 2 |

4. Click **Deploy** (or **Redeploy** if you already deployed before adding the variables).
5. Open your site. Try sending a message — chat history will appear in the sidebar and persist across visits on the same browser.

## How it works
- **No login system** — each browser gets a random device ID (stored locally) and its chat history is scoped to that ID. Opening the site on a different device starts a fresh, separate history. Real user accounts (email/password login) would be the next step up if you want history to follow *you* rather than the device.
- **The AI model** defaults to Llama 3.3 70B via Groq. You can change it by adding an optional `GROQ_MODEL` environment variable with a different model name from console.groq.com's model list.
- **File generation**: whenever the AI writes code in a fenced block, a Download button appears on it automatically (Python, JavaScript, HTML, etc. all get the right file extension). There's also a "Download response" button on every reply for downloading a whole answer as a `.md` file.

## Costs to be aware of
Both Groq's and MongoDB Atlas's free tiers are generous for personal or small-team use, but they are rate/storage limited — if usage grows a lot, check each provider's pricing page before it becomes a surprise.
