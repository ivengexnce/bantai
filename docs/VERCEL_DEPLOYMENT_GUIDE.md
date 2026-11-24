# BANTAI — Production Deployment & Docker Guide

## 1. Architecture Split: Vercel Frontend + Self-Hosted Backend
The Next.js 14 App Router frontend (`apps/web`, using `@bantai/shared` transpiled in `next.config.mjs`) deploys cleanly to Vercel Edge/Node runtimes. However, persistent Ollama/llama.cpp GPU inference, local JSON/Mongo stores, and PyTorch QLoRA scripts must run on a persistent host (local Linux/Windows workstation, GPU VM, or Docker host).

---

## 2. Vercel Deployment (`apps/web`)
1. Connect the `bantai` repository in Vercel and click **Add New Project**.
2. Set **Framework Preset** to `Next.js` and **Root Directory** to `apps/web`.
3. Build settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
4. Set **Environment Variables** in Vercel:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://your-backend-domain.com/api` | HTTPS endpoint pointing to your self-hosted `@bantai/backend` instance. |
| `NODE_ENV` | `production` | Production build flag. |

5. On your self-hosted backend `.env`, add your deployed Vercel URL to `CLIENT_URLS` (e.g., `CLIENT_URLS=https://your-app.vercel.app`) so CORS in `packages/backend/src/index.ts` accepts requests cleanly.

---

## 3. Full-Stack Docker Compose (`docker/docker-compose.yml`)
BANTAI includes multi-stage Alpine Dockerfiles (`docker/Dockerfile.backend`, `docker/Dockerfile.web`) orchestrated by `docker/docker-compose.yml` defining four containers:
- `bantai-mongodb` (`mongo:7.0`, port `27017`)
- `bantai-ollama` (`ollama/ollama:latest`, port `11434`, optional NVIDIA GPU reservation block)
- `bantai-backend` (port `4000`, requires `JWT_SECRET` in environment)
- `bantai-web` (port `3000` inside compose, pointing `NEXT_PUBLIC_API_URL` to `http://localhost:4000/api`)

```bash
# Generate a strong JWT secret and export it before launching Compose
export JWT_SECRET=$(openssl rand -hex 64)
docker compose -f docker/docker-compose.yml up --build -d
```
