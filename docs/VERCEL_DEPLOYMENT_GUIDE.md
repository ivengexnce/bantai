# BANTAI — Production Vercel Deployment Guide

## 1. Overview
The BANTAI web application (`apps/web`) is built with Next.js 14 App Router and is fully optimized for continuous deployment on Vercel.

---

## 2. Infrastructure Architecture for Vercel
**Crucial Architectural Note (Section 13):**
Vercel serverless functions are stateless and cannot host a persistent GPU-based LLM (e.g. 7B parameter models) or long-running training jobs.
Therefore:
- **Vercel** hosts: Next.js Frontend (`apps/web`) & Edge UI assets.
- **Persistent Self-Hosted Server** (e.g. AWS EC2 GPU instance / RunPod / Dedicated Linux machine / Docker) hosts:
  - Node.js Backend (`packages/backend`) on port 4000.
  - Self-hosted Ollama / llama.cpp on port 11434 / 8080.
  - MongoDB database.

---

## 3. Step-by-Step Vercel Deployment

### Step 1: Connect GitHub Repository to Vercel
1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your `bantai` repository.

### Step 2: Configure Project Settings
- **Framework Preset**: `Next.js`
- **Root Directory**: `apps/web`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### Step 3: Configure Environment Variables
In the Vercel Project Settings > Environment Variables, add:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://api.your-domain.com/api` | Public URL of your self-hosted backend API |
| `NODE_ENV` | `production` | Production environment flag |

### Step 4: Deploy
Click **Deploy**. Vercel will build and assign your production domain:
`https://bantai.vercel.app`
