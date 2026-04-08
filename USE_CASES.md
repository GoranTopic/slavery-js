# slavery-js — Caso de uso: pipeline distribuido en Kubernetes

Sistema de procesamiento de reportes donde **slavery-js es el contenedor primario** que orquesta toda la infraestructura. Tú solo levantas ese contenedor — él hace el resto.

---

## La jerarquía

```
[tú]
  └── kubectl apply -f slavery-deployment.yaml
        └── [slavery — primary]
              ├── spawnMaster('reports')  → Deployment k8s
              │     └── spawnProcess('send-email')  → Job k8s (efímero)
              ├── spawnMaster('notify')   → Deployment k8s
              └── spawnMaster('storage')  → Deployment k8s
```

- **primary** — el contenedor de slavery-js. Lo levantas tú una sola vez. Configura y levanta los masters automáticamente al iniciar.
- **master** — contenedor persistente levantado por el primary. Cada master importa slavery-js y procesa trabajo. Cuando necesita ejecutar una tarea puntual, lanza un process.
- **process** — Job efímero de Kubernetes lanzado por un master. Ejecuta una tarea y se auto-elimina.

---

## Paso 1 — El primary (slavery)

Este es el único contenedor que tú despliegas. Al arrancar, configura el cluster en modo `k8s` y levanta los masters automáticamente.

```typescript
// src/primary.ts  ← CMD del contenedor slavery
import Cluster from 'slavery-js/cluster';

const cluster = new Cluster({
  mode: 'k8s',
  node: {
    // config base compartida por todos los nodos
    serviceName: 'reports-app',
    redisUrl:    'redis://redis-master.reports-app:6379',
    namespace:   'reports-app',
    resources: {
      requests: { cpu: '200m', memory: '256Mi' },
      limits:   { cpu: '1',    memory: '512Mi' },
    },
  },
  services: {
    // cada master tiene su propia imagen con su lógica
    reports: { image: 'myorg/reports-master:latest', concurrency: 4 },
    notify:  { image: 'myorg/notify-master:latest',  concurrency: 2 },
    storage: { image: 'myorg/storage-master:latest', concurrency: 2 },
  },
});

// Al iniciar, levanta los masters en Kubernetes — tú no haces nada más
await cluster.spawnMaster('reports');
await cluster.spawnMaster('notify');
await cluster.spawnMaster('storage');

console.log('Primary listo. Masters desplegados en k8s.');

// Opcional: escalar masters según carga
// await cluster.scaleNodes(3, 'reports');

process.on('SIGTERM', async () => {
  await cluster.close(); // elimina los masters antes de morir
  process.exit(0);
});
```

Lo que hace Kubernetes con esto:
- `spawnMaster('reports')` → crea un `Deployment` llamado `slavery-master-reports-...` en el namespace `reports-app`
- Ese Deployment usa la imagen `myorg/reports-master:latest` y se reinicia si falla

---

## Paso 2 — Un master (levantado por el primary)

Cada master importa slavery-js. Procesa trabajo de la cola y cuando necesita una tarea efímera lanza un process.

```typescript
// src/masters/reports.ts  ← imagen myorg/reports-master:latest
import Cluster from 'slavery-js/cluster';
import { DistributedWorker } from 'slavery-js';

// El master también tiene su propio Cluster para spawner processes
const cluster = new Cluster({
  mode: 'k8s',
  node: {
    serviceName: 'reports-app',
    redisUrl:    process.env['REDIS_URL']!,
    namespace:   'reports-app',
  },
  services: {
    // Los processes que este master puede lanzar
    'send-email': { image: 'myorg/send-email-process:latest' },
    'upload-s3':  { image: 'myorg/upload-s3-process:latest' },
  },
});

// Escucha la cola BullMQ y procesa solicitudes
const worker = new DistributedWorker({
  serviceName: 'reports',
  redisUrl:    process.env['REDIS_URL']!,
  concurrency: parseInt(process.env['WORKER_CONCURRENCY'] ?? '4'),
  healthPort:  3001,
  methods: {
    generate: async ({ userId, type, dateRange }, { stash, jobId }) => {
      // 1. Genera el reporte
      const data = await fetchUserData(userId, dateRange);
      const file = await renderReport(type, data);

      // 2. Guarda en stash para que el process pueda leerlo
      await stash.set(`report_${jobId}`, { file, userId });

      // 3. Lanza un process efímero para subir a S3 → Job k8s
      await cluster.spawnProcess('upload-s3', {
        env: { JOB_ID: jobId, USER_ID: userId },
      });

      // 4. Lanza otro process efímero para notificar → Job k8s
      await cluster.spawnProcess('send-email', {
        env: { JOB_ID: jobId, USER_ID: userId },
      });

      return { jobId, status: 'processing' };
    },
  },
});

process.on('SIGTERM', async () => {
  await worker.close();
  await cluster.close();
  process.exit(0);
});
```

