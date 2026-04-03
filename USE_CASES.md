# slavery-js — Casos de uso

Guía práctica de para qué sirve la librería y cómo usarla en proyectos reales.

---

## ¿Para qué sirve?

`slavery-js` es una librería de clustering para Node.js. Permite dividir el trabajo entre **múltiples procesos** que corren en paralelo, ya sea en la misma máquina o en distintas máquinas/contenedores.

El problema que resuelve: Node.js es single-threaded. Una tarea pesada (imagen, video, IA, cálculo) bloquea toda la aplicación. Con `slavery-js` esa tarea se delega a un worker, el proceso principal sigue respondiendo, y múltiples workers la procesan en paralelo.

---

## Dos modos de uso

| Modo | Cuándo usarlo |
|---|---|
| **Monolítico** (`Service` / entry API) | Todo corre en la misma máquina con `cluster.fork()` |
| **Distribuido** (`DistributedService` + `DistributedWorker`) | Workers en contenedores/servidores separados, coordinados por Redis |

---

## Modo monolítico

### Caso 1 — Pipeline de procesamiento de imágenes

Un servidor web recibe imágenes, las pone en cola y workers paralelos las procesan (resize, compresión, marca de agua). El servidor principal nunca se bloquea.

```typescript
import slavery from 'slavery-js';
import sharp from 'sharp';

slavery({ host: 'localhost', port: 3000 })
  .imageProcessor(
    // masterCallback — recibe trabajos del servidor HTTP
    async ({ self, imageProcessor }) => {
      const express = (await import('express')).default;
      const app = express();

      app.post('/upload', async (req, res) => {
        const result = await imageProcessor.resize({
          buffer: req.body,
          width: 800,
        });
        res.json({ url: result.url });
      });

      app.listen(8080);
    },
    // slaveMethods — corren en workers paralelos
    {
      resize: async ({ buffer, width }, { slave }) => {
        const output = await sharp(buffer).resize(width).toBuffer();
        return { url: await uploadToS3(output) };
      },
    },
    // opciones
    { number_of_nodes: 4, auto_scale: true, max_number_of_nodes: 8 }
  );
```

**Beneficio:** Con `auto_scale: true`, si llegan muchas imágenes a la vez el sistema crea más workers automáticamente. Cuando baja la carga los elimina.

---

### Caso 2 — Múltiples servicios que se comunican entre sí

Un sistema de e-commerce con tres servicios independientes que se llaman entre sí: `orders`, `inventory`, `notifications`.

```typescript
import slavery from 'slavery-js';

slavery({ host: 'localhost', port: 3000 })
  // Servicio de inventario
  .inventory(
    () => {}, // sin lógica en el master, solo expone métodos
    {
      checkStock: async ({ productId }) => {
        return await db.query('SELECT stock FROM products WHERE id = ?', [productId]);
      },
      decrementStock: async ({ productId, qty }) => {
        await db.query('UPDATE products SET stock = stock - ? WHERE id = ?', [qty, productId]);
        return true;
      },
    }
  )
  // Servicio de notificaciones
  .notifications(
    () => {},
    {
      sendEmail: async ({ to, subject, body }) => {
        await mailer.send({ to, subject, body });
        return 'sent';
      },
    }
  )
  // Servicio de órdenes — orquesta los otros dos
  .orders(
    async ({ inventory, notifications, self }) => {
      const express = (await import('express')).default;
      const app = express();

      app.post('/order', async (req, res) => {
        const { productId, qty, email } = req.body;

        // Llama al servicio de inventario
        const stock = await inventory.checkStock({ productId });
        if (stock < qty) return res.status(409).json({ error: 'Sin stock' });

        await inventory.decrementStock({ productId, qty });

        // Llama al servicio de notificaciones
        await notifications.sendEmail({
          to: email,
          subject: 'Orden confirmada',
          body: `Tu orden de ${qty} unidades fue procesada.`,
        });

        res.json({ ok: true });
      });

      app.listen(8080);
    }
  );
```

**Beneficio:** Cada servicio corre en su propio proceso. Un error en `notifications` no derriba `orders`. Los servicios se descubren automáticamente con peer discovery.

---

### Caso 3 — Worker pool con estado compartido (Stash)

Un scraper paralelo donde los workers comparten una lista de URLs ya visitadas para no procesarlas dos veces.

```typescript
import { Service } from 'slavery-js';

const scraper = new Service({
  service_name: 'scraper',
  mastercallback: async ({ self, slaves }) => {
    // Inicializa la lista de visitados en el stash compartido
    await self.set('visited', []);

    const urls = await fetchUrlsToScrape();

    // Despacha trabajo a workers en paralelo
    await Promise.all(
      urls.map(async (url) => {
        const worker = await slaves.getIdle();
        return worker.run('scrape', { url });
      })
    );

    const results = await self.get('results');
    await saveResults(results);
    await self.exit();
  },
  slaveMethods: {
    scrape: async ({ url }, { self }) => {
      // Lee el stash compartido entre todos los workers
      const visited = await self.get('visited') as string[];
      if (visited.includes(url)) return null;

      const data = await fetch(url).then(r => r.json());

      // Actualiza el stash — el master lo persiste
      await self.set('visited', [...visited, url]);
      const results = await self.get('results') ?? [];
      await self.set('results', [...results, data]);

      return data;
    },
  },
  options: { number_of_nodes: 6 },
});

scraper.start();
```

