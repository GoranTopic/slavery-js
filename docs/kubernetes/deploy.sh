#!/usr/bin/env bash
# ── Deploy slavery-js to Kubernetes ──────────────────────────────────────────
# Usage:
#   ./examples/kubernetes/deploy.sh           # deploy / update
#   ./examples/kubernetes/deploy.sh --dry-run # preview changes
set -euo pipefail

K8S_DIR="$(cd "$(dirname "$0")/k8s" && pwd)"
DRY_RUN=""
[ "${1:-}" = "--dry-run" ] && DRY_RUN="--dry-run=client"

APPLY="kubectl apply $DRY_RUN"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  slavery-js deploy  •  context: $(kubectl config current-context)"
[ -n "$DRY_RUN" ] && echo "  MODE: dry-run (no changes will be applied)"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── 1. Namespace first (everything else depends on it) ────────────────────────
echo "▶ Namespace"
$APPLY -f "$K8S_DIR/00-namespace.yaml"

# ── 2. Config before workloads ────────────────────────────────────────────────
echo "▶ ConfigMap + Secret"
$APPLY -f "$K8S_DIR/configmap.yaml"
$APPLY -f "$K8S_DIR/secret.yaml"

# ── 3. Redis ──────────────────────────────────────────────────────────────────
echo "▶ Redis"
$APPLY -f "$K8S_DIR/redis-service.yaml"
$APPLY -f "$K8S_DIR/redis-statefulset.yaml"

if [ -z "$DRY_RUN" ]; then
    echo "  Waiting for Redis to be ready..."
    kubectl rollout status statefulset/redis -n slavery --timeout=120s
fi

# ── 4. Network policies + PDBs ────────────────────────────────────────────────
echo "▶ NetworkPolicy + PodDisruptionBudget"
$APPLY -f "$K8S_DIR/network-policy.yaml"
$APPLY -f "$K8S_DIR/pdb.yaml"

# ── 5. API ────────────────────────────────────────────────────────────────────
echo "▶ API"
$APPLY -f "$K8S_DIR/api-deployment.yaml"
$APPLY -f "$K8S_DIR/api-service.yaml"

# ── 6. Workers ────────────────────────────────────────────────────────────────
echo "▶ Workers"
$APPLY -f "$K8S_DIR/worker-deployment.yaml"

# ── Local cluster: use Never so Kubernetes uses the locally built image ───────
# In production (real registry + immutable digest) Always is correct.
if [ -z "$DRY_RUN" ] && kubectl config current-context 2>/dev/null | grep -qE "docker-desktop|minikube|kind"; then
    echo "  Local cluster detected — setting imagePullPolicy: Never"
    kubectl patch deployment slavery-api -n slavery \
        -p '{"spec":{"template":{"spec":{"containers":[{"name":"api","imagePullPolicy":"Never"}]}}}}'
    kubectl patch deployment slavery-worker -n slavery \
        -p '{"spec":{"template":{"spec":{"containers":[{"name":"worker","imagePullPolicy":"Never"}]}}}}'
fi

# ── 7. Autoscaler — KEDA if installed, HPA otherwise ─────────────────────────
echo "▶ Autoscaler"
if kubectl api-resources 2>/dev/null | grep -q "ScaledObject"; then
    echo "  KEDA detected — applying ScaledObject"
    $APPLY -f "$K8S_DIR/keda-scaledobject.yaml"
else
    echo "  KEDA not installed — applying standard HPA"
    echo "  (Install KEDA: helm install keda kedacore/keda -n keda --create-namespace)"
    $APPLY -f "$K8S_DIR/worker-hpa.yaml"
fi

# ── 8. Wait for rollout ───────────────────────────────────────────────────────
if [ -z "$DRY_RUN" ]; then
    echo ""
    echo "▶ Waiting for rollouts..."
    kubectl rollout status deployment/slavery-api    -n slavery --timeout=120s
    kubectl rollout status deployment/slavery-worker -n slavery --timeout=120s
    echo ""
    echo "  ✅ Deploy complete"
    echo ""
    kubectl get pods -n slavery
fi
