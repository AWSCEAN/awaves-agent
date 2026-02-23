# ACE-55: Capacitor WebView APK + EKS Deployment Infrastructure

## Status: COMPLETED ✅
## Branch: feature/ACE-55
## Date: 2026-02-21
## Agents: Frontend Dev → Review → QA → Docs

---

## Context

The awaves web app is mobile-responsive (ACE-48). This task wires the full production deployment architecture:

- The same Next.js Docker image is deployed **twice** in EKS — once for browser users (`web.awaves.app`) and once for the APK WebView (`mobile.awaves.app`), with independent scaling via HPA
- The Capacitor APK is a thin WebView shell (no bundled assets) that loads `https://mobile.awaves.app`
- The mobile fix for `handleSpotClick` (results panel coexisting with detail panel on desktop) was applied in a prior step

### Current State (before this task)

| Item | State |
|------|-------|
| `apps/web/capacitor.config.ts` | EXISTS — URL is wrong (`awaves.app`, not `mobile.awaves.app`) |
| `apps/web/next.config.js` | EXISTS — missing `output: 'standalone'` (required for Docker) |
| `apps/web/Dockerfile` | MISSING |
| `.dockerignore` (repo root) | MISSING |
| `apps/web/android/` | MISSING (Android project never initialized) |
| `infra/k8s/` | MISSING (all K8s manifests are net-new) |
| Capacitor deps | INSTALLED (`@capacitor/android`, `@capacitor/cli`, `@capacitor/core` v8.1.0) |
| `apps/web/package.json` scripts | CORRECT (`cap:sync`, `cap:open`, `cap:build`) |
| `apps/web/tsconfig.json` | CORRECT (`capacitor.config.ts` excluded from TS) |

---

## Final Architecture

```
User (browser)                    Android APK (Capacitor WebView)
       │                                     │
       └──────────────┬──────────────────────┘
                      ▼
                  Route 53
                      │
                      ▼
                 CloudFront (CDN)
                 ├── /_next/static/* ──────────────────────► S3 bucket (FE static assets)
                 │                                            JS chunks, CSS, images
                 │                                            Cache-Control: immutable, 1yr
                 └── /* (all other routes) ─────────────────► ALB-Ingress
                                                                    │
                                                                    ▼
                                                                EKS Cluster
                                                    ┌───────────────────────────────┐
                                                    │ Namespace: web                │
                                                    │   react-web pod (SSR)         │
                                                    │   HPA min:2 / max:10          │
                                                    │   ← web.awaves.app            │
                                                    ├───────────────────────────────┤
                                                    │ Namespace: mobile             │
                                                    │   react-mobile pod (SSR)      │
                                                    │   HPA min:1 / max:3           │
                                                    │   ← mobile.awaves.app (APK)   │
                                                    ├───────────────────────────────┤
                                                    │ Namespace: api                │
                                                    │   fastapi pod                 │
                                                    │   ← api.awaves.app            │
                                                    └───────────────────────────────┘
```

**How static assets flow:**
- Next.js SSR pods render HTML and inject `<script src="https://cdn.awaves.app/_next/static/...">` tags
- The browser/WebView fetches those assets directly from CloudFront → S3 (never hits the EKS pod)
- This keeps pod CPU/bandwidth low and gives globally-cached static files via CloudFront edge nodes
- `assetPrefix` in `next.config.js` is what tells Next.js to prefix all static asset URLs with the CloudFront domain

---

## Step-by-Step Execution

### STEP 1 — Update `apps/web/next.config.js`

**File:** `apps/web/next.config.js`

**Why — `output: 'standalone'`:** Makes `next build` produce `.next/standalone/` — a self-contained Node.js server with only the modules it needs. Required for the Docker multi-stage build (without it, the image needs the full 500MB+ `node_modules`).

**Why — `assetPrefix`:** When Next.js renders HTML on the EKS pod, it injects `<script>` and `<link>` tags for the static JS/CSS bundles. By default these point to `/` on the same server — but we want them to point to CloudFront so the browser/WebView fetches static files from the CDN (S3 origin), not from the EKS pod. Setting `assetPrefix` to the CloudFront domain achieves this. The value comes from `NEXT_PUBLIC_CDN_URL` which is set in the EKS deployment environment; locally it defaults to empty string (falls back to serving from the pod itself, which is fine for dev).