---

## Modo distribuido (Kubernetes / microservicios)

Cuando los workers necesitan escalar horizontalmente en contenedores separados. Usa Redis (BullMQ) como cola en lugar de Socket.IO.

### Caso 4 — API + workers en Kubernetes

**API pod** — recibe requests, encola trabajo:

```typescript
// src/distributed/api-server.ts
import { DistributedService } from 'slavery-js/distributed';

const service = new DistributedService({
  serviceName: 'video-processor',
  redisUrl: process.env.REDIS_URL ?? 'redis://redis-service:6379',
  port: 3000,
  timeout: 60_000,
});

// El master-callback puede enganchar cualquier lógica
const app = express();
app.post('/process', async (req, res) => {
  const result = await service.run('transcode', {
    videoUrl: req.body.url,
    format: 'mp4',
  });
  res.json(result);
});
app.listen(3000);
```

**Worker pod** — procesa trabajos de la cola:

```typescript
// src/distributed/worker-process.ts
import { DistributedWorker } from 'slavery-js/distributed';

const worker = new DistributedWorker({
  serviceName: 'video-processor',
  redisUrl: process.env.REDIS_URL ?? 'redis://redis-service:6379',
  concurrency: 2,
  healthPort: 3001,
  methods: {
    transcode: async ({ videoUrl, format }, { stash, jobId }) => {
      const result = await ffmpegTranscode(videoUrl, format);
      await stash.set(`job_${jobId}`, result.path);
      return result;
    },
  },
});
```

**Escalar workers** sin tocar el código:

```bash
kubectl scale deployment video-worker --replicas=10
```

**Beneficio:** La API y los workers son contenedores independientes. Se escalan por separado. Si un worker pod se cae, BullMQ reencola el trabajo automáticamente (ver `retry.test.ts`).

---

### Caso 5 — Múltiples métodos en el mismo worker

Un worker que expone varias operaciones de procesamiento de datos:

```typescript
const worker = new DistributedWorker({
  serviceName: 'data-pipeline',
  redisUrl: REDIS_URL,
  concurrency: 4,
  methods: {
    // Cada método va a su propia cola BullMQ: data-pipeline--parse
    parse: async ({ raw }) => {
      return JSON.parse(raw);
    },

    // data-pipeline--transform
    transform: async ({ record }, { stash }) => {
      const config = await stash.get('transform_config');
      return applyTransform(record, config);
    },

    // data-pipeline--validate
    validate: async ({ record }) => {
      const errors = runValidationRules(record);
      if (errors.length) throw new Error(errors.join(', '));
      return true;
    },
  },
});
```

Desde la API se orquesta el pipeline en secuencia:

```typescript
const raw    = await service.run('parse',     { raw: csvLine });
const record = await service.run('transform', { record: raw });
await          service.run('validate',         { record });
```

---

### Caso 6 — Reintentos automáticos ante fallos transitorios

BullMQ reintenta automáticamente si el worker falla (conexión caída, timeout externo, etc.).

```typescript
const worker = new DistributedWorker({
  serviceName: 'payment-processor',
  redisUrl: REDIS_URL,
  methods: {
    charge: async ({ amount, cardToken }, { jobId }) => {
      // Si Stripe devuelve un error 503, el job se reintenta
      const result = await stripe.charges.create({
        amount,
        source: cardToken,
        currency: 'usd',
      });
      return result.id;
    },
  },
});
```

La cola está configurada con reintentos en `RedisQueue`:

```typescript
// Los jobs fallidos se reintentan hasta 3 veces con backoff exponencial
new Queue(queueName, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});
```

---

## Comparativa rápida: ¿qué modo usar?

| Escenario | Modo recomendado |
|---|---|
| App en un solo servidor, quiero usar todos los cores | Monolítico (`Service` + `cluster.fork`) |
| Múltiples servicios en la misma máquina que se llaman entre sí | Monolítico (entry API con peer discovery) |
| Workers que necesitan escalar en contenedores separados | Distribuido (`DistributedService` + `DistributedWorker`) |
| Cola de trabajos que persiste aunque se caiga el proceso | Distribuido (BullMQ + Redis persiste la cola) |
| Tareas lentas (video, ML, PDF) que no deben bloquear la API | Cualquiera de los dos |
| Múltiples equipos desplegando servicios independientes | Distribuido en Kubernetes |

---

## Patrón de error handling

Ambos modos propagan errores del worker al caller:

```typescript
try {
  const result = await service.run('riskyMethod', { input });
} catch (err) {
  // El error que lanzó el worker llega aquí
  console.error('Worker falló:', err.message);
}
```

En el modo monolítico también se puede configurar `onError`:

```typescript
const service = new Service({
  // ...
  options: {
    onError: 'log',    // 'throw' | 'log' | 'ignore'
  },
});
```