---

## Paso 3 — Un process efímero (lanzado por el master)

Cuando el master llama `cluster.spawnProcess('send-email')`, Kubernetes crea un **Job**. Este script corre, hace su trabajo, y el Job se marca `Completed` y se borra solo en 60 segundos.

```typescript
// src/processes/send-email.ts  ← imagen myorg/send-email-process:latest
import { RedisStash } from 'slavery-js';
import { Redis } from 'ioredis';

const redis = new Redis(process.env['REDIS_URL']!);
const stash = new RedisStash(redis, 'reports-app');

// Lee el contexto guardado por el master en el stash
const jobId  = process.env['JOB_ID']!;
const userId = process.env['USER_ID']!;
const data   = await stash.get(`report_${jobId}`) as { file: Buffer; userId: string };

// Hace su tarea y muere
await sendEmail({
  to:      `${userId}@company.com`,
  subject: 'Tu reporte está listo',
  attachment: data.file,
});

console.log(`Email enviado para job ${jobId}`);
redis.disconnect();
process.exit(0); // Job → Completed → k8s lo borra en 60s
```

---

## Paso 4 — Desplegar

Solo despliegas **un** contenedor — el primary. Él hace el resto.

```bash
# Construir todas las imágenes
docker build -f Dockerfile.primary    -t myorg/slavery-primary:latest       .
docker build -f Dockerfile.reports    -t myorg/reports-master:latest        .
docker build -f Dockerfile.notify     -t myorg/notify-master:latest         .
docker build -f Dockerfile.storage    -t myorg/storage-master:latest        .
docker build -f Dockerfile.send-email -t myorg/send-email-process:latest    .
docker build -f Dockerfile.upload-s3  -t myorg/upload-s3-process:latest     .

docker push myorg/slavery-primary:latest
# ... push del resto

# Desplegar solo el primary — él levanta masters automáticamente
kubectl apply -f k8s/slavery-deployment.yaml -n reports-app
```

```yaml
# k8s/slavery-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: slavery-primary
  namespace: reports-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: slavery-primary
  template:
    metadata:
      labels:
        app: slavery-primary
    spec:
      containers:
        - name: primary
          image: myorg/slavery-primary:latest
          env:
            - name: REDIS_URL
              value: redis://redis-master.reports-app:6379
```

O generar los YAMLs de los masters desde código (útil para GitOps):

```typescript
// scripts/generate-manifests.ts
import Cluster from 'slavery-js/cluster';

const cluster = new Cluster({
  mode: 'k8s',
  node: { serviceName: 'reports-app', redisUrl: '...', namespace: 'reports-app' },
  services: {
    reports: { image: 'myorg/reports-master:latest' },
    notify:  { image: 'myorg/notify-master:latest' },
  },
});

// Imprime el YAML — no toca el API server
process.stdout.write(cluster.generateManifest('reports', 'master') + '\n---\n');
process.stdout.write(cluster.generateManifest('notify',  'master') + '\n');
```

```bash
node -r tsx/esm scripts/generate-manifests.ts | kubectl apply -f -
```

---

## Qué crea cada llamada en Kubernetes

| Llamada | K8s resource | Quién la hace | Comportamiento |
|---|---|---|---|
| `spawnMaster('reports')` | `Deployment` | primary (slavery) | Persistente, reinicia si falla |
| `spawnProcess('send-email')` | `Job` | master | Efímero, se borra 60s tras terminar |
| `scaleNodes(5, 'reports')` | patch `Deployment` | primary o master | Escala réplicas en caliente |

---

## Flujo completo de una solicitud

```
Cliente POST /reports
  → primary recibe la solicitud HTTP
  → encola 'generate' en BullMQ (queue: reports--generate)
  → master 'reports' toma el job
      → genera el reporte
      → guarda en RedisStash
      → spawnProcess('upload-s3')  → Job k8s nace
      → spawnProcess('send-email') → Job k8s nace
  → Job upload-s3:  lee stash → sube a S3 → muere → k8s lo borra
  → Job send-email: lee stash → envía email → muere → k8s lo borra
  → primary devuelve { ok: true }
```
