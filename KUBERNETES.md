# slavery-js — Kubernetes Migration Guide

Complete guide to running slavery-js in a distributed, containerised environment with Kubernetes.

---

## Table of contents

1. [Architecture overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Suite 1 — Monolithic tests](#3-suite-1--monolithic-tests)
4. [Suite 2 — Distributed tests](#4-suite-2--distributed-tests)
5. [Suite 3 — Kubernetes manifest validation](#5-suite-3--kubernetes-manifest-validation)
6. [Suite 4 — Deploy to Kubernetes](#6-suite-4--deploy-to-kubernetes)
7. [Run everything at once](#7-run-everything-at-once)
8. [CI/CD (GitHub Actions)](#8-cicd-github-actions)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Architecture overview

```
┌──────────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐
│   API pod            │    │   Redis (BullMQ)     │    │   Worker pods (N)    │
│                      │    │                      │    │                      │
│  DistributedService  │───▶│  Queue per method    │◀───│  DistributedWorker   │
│  GET /health         │    │  RedisStash          │    │  slave methods       │
│  GET /ready          │    │                      │    │  GET /health         │
│  GET /metrics        │    │                      │    │  GET /ready          │
└──────────────────────┘    └─────────────────────┘    └──────────────────────┘
```

| Component | Replaces | Scales |
|---|---|---|
| API pod | `Service` master + `mastercallback` | Stateless, 2+ replicas |
| Worker pods | `Node` + `NodeManager` + `cluster.fork` | HPA / KEDA 1–20 |
| Redis | `RequestQueue` + `Stash` + Socket.IO IPC | Managed service or StatefulSet |

---

## 2. Prerequisites

### Required tools

| Tool | Purpose | Install |
|---|---|---|
| Node.js ≥ 18 | Run tests locally | [nodejs.org](https://nodejs.org) |
| Redis | Distributed tests | `brew install redis` |
| Docker Desktop | Build images + local K8s | [docker.com](https://www.docker.com/products/docker-desktop/) |
| kubectl | K8s CLI | `brew install kubectl` |
| kubeconform | Offline schema validation | `brew install kubeconform` |
| kube-score | Best-practice analysis | `brew install kube-score` |
| ruby | YAML syntax check (built-in on macOS) | pre-installed |

### Enable Kubernetes in Docker Desktop

1. Open Docker Desktop → Settings → Kubernetes
2. Check **Enable Kubernetes**
3. Click **Apply & Restart**
4. Verify: `kubectl cluster-info`

### Install npm dependencies

```bash
npm install
```

---

## 3. Suite 1 — Monolithic tests

Tests the original `Service` + `cluster.fork()` architecture.
**No external dependencies needed.**

```bash
npm test
```

**What it covers:** entry API, error handling (throw/log/ignore/return), concurrency, auto-scaling, stash, peer discovery, remote code execution, inter-service communication.

Expected output:
```
Running: ./test/app/entry.test.ts
✅ ...
Running: ./test/service/service_request.test.ts
✅ ...
```

---

## 4. Suite 2 — Distributed tests

Tests `DistributedService` + `DistributedWorker` + Redis.
**Requires Redis running.**

### Step 1 — Start Redis

```bash
# Terminal 1 (leave it open)
redis-server
```

### Step 2 — Run tests

```bash
# Terminal 2
npm run test:distributed
```

**What each test covers:**

| Test file | What it verifies |
|---|---|
| `stash.test.ts` | get / set / del / keys + 20 concurrent writes without race condition |
| `worker_service.test.ts` | round-trip, 9 parallel jobs < 12s, shared stash, error propagation |
| `timeout.test.ts` | slow job → service rejects before configured timeout |
| `retry.test.ts` | worker fails 2× → BullMQ retries → succeeds on attempt 3 |
| `multi_method.test.ts` | multiple methods route correctly + stash isolated between services |
| `resilience.test.ts` | worker pod restarts → new worker picks up new jobs without loss |

Expected output:
```
[stash.test] ✅ set/get number
[stash.test] ✅ concurrent writes/reads
...
[worker_service.test] ✅ 9 concurrent jobs done in 9.XYs
...
```

---

## 5. Suite 3 — Kubernetes manifest validation

Validates all manifests in `examples/kubernetes/k8s/` without needing a live cluster.
**Requires: kubectl, kubeconform, kube-score, ruby.**

```bash
npm run test:k8s
```

**What each step checks:**

| Step | Tool | Requires |
|---|---|---|
| 1 — YAML syntax | ruby (built-in) | nothing |
| 2 — Schema validation | kubeconform | `brew install kubeconform` |
| 3 — Best practices | kube-score | `brew install kube-score` |
| 4 — Drift detection | kubectl diff | live cluster (optional) |

Expected output:
```
▶ Step 1: YAML syntax (offline — ruby built-in)
  ✅ api-deployment.yaml
  ✅ ...

▶ Step 2: kubeconform schema validation (offline)
  ✅ api-deployment.yaml
  ✅ ...

▶ Step 3: kube-score best-practice analysis
  ✅ no CRITICAL issues

▶ Step 4: kubectl diff against live cluster
  ✅ not yet deployed — run 'kubectl apply -f examples/kubernetes/k8s/'

Results: 27 passed, 0 failed
```

---

## 6. Suite 4 — Deploy to Kubernetes

Deploys the full stack to a local Kubernetes cluster (Docker Desktop, minikube, or kind).

### Step 1 — Build local images

Run from the **project root**:

```bash
docker build -f examples/kubernetes/Dockerfile.api    -t slavery-js/api:local    .
docker build -f examples/kubernetes/Dockerfile.worker -t slavery-js/worker:local .
```

### Step 2 — Deploy

```bash
bash examples/kubernetes/deploy.sh
```

The script deploys in the correct order:
1. Namespace
2. ConfigMap + Secret
3. Redis StatefulSet (waits for ready)
4. NetworkPolicy + PodDisruptionBudgets
5. API Deployment + Service
6. Worker Deployment
7. HPA (or KEDA ScaledObject if installed)

For local clusters (Docker Desktop / minikube / kind), the script automatically patches `imagePullPolicy: Never` so Kubernetes uses the locally built image without needing a registry.

### Step 3 — Verify

```bash
kubectl get pods -n slavery
```

Expected:
```
NAME                              READY   STATUS    RESTARTS   AGE
redis-0                           1/1     Running   0          60s
slavery-api-xxx                   1/1     Running   0          45s
slavery-api-yyy                   1/1     Running   0          45s
slavery-worker-xxx                1/1     Running   0          40s
```

### Step 4 — Health checks

```bash
# Port-forward the API to localhost
kubectl port-forward svc/slavery-api 3000:80 -n slavery

# In another terminal
curl http://localhost:3000/health
curl http://localhost:3000/ready
curl http://localhost:3000/metrics
```

### Step 5 — Smoke test Job

```bash
kubectl apply  -f examples/kubernetes/k8s/smoke-test-job.yaml
kubectl wait   job/slavery-smoke-test --for=condition=complete -n slavery --timeout=60s
kubectl logs   job/slavery-smoke-test -n slavery
kubectl delete job/slavery-smoke-test -n slavery
```

### Teardown

```bash
kubectl delete namespace slavery
```

---

## 7. Run everything at once

```bash
# Terminal 1 — Redis
redis-server

# Terminal 2 — all test suites
npm install
npm test                    # monolithic
npm run test:distributed    # distributed (needs Redis)
npm run test:k8s            # manifest validation
```

---

## 8. CI/CD (GitHub Actions)

The workflow at `.github/workflows/ci.yml` runs automatically on every push and PR:

```
push / PR
  ├── test                  → npm test          (Node 20 + 22)
  ├── test-distributed      → test:distributed  (Node 20 + 22, Redis service)
  ├── test-k8s-manifests    → kubectl dry-run + kubeconform + kube-score
  └── build-lib             → npm run build     (only if all 3 above pass)
        └── docker          → build + push images (only on master)
              └── deploy    → kubectl set image  (requires KUBECONFIG secret + manual approval)
```

### Required GitHub secrets for deploy

| Secret | Value |
|---|---|
| `KUBECONFIG` | base64-encoded kubeconfig file: `base64 -i ~/.kube/config` |

---

## 9. Troubleshooting

### `redis-server: command not found`
```bash
brew install redis
```

### `ModuleNotFoundError: No module named 'yaml'`
The validation script uses ruby, not python. Make sure you are on the latest version of `validate-manifests.sh`.

### `InvalidImageName: YOUR_ORG`
You ran `kubectl apply` directly instead of using the deploy script. Use:
```bash
bash examples/kubernetes/deploy.sh
```

### `ErrImagePull` / `ImagePullBackOff`
The image tag `slavery-js/api:local` is only available locally. Make sure you built the images first:
```bash
docker build -f examples/kubernetes/Dockerfile.api    -t slavery-js/api:local    .
docker build -f examples/kubernetes/Dockerfile.worker -t slavery-js/worker:local .
```

### `Error: Queue name cannot contain ':'`
Upgrade to the latest source — the queue separator was changed from `:` to `--`.

### TypeScript error `Cannot use namespace 'Redis' as a type`
The ioredis import must be named, not default:
```typescript
// correct
import { Redis } from 'ioredis';

// wrong
import Redis from 'ioredis';
```

### Pods stuck in `Pending`
```bash
kubectl describe pod -n slavery <pod-name>
```
Common causes: insufficient CPU/memory in Docker Desktop settings, or `imagePullPolicy: Always` with a local image (use the deploy script which patches this automatically).

### Pod stuck in `CrashLoopBackOff`
```bash
kubectl logs -n slavery <pod-name>
```
Most likely cause: `REDIS_URL` not reachable. Verify Redis is running and the service name matches:
```bash
kubectl get svc -n slavery
kubectl exec -n slavery <pod-name> -- env | grep REDIS
```
