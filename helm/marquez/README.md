# Marquez Helm Chart

This Helm chart deploys the Marquez web application on Kubernetes with Vault integration for dynamic database credentials.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- HashiCorp Vault installed and configured in the cluster
- PostgreSQL database

## Vault Setup

Before deploying Marquez, ensure Vault is configured properly:

### 1. Enable Kubernetes Auth Method

```bash
vault auth enable kubernetes

vault write auth/kubernetes/config \
    kubernetes_host="https://$KUBERNETES_PORT_443_TCP_ADDR:443" \
    kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
    token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token
```

### 2. Enable Database Secrets Engine

```bash
vault secrets enable database

vault write database/config/marquez-db \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@postgres.default.svc.cluster.local:5432/marquez?sslmode=disable" \
    allowed_roles="marquez-role" \
    username="vault_admin" \
    password="vault_admin_password"
```

### 3. Create Database Role

```bash
vault write database/roles/marquez-role \
    db_name=marquez-db \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"
```

### 4. Create Vault Policy

```bash
vault policy write marquez-db - <<EOF
path "database/creds/marquez-role" {
  capabilities = ["read"]
}
EOF
```

### 5. Create Kubernetes Auth Role

```bash
vault write auth/kubernetes/role/marquez-db \
    bound_service_account_names=marquez-vault \
    bound_service_account_namespaces=default \
    policies=marquez-db \
    ttl=24h
```

## Installation

### Install the chart

```bash
helm install marquez ./helm/marquez
```

### Install with custom values

```bash
helm install marquez ./helm/marquez -f custom-values.yaml
```

## Configuration

The following table lists the configurable parameters of the Marquez chart and their default values.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.repository` | Image repository | `marquezproject/marquez-web` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `image.tag` | Image tag | `latest` |
| `vault.enabled` | Enable Vault integration | `true` |
| `vault.address` | Vault server address | `https://vault.vault.svc.cluster.local:8200` |
| `vault.authPath` | Kubernetes auth path | `auth/kubernetes` |
| `vault.role` | Vault role name | `marquez-db` |
| `vault.secretPath` | Database secret path | `database/creds/marquez-role` |
| `vault.serviceAccount` | ServiceAccount for Vault auth | `marquez-vault` |
| `database.host` | Database host | `postgres.default.svc.cluster.local` |
| `database.port` | Database port | `5432` |
| `database.name` | Database name | `marquez` |
| `api.host` | Marquez API host | `marquez-api.default.svc.cluster.local` |
| `api.port` | Marquez API port | `5000` |
| `service.type` | Kubernetes service type | `ClusterIP` |
| `service.port` | Service port | `3000` |
| `ingress.enabled` | Enable ingress | `false` |
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.limits.memory` | Memory limit | `512Mi` |
| `resources.requests.cpu` | CPU request | `250m` |
| `resources.requests.memory` | Memory request | `256Mi` |

## Usage

After installation, you can access Marquez through:

1. **Port-forward** (for testing):
   ```bash
   kubectl port-forward service/marquez 3000:3000
   ```
   Then visit http://localhost:3000

2. **Ingress** (if enabled):
   Configure ingress in values.yaml and access via the configured hostname

3. **LoadBalancer** (if service type is LoadBalancer):
   ```bash
   kubectl get service marquez
   ```

## Vault Agent Sidecar

The deployment includes Vault agent as a sidecar container that:

1. Authenticates with Vault using Kubernetes auth method
2. Fetches dynamic database credentials from Vault
3. Writes credentials to a shared volume
4. Automatically renews credentials before expiration

The main application container sources these credentials at startup.

## Troubleshooting

### Check Vault Agent Logs

```bash
kubectl logs <pod-name> -c vault-agent
```

### Check Application Logs

```bash
kubectl logs <pod-name> -c marquez
```

### Verify Vault Authentication

```bash
kubectl exec <pod-name> -c vault-agent -- vault auth -method=kubernetes role=marquez-db
```

### Check Database Credentials

```bash
kubectl exec <pod-name> -- cat /vault/secrets/db-creds
```

## Security Considerations

1. Use proper RBAC for ServiceAccounts
2. Enable Pod Security Policies/Pod Security Standards
3. Use network policies to restrict traffic
4. Regularly rotate Vault policies and roles
5. Monitor Vault audit logs
6. Use TLS for all communications

## Upgrading

```bash
helm upgrade marquez ./helm/marquez
```

## Uninstalling

```bash
helm uninstall marquez
```