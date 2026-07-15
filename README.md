Microservices with Kubernetes and Self-Hosted CI/CD

Two independently deployable microservices (Python/Flask and Node/Express), containerized, orchestrated with Kubernetes (k3s), and automatically built and deployed via a self-hosted GitHub Actions pipeline on every push.

Why this project

Demonstrates the full path from code to running service: two services in different languages (a realistic constraint most single-stack demo projects skip), container orchestration with automatic pod recovery, and a genuinely automated delivery pipeline — not a manually-triggered script.

Architecture

git push → GitHub → self-hosted runner (this machine)
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
        docker build              docker build
       users-service             orders-service
              │                       │
              └───────────┬───────────┘
                           ▼
                  import into k3s
                           ▼
                    kubectl apply
                           ▼
              ┌───────────┴───────────┐
              ▼                       ▼
      users-service Deployment  orders-service Deployment
      (2 replicas)               (2 replicas)
              │                       │
              ▼                       ▼
      users-service (NodePort)  orders-service (NodePort)
      reachable on :30604        reachable on :32059

Stack


users-service — Python / Flask
orders-service — Node.js / Express
Docker — containerization for both services
k3s — lightweight, production-grade Kubernetes distribution
GitHub Actions + self-hosted runner — CI/CD, executing on this machine so it can reach the local cluster


Repository structure

users-service/
├── app.py
├── requirements.txt
└── Dockerfile
orders-service/
├── app.js
├── package.json
└── Dockerfile
k8s/
├── users-deployment.yaml   # Deployment + NodePort Service
└── orders-deployment.yaml  # Deployment + NodePort Service
.github/workflows/
└── deploy.yml              # Build → import → deploy → verify rollout

How the pipeline works

On every push to main:


Checkout code
Build both Docker images
Import them into k3s's container runtime (containerd) — necessary because k3s doesn't share image storage with the regular Docker daemon
kubectl apply the Kubernetes manifests
Force a rollout restart so pods pick up the freshly-built image
Wait for the rollout to report healthy before finishing


Running it

bash# Deploy manually
kubectl apply -f k8s/users-deployment.yaml
kubectl apply -f k8s/orders-deployment.yaml

# Get current NodePort numbers
kubectl get services

# Test
curl http://<host-ip>:<users-nodeport>/users
curl http://<host-ip>:<orders-nodeport>/orders

Or just git push to main with the self-hosted runner (./run.sh in actions-runner/) active — it deploys automatically.

Real problems hit and fixed while building this


Ingress (Traefik) returned persistent 502 errors despite correct Service endpoints, correct pod health, and correct Ingress routing rules — confirmed via direct pod-to-pod tests from inside the cluster, which worked fine. The failure was isolated specifically to Traefik's pod being unable to route to backend pod IPs, even after restarting both the pod and the whole k3s service. Rather than continuing to debug an increasingly deep Kubernetes networking internals question, made the engineering call to switch both services to NodePort, which is a legitimate, commonly-used Service type — Ingress is one valid pattern for external access, not the only one.
GitOps drift: a live kubectl patch changing ClusterIP to NodePort was overwritten by the next kubectl apply, because the YAML files still said ClusterIP. This is the core GitOps lesson: the manifest file is the source of truth, not whatever's currently running in the cluster — any change must be made in the file itself or it will silently revert on the next deploy.
Self-hosted runner as a systemd service failed with 203/EXEC, traced to SELinux (user_home_t context on a script systemd tried to execute, blocked under Enforcing mode). Rather than fight SELinux relabeling for a demo environment, the runner is currently run via a persistent terminal/tmux session — a known, documented limitation rather than a silent gap.
k3s uses containerd, not the Docker daemon — locally-built Docker images aren't automatically visible to k3s. Images must be explicitly exported and imported (docker save | k3s ctr images import -) before a Deployment referencing them will succeed.


Known limitations / honest gaps


Images are tagged :latest rather than a unique identifier (e.g., git commit SHA) — production systems avoid this specifically so exact deployed code is always traceable and rollback-able
No automated tests run before build/deploy
Self-hosted runner requires a manually-started persistent session rather than running as a proper background service (SELinux blocker, noted above)


Possible extensions


Tag images with git commit SHA instead of :latest
Add a basic test step per service before the build step
Resolve the Traefik/Ingress routing issue properly and switch back from NodePort
Fix the self-hosted runner's SELinux context so it can run as a real systemd service
Add ArgoCD for GitOps-style continuous deployment instead of direct kubectl apply from the pipeline
