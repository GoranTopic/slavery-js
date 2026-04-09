# slavery-js — Caso de uso: pipeline distribuido en Kubernetes

Sistema de procesamiento de reportes con jerarquía completa `primary → master → process` corriendo en Kubernetes.

---

## El problema

Una plataforma necesita generar reportes pesados (PDF, Excel, estadísticas) bajo demanda. Los reportes tardan entre 10 y 60 segundos. Si corren en el servidor principal bloquean todo. Se necesita:

- Un **API** que reciba solicitudes sin bloquearse
- Servicios persistentes especializados (**masters**): `reports`, `notify`, `storage`
- Tareas efímeras que procesan un reporte y mueren (**process**)
- Escalado independiente por servicio

---

## Arquitectura

```
[primary]  ← Deployment k8s, siempre vivo, orquesta todo
    │
    ├── spawnMaster('reports')   → Deployment k8s (persistente)
    │       └── spawnProcess()  → Job k8s (efímero, muere al terminar)
    │
    ├── spawnMaster('notify')    → Deployment k8s (persistente)
    │
    └── spawnMaster('storage')   → Deployment k8s (persistente)
```

Cada `master` expone métodos via **BullMQ + Redis**. El `primary` encola trabajo, los masters lo procesan. Los `process` son Jobs de Kubernetes que ejecutan una tarea puntual y se auto-eliminan.

---

## Paso 1 — Instalar y configurar

```bash
npm install slavery-js
```

Prerequisitos en el cluster:
```bash
# Namespace
kubectl create namespace reports-app

# Redis (el bus de colas)
helm install redis bitnami/redis -n reports-app --set auth.enabled=false
```

---

## Paso 2 — El primary (entry point del sistema)

El `primary` es el contenedor raíz. Levanta los masters y expone el API HTTP.

```typescript
// src/primary.ts
import Cluster from 'slavery-js/cluster';
import { DistributedService } from 'slavery-js';
import express from 'express';

// ── 1. Cluster en modo k8s ────────────────────────────────────────────────────
const cluster = new Cluster({
  mode: 'k8s',
  node: {
    // config base compartida
    serviceName: 'reports-app',
    redisUrl:    'redis://redis-master.reports-app:6379',
    namespace:   'reports-app',
    resources: {
      requests: { cpu: '200m', memory: '256Mi' },
      limits:   { cpu: '1',    memory: '512Mi' },
    },
  },
  services: {
    // cada master tiene su propia imagen
    reports: { image: 'myorg/reports-master:latest', concurrency: 4 },
    notify:  { image: 'myorg/notify-master:latest',  concurrency: 2 },
    storage: { image: 'myorg/storage-master:latest', concurrency: 2 },
  },
});

// ── 2. Levanta los masters persistentes ───────────────────────────────────────
await cluster.spawnMaster('reports');   // → Deployment en k8s
await cluster.spawnMaster('notify');    // → Deployment en k8s
await cluster.spawnMaster('storage');   // → Deployment en k8s

// ── 3. DistributedService para encolar trabajo ────────────────────────────────
const reportsService = new DistributedService({
  serviceName: 'reports',
  redisUrl:    'redis://redis-master.reports-app:6379',
  port:        3000,
});

// ── 4. API HTTP ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.post('/reports', async (req, res) => {
  const { userId, type, dateRange } = req.body;

  // Encola el trabajo — el master 'reports' lo procesa
  const result = await reportsService.run<{ url: string }>('generate', {
    userId, type, dateRange,
  });

  // Una vez generado el reporte, lanza un process efímero para notificar
  await cluster.spawnProcess('notify', {
    env: { REPORT_URL: result.url, USER_ID: userId },
  });

  res.json({ ok: true, url: result.url });
});

app.listen(3000);

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  await reportsService.close();
  await cluster.close();
  process.exit(0);
});
```

---

## Paso 3 — El master `reports` (Deployment persistente)

Escucha la cola y procesa solicitudes de generación de reportes.

```typescript
// src/masters/reports.ts
import { DistributedWorker } from 'slavery-js';

const worker = new DistributedWorker({
  serviceName: 'reports',
  redisUrl:    process.env['REDIS_URL'] ?? 'redis://redis-master.reports-app:6379',
  concurrency: 4,
  healthPort:  3001,
  methods: {
    generate: async ({ userId, type, dateRange }, { stash, jobId }) => {
      // Genera el reporte (PDF, Excel, etc.)
      const data = await fetchUserData(userId, dateRange);
      const file = await renderReport(type, data);
      const url  = await uploadToS3(file);

      // Guarda en stash compartido para que otros masters puedan leerlo
      await stash.set(`report_${jobId}`, { url, userId, generatedAt: Date.now() });

      return { url };
    },
  },
});

process.on('SIGTERM', async () => { await worker.close(); process.exit(0); });
```

