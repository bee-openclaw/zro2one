---
title: "What Is AI Infrastructure? The Hardware and Software Stack Behind Modern AI"
depth: essential
pillar: foundations
topic: what-is-ai
tags: [what-is-ai, infrastructure, gpu, cloud, hardware, mlops]
author: bee
date: "2026-04-01"
readTime: 9
description: "A clear explanation of what AI infrastructure actually means — the GPUs, cloud platforms, frameworks, and orchestration tools that make training and deploying AI models possible — written for people who want to understand the stack without building it."
related: [what-is-ai-what-is-an-ai-model, ai-foundations-distributed-training-explained, ai-foundations-inference-vs-training]
---

When someone says "AI infrastructure," they mean everything between the algorithm and the user. The neural network architecture is the blueprint. The training data is the raw material. AI infrastructure is the factory: the hardware that runs the computations, the software that manages the process, and the systems that serve predictions to users at scale.

Understanding this stack helps you make better decisions even if you never configure a GPU or deploy a model yourself. It explains why AI costs what it costs, why some things are fast and others are slow, and why the companies that control infrastructure have so much leverage in the AI ecosystem.

## The Hardware Layer

### GPUs: Why AI Runs on Graphics Cards

The graphics processing unit was originally designed to render video game images. It turns out that rendering millions of pixels and training neural networks require the same fundamental operation: massive parallel matrix multiplication. A CPU processes operations mostly one at a time, very fast. A GPU processes thousands of simpler operations simultaneously. Neural network training is almost entirely matrix multiplication, which makes GPUs dramatically faster than CPUs for this task.

**NVIDIA** dominates AI hardware. Their GPUs (the A100, H100, and newer B200 series) are the standard. NVIDIA's advantage is not just the hardware; it is CUDA, their software platform for GPU programming. PyTorch and every major AI framework is built on CUDA. This creates a lock-in effect: even if competing hardware is technically capable, the software ecosystem assumes NVIDIA.

**AMD** offers competitive GPUs (the MI300 series) at lower prices, and the software gap is narrowing through ROCm, their CUDA alternative. For inference workloads (running trained models), AMD GPUs are increasingly viable. For training, NVIDIA remains the default because of deeper software maturity.

**What the numbers mean:** When you see that a model was trained on "2,048 H100 GPUs for 3 months," that represents roughly $30-50 million in compute costs at cloud rates. Each H100 has 80GB of high-bandwidth memory and can perform trillions of operations per second. The scale of modern AI training is genuinely staggering.

### TPUs and Custom Silicon

**Google's TPUs** (Tensor Processing Units) are custom chips designed specifically for neural network operations. They power Google's internal AI (Search, Gmail, Translate) and are available through Google Cloud. TPUs excel at large-scale training and are cost-competitive with NVIDIA GPUs for certain workloads, but they require using JAX or TensorFlow (PyTorch support exists but is less mature).

**AWS Trainium and Inferentia** are Amazon's custom AI chips. Trainium is for training, Inferentia for inference. They offer better price-performance than NVIDIA GPUs for supported model architectures, but the software ecosystem is newer and more limited.

The trend is clear: every major cloud provider is building custom silicon to reduce dependence on NVIDIA and offer competitive pricing. Whether these alternatives achieve critical mass depends on software ecosystem development.

### When to Use What

- **CPU only:** Small models, low-volume inference, development and prototyping. Surprisingly adequate for many production inference workloads with optimized models.
- **Single GPU:** Training small to medium models, fine-tuning large models with parameter-efficient methods (LoRA), moderate-volume inference.
- **Multi-GPU (single machine):** Training medium models, higher-volume inference, faster fine-tuning.
- **GPU clusters:** Training large models (billions of parameters), high-volume production inference.
- **TPUs:** Large-scale training when using JAX/TensorFlow, Google Cloud environment.

### Networking and Storage

Training across multiple GPUs requires fast interconnects. NVIDIA's NVLink connects GPUs within a single machine at 900 GB/s. InfiniBand connects machines in a cluster at 400 Gb/s. These speeds matter because during distributed training, GPUs constantly share intermediate results. Slow networking means GPUs spend time waiting instead of computing.

Storage is the other bottleneck. Training datasets can be terabytes or petabytes. The storage system needs to feed data to GPUs fast enough that they never idle waiting for the next batch. This typically means parallel file systems (like Lustre) or high-performance object storage.

## The Cloud Platform Layer

The major cloud providers all offer AI-specific services:

**AWS** offers SageMaker (managed ML platform), EC2 instances with NVIDIA GPUs, Trainium/Inferentia instances, and Bedrock (managed API access to foundation models). The largest selection of instance types and the deepest ecosystem of supporting services.

**Google Cloud** offers Vertex AI (managed ML platform), TPU access, GPU instances, and tight integration with Google's AI research tools. Best option if you are using JAX or want TPUs.

**Microsoft Azure** offers Azure ML (managed ML platform), GPU instances, and deep integration with OpenAI's models through Azure OpenAI Service. Strong choice for enterprises already in the Microsoft ecosystem.

**Smaller providers** like Lambda Labs, CoreWeave, and Together AI offer GPU access at competitive prices with less overhead. They are increasingly popular for training workloads where you need raw GPU access without managed services.