**Change:** Add `output: 'standalone'` and `assetPrefix` to `nextConfig`.

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',                                            // ADD — required for Docker
  assetPrefix: process.env.NEXT_PUBLIC_CDN_URL || '',             // ADD — CloudFront CDN URL
  transpilePackages: ['@shared/types'],
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
```

**Verify:**
```bash
grep -E "output|assetPrefix" apps/web/next.config.js
# expected:
#   output: 'standalone',
#   assetPrefix: process.env.NEXT_PUBLIC_CDN_URL || '',
```

---

### STEP 2 — Update `apps/web/capacitor.config.ts`

**File:** `apps/web/capacitor.config.ts`

**Why:** The APK WebView must load the mobile-specific EKS subdomain, not the root domain. This is a one-line change.

**Change:** In the `server` block, change:
```typescript
url: 'https://awaves.app',
```
to:
```typescript
url: 'https://mobile.awaves.app',
```

Everything else in this file stays identical.

**Verify:** `grep "url:" apps/web/capacitor.config.ts` → should return `url: 'https://mobile.awaves.app'`

---

### STEP 3 — Create `.dockerignore` (repo root)

**File:** `.dockerignore` (at monorepo root — NOT inside `apps/web/`)

**Why:** The Docker build context must be the monorepo root so pnpm can resolve the `@shared/types` workspace package. Without this file, Docker sends the entire repo (including `node_modules`, `.next`, `android/`, etc.) as build context, causing multi-minute upload times and cache invalidation on every build.

**Content:**
```
node_modules
apps/web/node_modules
apps/web/.next
apps/web/out
apps/web/android
apps/api/.venv
apps/api/__pycache__
**/.env*
**/*.log
**/.turbo
**/coverage
```

---

### STEP 4 — Create `apps/web/Dockerfile`

**File:** `apps/web/Dockerfile`

**Why:** Containerizes the Next.js app for EKS. Multi-stage build:
- Stage 1 (`builder`): Full Node.js + pnpm workspace, installs all deps, runs `next build` to produce `.next/standalone/`
- Stage 2 (`runner`): Node.js slim, copies only the standalone output — no `node_modules` install needed

The build context must be the **monorepo root** (not `apps/web/`) because pnpm needs `pnpm-workspace.yaml` and `pnpm-lock.yaml` at root to resolve `@shared/types`.

Non-root user (`nextjs`) mirrors the pattern in `apps/api/Dockerfile`.

**Content:**
```dockerfile
# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /repo

# pnpm@9.1.0 — must match "packageManager" in root package.json exactly
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# NEXT_PUBLIC_* vars are replaced with their literal values at build time by
# Next.js. They must be declared as ARGs here so `next build` can inline them
# into the JS bundles. Setting them only in K8s deployment env has no effect
# on the already-built output.
ARG NEXT_PUBLIC_CDN_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_CDN_URL=$NEXT_PUBLIC_CDN_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN

# Copy workspace manifests first — separate layer for caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/web/ ./apps/web/
COPY packages/shared/ ./packages/shared/

WORKDIR /repo/apps/web
RUN pnpm build

# ── Stage 2: Production runner ─────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Non-root user (mirrors apps/api/Dockerfile pattern)
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone output includes inlined node_modules — no full install needed
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

**Build command (from repo root):**
```bash
# NEXT_PUBLIC_* values must be passed at build time — they are baked into the JS bundles
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_CDN_URL=https://cdn.awaves.app \
  --build-arg NEXT_PUBLIC_API_URL=https://api.awaves.app \
  --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=pk.YOUR_TOKEN_HERE \
  -t awaves-web:latest .
```

> **Why build args and not just K8s env vars?**
> `NEXT_PUBLIC_*` variables are a Next.js build-time feature. During `next build`, the compiler finds every occurrence of `process.env.NEXT_PUBLIC_FOO` in client code and replaces it with the literal string value. By the time the Docker image is running in a pod, those strings are already hardcoded in the JS bundles — setting `NEXT_PUBLIC_*` in K8s env has no effect on client-side code. The K8s env entries for these vars are informational only (they document what was baked in). Only non-`NEXT_PUBLIC_` vars (server-side only) can be changed at pod runtime.