---

## Paso 4 — El master `notify` (Deployment persistente)

Escucha la cola y envía notificaciones. También puede recibir Jobs efímeros del primary.

```typescript
// src/masters/notify.ts
import { DistributedWorker } from 'slavery-js';

const worker = new DistributedWorker({
  serviceName: 'notify',
  redisUrl:    process.env['REDIS_URL'] ?? 'redis://redis-master.reports-app:6379',
  concurrency: 2,
  healthPort:  3001,
  methods: {
    email: async ({ to, subject, body }) => {
      await sendEmail({ to, subject, body });
      return { sent: true };
    },
    slack: async ({ channel, message }) => {
      await postToSlack(channel, message);
      return { sent: true };
    },
  },
});

process.on('SIGTERM', async () => { await worker.close(); process.exit(0); });
```

---

## Paso 5 — El process efímero de notificación (Job k8s)

Cuando el primary llama `cluster.spawnProcess('notify', { env: { REPORT_URL, USER_ID } })`, Kubernetes crea un **Job** que ejecuta este script y se borra solo al terminar (`ttlSecondsAfterFinished: 60`).

```typescript
// src/processes/send-notification.ts
import { DistributedService } from 'slavery-js';

const service = new DistributedService({
  serviceName: 'notify',
  redisUrl:    process.env['REDIS_URL'] ?? 'redis://redis-master.reports-app:6379',
  port:        3001,
});

// Encola el trabajo en el master 'notify' y espera resultado
const result = await service.run('email', {
  to:      `user-${process.env['USER_ID']}@company.com`,
  subject: 'Tu reporte está listo',
  body:    `Descárgalo aquí: ${process.env['REPORT_URL']}`,
});

console.log('Notificación enviada:', result);
await service.close();
process.exit(0); // El Job de k8s queda en estado Completed y se borra solo
```

---

## Paso 6 — Desplegar en Kubernetes

```bash
# Construir imágenes
docker build -f Dockerfile.primary -t myorg/reports-primary:latest .
docker build -f Dockerfile.reports  -t myorg/reports-master:latest  .
docker build -f Dockerfile.notify   -t myorg/notify-master:latest   .
docker build -f Dockerfile.storage  -t myorg/storage-master:latest  .

docker push myorg/reports-primary:latest
docker push myorg/reports-master:latest
docker push myorg/notify-master:latest
docker push myorg/storage-master:latest

# Desplegar el primary — él levanta el resto
kubectl apply -f k8s/primary-deployment.yaml -n reports-app
```

O generar los YAMLs directamente desde el código:

```typescript
// scripts/generate-manifests.ts
import Cluster from 'slavery-js/cluster';

const cluster = new Cluster({
  mode: 'k8s',
  node: { serviceName: 'reports-app', redisUrl: 'redis://redis-master.reports-app:6379', namespace: 'reports-app' },
  services: {
    reports: { image: 'myorg/reports-master:latest' },
    notify:  { image: 'myorg/notify-master:latest' },
    storage: { image: 'myorg/storage-master:latest' },
  },
});

// Genera YAML de Deployment para cada master
console.log(cluster.generateManifest('reports', 'master'));
console.log('---');
console.log(cluster.generateManifest('notify',  'master'));
console.log('---');
console.log(cluster.generateManifest('storage', 'master'));
```

```bash
# Aplica los manifiestos generados directamente
node -r tsx/esm scripts/generate-manifests.ts | kubectl apply -f - -n reports-app
```

---

## Qué hace Kubernetes con cada tipo

| Tipo | K8s resource | Comportamiento |
|---|---|---|
| `primary` | `Deployment` (manual) | Siempre vivo, reinicia si falla |
| `master` via `spawnMaster()` | `Deployment` | Persistente, reinicia si falla |
| `process` via `spawnProcess()` | `Job` | Efímero — muere al terminar, se borra 60s después |

---

## Escalar un master en caliente

```typescript
// Escalar el master 'reports' a 5 réplicas sin tocar YAML
await cluster.scaleNodes(5, 'reports');

// Ver qué está corriendo
const masters  = await cluster.listNodes('master');
const jobs     = await cluster.listNodes('process');
console.log({ masters: masters.length, jobs: jobs.length });
```

---

## Flujo completo de una solicitud

```
POST /reports
  → primary encola 'generate' en BullMQ (queue: reports--generate)
  → master 'reports' toma el job, genera el PDF, sube a S3
  → primary recibe el resultado { url }
  → primary llama spawnProcess('notify') → k8s crea un Job
  → Job encola 'email' en BullMQ (queue: notify--email)
  → master 'notify' envía el email
  → Job termina → k8s lo marca Completed → se borra en 60s
  → cliente recibe { ok: true, url }
```
