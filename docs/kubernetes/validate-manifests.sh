#!/usr/bin/env bash
# ── Kubernetes manifest validation ────────────────────────────────────────────
# Validates all manifests without touching a real cluster.
#
# Requirements (already installed):
#   python3     — pre-installed on macOS
#   kubeconform — brew install kubeconform
#   kube-score  — brew install kube-score
set -euo pipefail

K8S_DIR="$(cd "$(dirname "$0")/k8s" && pwd)"
PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  slavery-js — Kubernetes manifest validation"
echo "  Directory: $K8S_DIR"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── 1. YAML syntax — pure offline ────────────────────────────────────────────
# kubectl apply --dry-run=client always contacts the API server to resolve
# resource types, even with --validate=false. Use Python's YAML parser instead.
echo "▶ Step 1: YAML syntax (offline — ruby built-in)"
# Ruby is pre-installed on macOS and includes the 'yaml' stdlib — no pip/gems needed.
for f in "$K8S_DIR"/*.yaml; do
    name=$(basename "$f")
    if ruby -e "require 'yaml'; YAML.load_stream(File.read(ARGV[0]))" -- "$f" 2>/tmp/yaml_err; then
        ok "$name"
    else
        fail "$name — $(cat /tmp/yaml_err)"
    fi
done

# ── 2. kubectl dry-run (server-side) — validates against live cluster ─────────
echo ""
echo "▶ Step 2: kubectl dry-run=server (live cluster validation)"
if ! kubectl cluster-info > /dev/null 2>&1; then
    echo "  ⚠️  No cluster reachable — skipping (set KUBECONFIG to enable)"
else
    for f in "$K8S_DIR"/*.yaml; do
        name=$(basename "$f")
        # Skip KEDA ScaledObject — requires KEDA CRDs to be installed
        [[ "$name" == *keda* ]] && { echo "  ⏭  $name (skipped — KEDA CRD not installed)"; continue; }
        if kubectl apply --dry-run=server -f "$f" > /dev/null 2>&1; then
            ok "$name"
        else
            fail "$name — $(kubectl apply --dry-run=server -f "$f" 2>&1 | tail -1)"
        fi
    done
fi

# ── 3. kube-score — best-practice analysis ────────────────────────────────────
echo ""
echo "▶ Step 3: kube-score best-practice analysis"
# Pass all manifests together so PDB/NetworkPolicy are correlated with Deployments.
# Exclude KEDA (CRD unknown to kube-score) and smoke-test Job (ephemeral).
# Use xargs to expand the file list safely.
SCORE_OUT=$(ls "$K8S_DIR"/*.yaml \
    | grep -v keda \
    | grep -v smoke-test \
    | xargs kube-score score \
        --ignore-test=container-image-tag \
        --ignore-test=deployment-has-host-podantiaffinity \
    2>&1 || true)

# kube-score indents [CRITICAL]/[WARNING] with spaces — do NOT use ^ anchor
CRITICALS=$(echo "$SCORE_OUT" | grep -c "\[CRITICAL\]" || true)
WARNINGS=$(echo  "$SCORE_OUT" | grep -c "\[WARNING\]"  || true)

if [ "$CRITICALS" -eq 0 ]; then
    ok "no CRITICAL issues ($WARNINGS warnings)"
else
    fail "$CRITICALS CRITICAL issues — run 'kube-score score $K8S_DIR/*.yaml' for details"
    echo "$SCORE_OUT" | grep -B1 "\[CRITICAL\]" | head -50
fi

# ── 4. kubectl diff against live cluster (optional — skipped if no cluster) ──
echo ""
echo "▶ Step 4: kubectl diff against live cluster"
if kubectl cluster-info > /dev/null 2>&1; then
    echo "  Connected to: $(kubectl config current-context)"
    DIFF_OUT=$(kubectl diff -f "$K8S_DIR"/ 2>&1) && DIFF_EXIT=0 || DIFF_EXIT=$?

    if echo "$DIFF_OUT" | grep -q "not found"; then
        # Namespace or resources don't exist yet — this is a first deploy, not an error.
        ok "not yet deployed — run 'kubectl apply -f examples/kubernetes/k8s/' to deploy"
    elif [ "$DIFF_EXIT" -eq 0 ]; then
        ok "cluster is in sync with manifests"
    else
        echo "  ℹ️  Changes that would be applied:"
        echo "$DIFF_OUT" | head -40
    fi
else
    echo "  ⚠️  No cluster reachable — skipping (set KUBECONFIG to enable)"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