The cost landscape changes constantly, but as a rough guide: a single H100 GPU costs $2-4 per hour on major clouds. Training a large language model from scratch costs millions. Fine-tuning costs hundreds to thousands. Running inference costs depend entirely on volume, but serving a moderately popular LLM application can easily run $10,000-100,000 per month in compute.

## The Software Stack

### Frameworks

**PyTorch** is the dominant framework for AI research and increasingly for production. It provides the programming model for defining neural networks, computing gradients, and running training loops. Almost all recent AI research uses PyTorch.

**JAX** (Google) is the main alternative. It offers automatic differentiation and compilation to TPUs and GPUs, with a functional programming style. Popular in Google's research labs and for large-scale training on TPUs.

**TensorFlow** was the previous dominant framework but has ceded ground to PyTorch. Still widely used in production deployments, especially in Google's ecosystem.

### Model Serving

Once a model is trained, serving it to users requires different infrastructure than training:

**vLLM** is the most popular open-source framework for serving large language models. It implements PagedAttention and continuous batching, which dramatically improve GPU utilization when serving many concurrent requests.

**TensorRT** (NVIDIA) optimizes trained models for fast inference on NVIDIA GPUs. It can reduce inference latency by 2-5x through graph optimization, precision reduction, and kernel fusion.

**Triton Inference Server** (NVIDIA) handles the serving infrastructure: batching requests, managing model versions, load balancing across GPUs.

**Ollama** and **llama.cpp** enable running LLMs on consumer hardware (laptops, desktops) by using quantization to reduce memory requirements. Not for production serving, but useful for development and personal use.

### Orchestration

Running AI workloads at scale requires orchestration:

**Kubernetes** manages containerized workloads across clusters of machines. Most production AI systems run on Kubernetes with GPU-aware scheduling.

**Ray** (Anyscale) provides distributed computing primitives designed for AI workloads. Ray Train handles distributed training, Ray Serve handles model serving, and Ray Data handles data preprocessing. Popular for its flexibility and Python-native API.

**Slurm** is the traditional job scheduler for HPC clusters. Still widely used in research labs and for large training runs.

## The MLOps Layer

MLOps (Machine Learning Operations) covers the lifecycle management of models:

**Experiment tracking** (Weights & Biases, MLflow): Recording what you tried, what hyperparameters you used, and what results you got. Essential for reproducibility and team collaboration.

**Model registries** (MLflow, cloud-specific registries): Versioning trained models with metadata about training data, performance metrics, and deployment status.

**Data versioning** (DVC, LakeFS): Tracking changes to training data with the same rigor as code changes.

**Monitoring** (Arize, WhyLabs, custom solutions): Tracking model performance in production. Detecting data drift (input distribution changes), model degradation (accuracy drops over time), and operational issues (latency spikes, error rates).

## The Inference Stack vs. The Training Stack

Training and inference have different infrastructure requirements, and this distinction matters:

**Training** is a batch process. You need maximum throughput: process as many training examples per second as possible. You can tolerate higher latency on individual operations because you are processing millions of batches. The bottleneck is usually compute (GPU FLOPS) and communication between GPUs.

**Inference** is a real-time service. You need low latency: each user request should get a response in milliseconds to seconds. The bottleneck is usually memory bandwidth (loading model weights for each request) and batching efficiency (serving many requests on one GPU).

This is why the same model might train on a cluster of H100s but serve on smaller GPUs or even CPUs with a quantized version. Different operational requirements, different hardware choices.

## Why This Matters Even If You Just Use APIs

If you are building AI applications through APIs (OpenAI, Anthropic, Google), you are not managing infrastructure directly. But understanding the stack helps you:

- **Understand pricing:** Token-based pricing reflects the underlying GPU costs of inference. Longer prompts cost more because they require more computation.
- **Understand latency:** Response time depends on model size, server load, and how the provider has optimized their inference stack. Choosing a smaller model is not just cheaper; it is faster.
- **Evaluate build vs. buy:** When API costs get high enough, running your own inference infrastructure becomes economical. Understanding what that entails helps you make that decision.
- **Understand capability trajectories:** Infrastructure improvements (faster chips, better serving software, cheaper cloud compute) directly enable new AI capabilities. The models are not just getting smarter; they are getting cheaper to run.

## On-Premises vs. Cloud

Most organizations use cloud for AI, but on-premises makes sense in specific situations:

**Cloud advantages:** No upfront capital expenditure, scale up and down quickly, access to latest hardware without buying it, managed services reduce operational overhead.

**On-premises advantages:** Lower cost at sustained high utilization (break-even is typically 60-70% utilization), data sovereignty requirements, predictable costs, no dependency on cloud provider pricing changes.

**The practical reality:** Most teams start in the cloud, and most teams stay in the cloud. On-premises AI infrastructure requires specialized expertise to build and maintain, and the pace of hardware improvement means purchased equipment depreciates quickly. The organizations that run on-premises AI at scale (large tech companies, well-funded research labs) have dedicated infrastructure teams.

AI infrastructure is evolving rapidly. Hardware gets faster, software gets more efficient, and the cost of both training and inference continues to drop. Understanding the current stack helps you navigate this landscape, whether you are choosing a cloud provider, evaluating an AI vendor, or just trying to understand why a particular AI capability costs what it costs.