---

### STEP 4.5 — S3 Static Asset Upload (per deploy)

**Why:** Next.js places all JS chunks, CSS files, and fonts in `.next/static/`. With `assetPrefix` set to the CloudFront domain, the EKS pods will render HTML that references `https://cdn.awaves.app/_next/static/...`. If those files don't exist in S3, the browser/WebView will get 404s for all scripts and styles. This sync step must run **after every `next build`** (every new Docker image push).

**S3 bucket structure:**
```
s3://awaves-fe-static/
└── _next/
    └── static/
        ├── chunks/         ← JS bundles
        ├── css/            ← CSS files
        └── media/          ← fonts, images referenced in CSS
```

**Cache-Control strategy:**
- `immutable` + `max-age=31536000` (1 year): Safe because Next.js content-hashes every filename (e.g. `main-abc123.js`). A new build produces new filenames — old files stay in S3 without breaking old clients mid-session.

**Commands (run from repo root, after building the Docker image):**

```bash
# Option A: Extract from a local build (run next build locally first)
cd apps/web
pnpm build
# Then sync .next/static/ to S3:
aws s3 sync apps/web/.next/static/ s3://<YOUR-S3-BUCKET>/_next/static/ \
  --cache-control "public,max-age=31536000,immutable" \
  --region ap-northeast-2

# Option B: In CI/CD pipeline — run next build, sync to S3, then build Docker image
# (same commands, just sequenced in the pipeline)
```

**CloudFront cache behavior to configure (in AWS Console or Terraform):**

| Path pattern | Origin | Cache TTL | Notes |
|---|---|---|---|
| `/_next/static/*` | S3 bucket | max (1 yr) | Static assets — immutable, content-hashed |
| `/api/*` | ALB | No cache | FastAPI calls |
| `/*` (default) | ALB | Short / no cache | SSR HTML pages |

**⚠️ Replace `<YOUR-S3-BUCKET>` with your actual bucket name before running.**

---

### STEP 5 — Initialize Android Project

**Why:** The `apps/web/android/` directory does not exist. Capacitor cannot sync until the native platform is initialized. Steps 1 and 2 must be complete first.

**Note on URL-wrapper mode:** In URL-wrapper mode, `webDir` content is NOT bundled into the APK — the APK loads from `https://mobile.awaves.app`. The `--web-dir .next` flag only satisfies Capacitor's init-time directory existence check. APK size stays small (~5-10MB).

**⚠️ QA Note:** `capacitor.config.ts` already exists in the repo (listed in Current State above). Running `npx cap init` on an existing config **errors in Capacitor v8**. Skip the init step entirely — go straight to `cap add android`.

**Commands (run from `apps/web/`):**

```bash
# 5a: Build Next.js first (Capacitor needs the webDir to exist before syncing)
cd apps/web
pnpm build

# 5b: Add Android platform (generates apps/web/android/ native project)
#     Capacitor reads appId/appName/webDir from the existing capacitor.config.ts
npx cap add android

# 5c: Sync web config into Android project
npx cap sync android
```

**Verify:** `ls apps/web/android/` → should show `app/`, `gradlew`, `gradle/`, `capacitor.settings.gradle`, etc.

---

### STEP 6 — Create Kubernetes Manifests (`infra/k8s/`)

**Directory:** `infra/k8s/` (net-new — `infra/` does not exist yet)

Create 8 files in order:

---

#### 6a — `infra/k8s/namespace.yaml`

**Why:** Logical isolation between web and mobile deployments. Each namespace gets independent RBAC, network policies, and resource quotas. This is what allows "web team deploys independently of mobile team" in a real company.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: web
  labels:
    app.kubernetes.io/part-of: awaves
---
apiVersion: v1
kind: Namespace
metadata:
  name: mobile
  labels:
    app.kubernetes.io/part-of: awaves
