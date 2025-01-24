---
title: "[STUB] Deploying a single node Kubernetes cluster with k3s"
date: 2025-01-01
description: "Using ArgoCD, built-in Træfik, Cert-Manager and deploting a website"
tags: ["k3s", "argocd", "traefik", "kubernetes"]
categories: ["tutorials", "stub"]
series:
  - "Tutorials"
---

{{< alert >}}
**Warning!** Still a stub!
{{< /alert >}}

In this tutorial we're going to deploy some single-node Kubernetes clusters for testing purposes with K3s, which is by far the easiest method.

# Install k3s in your server

We're assuming you're currently using some kind of server, like a VPS or a spare bare machine. Connect to it then run:

```bash
curl -sfL https://get.k3s.io | sh -
```

That's easy, then copy the resultant `kubeconfig` stored in `/etc/rancher/k3s/k3s.yaml` into your machine. You might edit the `.clusters[0].cluster.server` according to your configuration or your server address.

# ArgoCD installation

Refer to ArgoCD documentation. But, if TL;DR:

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Get the password:
```bash
argocd admin initial-password -n argocd
```
And get into the UI:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Please change the password.

# Installing Cert-Manager

In Argo UI, create the app with the Helm Chart. Or just use the CLI.

```bash

