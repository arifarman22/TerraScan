# Kubernetes manifests

This directory holds the production Kubernetes deployment for the platform.

## Current contents

| File | Purpose |
|---|---|
| `namespace.yaml` | `drone-sat-platform` namespace + resource quota |

## Apply

```bash
kubectl apply -f namespace.yaml
```

## Planned (deployment phase)

Per-service `Deployment`, `Service`, `HorizontalPodAutoscaler`, `Ingress`
(TLS termination at the gateway), `NetworkPolicy` (zone isolation —
SRS NFR-SEC-013), `ConfigMap`, and `ExternalSecret` resources backed by a
managed secrets store (SRS NFR-SEC-006). StatefulSets for PostgreSQL,
Redis, RabbitMQ, and MinIO are expected to be replaced by managed cloud
services in production.