```

---

#### 6b — `infra/k8s/web-deployment.yaml`

**Why:** Serves browser users at `web.awaves.app`. 2 replicas default for high availability. Mapbox token loaded from a K8s Secret to avoid baking secrets into the image.

**⚠️ Replace `<ECR_REGISTRY>` with your actual ECR URI before applying.**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: react-web
  namespace: web
  labels:
    app: react-web
    app.kubernetes.io/part-of: awaves
spec:
  replicas: 2
  selector:
    matchLabels:
      app: react-web
  template:
    metadata:
      labels:
        app: react-web
    spec:
      containers:
        - name: web
          image: <ECR_REGISTRY>/awaves-web:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: NEXT_PUBLIC_API_URL
              value: "https://api.awaves.app"
            - name: NEXT_PUBLIC_CDN_URL
              value: "https://cdn.awaves.app"             # CloudFront URL — sets assetPrefix at runtime
            - name: NEXT_PUBLIC_MAPBOX_TOKEN
              valueFrom:
                secretKeyRef:
                  name: awaves-web-secrets
                  key: mapbox-token
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
```

---

#### 6c — `infra/k8s/mobile-deployment.yaml`

**Why:** Serves the APK WebView at `mobile.awaves.app`. Uses the **same image** as the web deployment — this is Option A (one build, two deployments). Starts at 1 replica; HPA scales up during traffic spikes.

**⚠️ Replace `<ECR_REGISTRY>` with your actual ECR URI before applying.**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: react-mobile
  namespace: mobile
  labels:
    app: react-mobile
    app.kubernetes.io/part-of: awaves
spec:
  replicas: 1
  selector:
    matchLabels:
      app: react-mobile
  template:
    metadata:
      labels:
        app: react-mobile
    spec:
      containers:
        - name: mobile
          image: <ECR_REGISTRY>/awaves-web:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: NEXT_PUBLIC_API_URL
              value: "https://api.awaves.app"
            - name: NEXT_PUBLIC_CDN_URL
              value: "https://cdn.awaves.app"             # same CloudFront — serves static assets for mobile pods too
            - name: NEXT_PUBLIC_MAPBOX_TOKEN
              valueFrom:
                secretKeyRef:
                  name: awaves-web-secrets
                  key: mapbox-token
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
```

---

#### 6d — `infra/k8s/web-service.yaml`

**Why:** ClusterIP Service gives the Ingress a stable DNS target. The ALB Ingress Controller routes to Services, not Pods directly.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  namespace: web
  labels:
    app: react-web
spec:
  selector:
    app: react-web
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
```

---

#### 6e — `infra/k8s/mobile-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mobile-service
  namespace: mobile
  labels:
    app: react-mobile
spec:
  selector:
    app: react-mobile
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
```

---

#### 6f — `infra/k8s/ingress.yaml`

**Why:** Two Ingress objects share one ALB via `alb.ingress.kubernetes.io/group.name: awaves-frontend`. This avoids provisioning two separate ALBs (cost saving). Host-based routing sends `web.awaves.app` → web namespace and `mobile.awaves.app` → mobile namespace.

**⚠️ Replace `<ACM_CERT_ARN>` with your actual ACM certificate ARN before applying.**
A wildcard cert `*.awaves.app` covers both subdomains.

**Prerequisites:**
- AWS Load Balancer Controller must be installed in the cluster
- ACM certificate for `*.awaves.app` must exist in AWS Certificate Manager

```yaml
# Ingress for web namespace
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  namespace: web
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: <ACM_CERT_ARN>
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/group.name: awaves-frontend
    alb.ingress.kubernetes.io/group.order: "1"
spec:
  rules:
    - host: web.awaves.app
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
---
# Ingress for mobile namespace
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mobile-ingress
  namespace: mobile
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: <ACM_CERT_ARN>
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/group.name: awaves-frontend
    alb.ingress.kubernetes.io/group.order: "2"
spec:
  rules:
    - host: mobile.awaves.app
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: mobile-service
                port:
                  number: 80
```

---

#### 6g — `infra/k8s/web-hpa.yaml`

**Why:** HPA autoscales the web deployment on CPU. min:2 ensures no single point of failure (one pod can die while the other serves traffic). max:10 caps cost.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa
  namespace: web
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: react-web
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

#### 6h — `infra/k8s/mobile-hpa.yaml`

**Why:** Mobile deployment scales more conservatively. APK user base starts smaller; min:1 saves cost. max:3 allows headroom for traffic spikes.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mobile-hpa
  namespace: mobile
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: react-mobile
  minReplicas: 1
  maxReplicas: 3
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

### STEP 7 — Update `docs/mobile/capacitor-setup.md`

**File:** `docs/mobile/capacitor-setup.md`

**Changes needed:**

1. **Step 2 block** — Replace the placeholder URL explanation with `https://mobile.awaves.app` and add a callout explaining the two-domain EKS architecture.

2. **Troubleshooting section** — Update `NEXT_PUBLIC_API_URL` example from `https://api.awaves.app` (it's already correct in the file).

3. **Add "EKS Deployment Architecture" section** — New section after the Troubleshooting section, before the end of the doc, referencing `infra/k8s/` for the full K8s setup.

**New Step 2 content:**
```markdown
## Step 2: Configure the App URL

The app URL is pre-configured to the mobile EKS subdomain in
[apps/web/capacitor.config.ts](../../apps/web/capacitor.config.ts):

```typescript
server: {
  url: 'https://mobile.awaves.app',  // EKS mobile deployment endpoint
  cleartext: false,
  androidScheme: 'https',
},
```

> **Why `mobile.awaves.app` (not `awaves.app`)?**
> The EKS cluster runs two separate Deployments from the same Docker image:
> - `web.awaves.app` → `react-web` Deployment (browser users, HPA min:2/max:10)
> - `mobile.awaves.app` → `react-mobile` Deployment (APK WebView, HPA min:1/max:3)
>
> This gives the APK an isolated, independently-scalable entry point.
> See [infra/k8s/](../../infra/k8s/) for all Kubernetes manifests.

> **For local testing**, temporarily use:
> ```typescript
> url: 'http://10.0.2.2:3000'  // Android emulator localhost
> // or
> url: 'http://YOUR_LOCAL_IP:3000'  // physical device on same WiFi
> ```
```

**New "EKS Deployment Architecture" section (append before end of file):**
```markdown
---

## EKS Deployment Architecture

The Capacitor APK uses a **URL-wrapper mode** — it loads the live web app from AWS EKS
rather than bundling static assets. This means you must deploy the web app to EKS first.

### One Image, Two Deployments

The same Docker image (`awaves-web:latest`) is deployed twice:

| Deployment | Namespace | Replicas | Domain | Users |
|------------|-----------|----------|--------|-------|
| `react-web` | `web` | min:2, max:10 | `web.awaves.app` | Browser |
| `react-mobile` | `mobile` | min:1, max:3 | `mobile.awaves.app` | APK WebView |

### Deploy to EKS

```bash
# Apply all manifests (requires kubectl configured for your EKS cluster)
# ⚠️ Replace <ECR_REGISTRY> and <ACM_CERT_ARN> in the YAML files first

kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/web-deployment.yaml
kubectl apply -f infra/k8s/mobile-deployment.yaml
kubectl apply -f infra/k8s/web-service.yaml
kubectl apply -f infra/k8s/mobile-service.yaml
kubectl apply -f infra/k8s/ingress.yaml
kubectl apply -f infra/k8s/web-hpa.yaml
kubectl apply -f infra/k8s/mobile-hpa.yaml

# Verify
kubectl get pods -n web && kubectl get pods -n mobile
kubectl get ingress -n web && kubectl get ingress -n mobile
```

### Build and Push Docker Image

```bash
# From monorepo root (not apps/web/)
docker build -f apps/web/Dockerfile -t awaves-web:latest .
docker tag awaves-web:latest <ECR_REGISTRY>/awaves-web:latest
docker push <ECR_REGISTRY>/awaves-web:latest
```
```

---

## Execution Order

```
Step 1   →  next.config.js (standalone + assetPrefix for CloudFront)
Step 2   →  capacitor.config.ts (URL fix → mobile.awaves.app)
Step 3   →  .dockerignore root (build context optimization)
Step 4   →  apps/web/Dockerfile (depends on Step 1 for standalone output)
Step 4.5 →  S3 static asset sync: run `next build` → sync `.next/static/` to S3
               └── Prerequisite: S3 bucket + CloudFront distribution must exist first
Step 5   →  Android init commands (depends on Step 2 for URL)
Step 6   →  infra/k8s/ 8 YAML files (includes NEXT_PUBLIC_CDN_URL in pod env)
Step 7   →  docs update (last — documents final state)
```

---

## Verification Checklist

### After Steps 1–4 (Docker):
```bash
# Check standalone and assetPrefix flags
grep -E "output|assetPrefix" apps/web/next.config.js
# expected:
#   output: 'standalone',
#   assetPrefix: process.env.NEXT_PUBLIC_CDN_URL || '',

# Build Docker image (from repo root) — NEXT_PUBLIC_* must be passed as build args
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_CDN_URL=https://cdn.awaves.app \
  --build-arg NEXT_PUBLIC_API_URL=https://api.awaves.app \
  --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=pk.YOUR_TOKEN_HERE \
  -t awaves-web:test .

# Run locally (no NEXT_PUBLIC_* env needed at runtime — already baked in)
docker run -p 3000:3000 awaves-web:test
curl http://localhost:3000
# expected: HTTP 200
# Check page source — script tags should reference https://cdn.awaves.app/_next/static/...
```

### After Step 5 (Android):
```bash
ls apps/web/android/
# expected: app/  gradle/  gradlew  capacitor.settings.gradle  etc.
```

### After Step 6 (K8s — requires EKS cluster):
```bash
kubectl get pods -n web      # expected: 2/2 Running
kubectl get pods -n mobile   # expected: 1/1 Running
kubectl get ingress -n web   # expected: ADDRESS column shows ALB DNS
kubectl get ingress -n mobile
kubectl get hpa -n web       # expected: min:2, max:10
kubectl get hpa -n mobile    # expected: min:1, max:3
```

### APK end-to-end test:
```bash
cd apps/web
pnpm cap:sync   # sync updated config into Android project
pnpm cap:open   # open in Android Studio
# → Build → Build APK(s) → install on device/emulator
# → WebView should load https://mobile.awaves.app
```

---

## Critical Notes

| Note | Detail |
|------|--------|
| **S3 bucket must exist first** | Create the S3 bucket before Step 4.5. Set public read for `/_next/static/*` or use CloudFront OAC (recommended) |
| **CloudFront distribution** | Must be set up before Step 4.5. Cache behavior: `/_next/static/*` → S3 origin; `/*` → ALB origin |
| **`cdn.awaves.app`** | Replace with your actual CloudFront domain (e.g. `d1234abcd.cloudfront.net` or a CNAME alias) in both `next.config.js` and the K8s deployment YAMLs |
| `NEXT_PUBLIC_*` must be Docker build ARGs | Pass `--build-arg NEXT_PUBLIC_CDN_URL=...`, `--build-arg NEXT_PUBLIC_API_URL=...`, `--build-arg NEXT_PUBLIC_MAPBOX_TOKEN=...` at `docker build` time. K8s env vars for these names have **no effect** on already-baked client bundles. |
| S3 sync must run per deploy | Every time a new image is pushed, `_next/static/` content changes. Sync to S3 **before** rolling out new pods to EKS to avoid 404s on static assets |
| `<ECR_REGISTRY>` placeholder | Must be replaced in deployment YAMLs before `kubectl apply` |
| `<ACM_CERT_ARN>` placeholder | Must be replaced in `ingress.yaml` — wildcard cert `*.awaves.app` covers both subdomains |
| `<YOUR-S3-BUCKET>` placeholder | Must be replaced in Step 4.5 sync commands |
| AWS Load Balancer Controller | Must be pre-installed in EKS cluster for ALB Ingress annotations to work |
| pnpm version in Dockerfile | Dockerfile uses `pnpm@9` — verify with `head -1 pnpm-lock.yaml` if build fails |
| Docker build context | Always run `docker build` from **monorepo root**, not from `apps/web/` |

---

## Agent Sign-off

- **Frontend Dev**: ✅ Steps 1–5, 7 implemented
- **Review**: ✅ 3 issues found and fixed pre-implementation (pnpm version, NEXT_PUBLIC ARGs, cap init skip)
- **QA**: ✅ Android project initialized and synced; `output: 'standalone'` note — local Windows symlink limitation, Docker (Linux) unaffected
- **Docs**: ✅ Task moved to completed/

---

## Testing Guide

### A — Testing the APK (Local / Pre-Deployment)

Use this when EKS is not yet live and you want to verify the APK works against a local dev server.

#### Option 1: Physical Android Device (same WiFi)

**1. Find your machine's local IP:**
```bash
# Windows
ipconfig
# Look for: IPv4 Address → e.g. 192.168.1.42

# Mac/Linux
ifconfig | grep "inet " | grep -v 127
```

**2. Temporarily update `apps/web/capacitor.config.ts`:**
```typescript
server: {
  url: 'http://192.168.1.42:3000',  // your machine's local IP
  cleartext: true,                   // allow HTTP for local dev only
  androidScheme: 'http',
},
```

**3. Start the frontend dev server bound to all interfaces:**
```bash
cd apps/web
pnpm dev --hostname 0.0.0.0 --port 3000
```

**4. Start the backend:**
```bash
cd apps/api
.venv/Scripts/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

**5. Sync and build the APK:**
```bash
cd apps/web
pnpm cap:sync     # syncs capacitor config into android/
pnpm cap:open     # opens Android Studio
```
In Android Studio: **Run ▶** (installs debug APK directly to connected device via USB)

**6. Revert `capacitor.config.ts` to `https://mobile.awaves.app` when done.**

---

#### Option 2: Android Emulator (Android Studio AVD)

Emulators use the special IP `10.0.2.2` to reach the host machine's localhost.

**1. Update `apps/web/capacitor.config.ts`:**
```typescript
server: {
  url: 'http://10.0.2.2:3000',  // emulator → host machine localhost
  cleartext: true,
  androidScheme: 'http',
},
```

**2. Start dev server and backend** (same as Option 1, steps 3–4).

**3. Sync, open Android Studio, start the AVD, then Run ▶.**

> **Tip:** If Mapbox doesn't render, ensure the emulator has GPU acceleration enabled:
> AVD Manager → Edit → Show Advanced Settings → Graphics: Hardware - GLES 2.0

---

#### Option 3: ADB Sideload (debug APK, no Android Studio needed)

Once you have a debug APK built:

```bash
# Build the debug APK in Android Studio first:
# Build → Build Bundle(s) / APK(s) → Build APK(s)
# APK output: apps/web/android/app/build/outputs/apk/debug/app-debug.apk

# Install via ADB (device must have USB debugging enabled)
adb install apps/web/android/app/build/outputs/apk/debug/app-debug.apk

# If multiple devices are connected, specify device:
adb -s <device-serial> install app-debug.apk

# Verify it installed:
adb shell pm list packages | grep awaves
# expected: package:com.awaves.app
```

**Enable USB debugging on the device:**
1. Settings → About phone → tap "Build number" 7 times to unlock Developer Options
2. Settings → Developer Options → USB Debugging: ON
3. Connect via USB → accept the "Allow USB debugging?" prompt on device

---

#### What to Check in the APK

| Check | Expected |
|-------|----------|
| App launches | Splash screen appears (`#094074` blue, 2 sec), then app loads |
| WebView loads | Login page renders correctly — no blank screen or SSL error |
| Login works | Enter credentials, JWT stored, redirected to map |
| Map renders | Mapbox map loads with markers (requires internet) |
| Search results | Results panel slides up from bottom (mobile bottom sheet) |
| Detail panel | Opens as bottom sheet, search results hidden behind it |
| Save spot | Heart icon saves to DynamoDB, appears on Saved page |
| Back button | Navigates WebView history; exits app if no history |
| Status bar | Color matches `#094074` (awaves brand blue) |

---

### B — Testing the EKS Deployment (Production)

Use this after running `kubectl apply -f infra/k8s/` against your EKS cluster.

#### Step 1: Confirm Pods Are Healthy

```bash
# All web pods should show 2/2 Running
kubectl get pods -n web -w

# Mobile pod should show 1/1 Running
kubectl get pods -n mobile -w

# Check logs for startup errors
kubectl logs -n web deployment/react-web --tail=50
kubectl logs -n mobile deployment/react-mobile --tail=50
```

#### Step 2: Confirm ALB Ingress Provisioned

```bash
kubectl get ingress -n web
kubectl get ingress -n mobile
# ADDRESS column should show an ALB DNS name like:
# k8s-awaves-webingress-xxxx.ap-northeast-2.elb.amazonaws.com
```

> The ALB takes ~2–3 minutes to provision after first `kubectl apply`. If ADDRESS is empty, wait and re-run.

#### Step 3: DNS — Point Subdomains to the ALB

In your DNS provider (e.g. Route 53):
```
web.awaves.app    CNAME → <ALB DNS from above>
mobile.awaves.app CNAME → <same ALB DNS>
```

Or using Route 53 Alias records (preferred for ALBs):
```
web.awaves.app    A → Alias → ALB
mobile.awaves.app A → Alias → ALB
```

#### Step 4: Smoke Test Each Endpoint

```bash
# Test web deployment
curl -I https://web.awaves.app
# expected: HTTP/2 200

# Test mobile deployment (what the APK loads)
curl -I https://mobile.awaves.app
# expected: HTTP/2 200

# Both should return the same Next.js HTML
# (same image = same response, different pod pools)
```

#### Step 5: Confirm HPA is Active

```bash
kubectl get hpa -n web
# NAME      REFERENCE           TARGETS   MINPODS   MAXPODS   REPLICAS
# web-hpa   Deployment/react-web   <x>%/70%   2         10        2

kubectl get hpa -n mobile
# NAME         REFERENCE                TARGETS    MINPODS   MAXPODS   REPLICAS
# mobile-hpa   Deployment/react-mobile  <x>%/70%   1         3         1
```

#### Step 6: Test the APK Against Production

1. Update `apps/web/capacitor.config.ts` back to production URL:
   ```typescript
   url: 'https://mobile.awaves.app',
   cleartext: false,
   androidScheme: 'https',
   ```
2. Rebuild the APK:
   ```bash
   cd apps/web
   pnpm cap:sync
   pnpm cap:open
   # Build → Generate Signed Bundle / APK → release
   ```
3. Install on device and verify the WebView loads `https://mobile.awaves.app`

#### Step 7: Simulate Traffic Separation

To confirm the two deployments are truly independent:

```bash
# Scale web deployment manually (HPA must be deleted or suspended first)
kubectl scale deployment react-web -n web --replicas=3

# Roll out a new image to mobile only (web stays on old version)
kubectl set image deployment/react-mobile mobile=<ECR>/awaves-web:v2 -n mobile

# Check rollout status
kubectl rollout status deployment/react-mobile -n mobile

# Roll back if needed
kubectl rollout undo deployment/react-mobile -n mobile
```

---

### C — Troubleshooting Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| APK shows blank white screen | Backend unreachable or wrong URL | Check `capacitor.config.ts` URL; confirm backend is running |
| APK shows "net::ERR_CLEARTEXT_NOT_PERMITTED" | Using HTTP URL on Android 9+ | Set `cleartext: true` in config OR use HTTPS |
| Mapbox map blank in APK | WebGL not available in emulator | Test on real device, or enable GPU in AVD settings |
| APK splash screen flickers | launchShowDuration too short | Increase `launchShowDuration` in capacitor.config.ts |
| `kubectl get ingress` ADDRESS is empty | ALB still provisioning | Wait 2–3 min; check ALB Controller logs: `kubectl logs -n kube-system deployment/aws-load-balancer-controller` |
| Pods stuck in `ImagePullBackOff` | ECR URI wrong or missing pull secret | Verify `<ECR_REGISTRY>` is correct; ensure `ecr-secret` exists in the namespace |
| HPA shows `<unknown>/70%` for CPU | Metrics server not installed | Install: `kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml` |
| `pnpm install --frozen-lockfile` fails in Docker | pnpm version mismatch | Check `head -1 pnpm-lock.yaml` for lockfile version and match pnpm version in Dockerfile |
| Browser shows 404 for `/_next/static/...` | S3 sync not run after build | Run Step 4.5 S3 sync — static files must be in S3 before pods serve traffic |
| CSS/JS loads but from wrong domain | `NEXT_PUBLIC_CDN_URL` not set in pod env | Verify `NEXT_PUBLIC_CDN_URL=https://cdn.awaves.app` is in the deployment YAML env section |
| CloudFront returns stale HTML | HTML is being cached by CloudFront | Ensure default cache behavior (`/*`) has short or no cache TTL — only `/_next/static/*` should be long-cached |
| S3 access denied from CloudFront | Bucket policy missing OAC | Add an Origin Access Control policy to the S3 bucket granting CloudFront read access |
