---
title: "Dimensionality Reduction: PCA, t-SNE, UMAP, and When to Use Each"
depth: technical
pillar: foundations
topic: ai-foundations
tags: [ai-foundations, dimensionality-reduction, pca, tsne, umap, visualization]
author: bee
date: "2026-03-22"
readTime: 11
description: "A practical guide to dimensionality reduction techniques — PCA, t-SNE, and UMAP — covering how they work, when to use each, and common pitfalls that mislead practitioners."
related: [ai-foundations-embeddings-explained, ai-foundations-data-preprocessing-pipeline, ai-foundations-loss-landscape-visualization]
---

# Dimensionality Reduction: PCA, t-SNE, UMAP, and When to Use Each

High-dimensional data is everywhere in AI. Word embeddings have 768+ dimensions. Image features span thousands. Genomic data can have millions. Humans can visualize three dimensions, maybe four with color. Dimensionality reduction bridges this gap.

But it's not just about visualization. Reducing dimensions can improve model performance (by removing noise), speed up computation, and reveal structure that's invisible in the original space.

The catch: every dimensionality reduction technique makes trade-offs. Understanding those trade-offs is the difference between insight and misleading pretty pictures.

## The Curse of Dimensionality

Before diving into techniques, understand *why* high dimensions are problematic.

In high-dimensional spaces, intuitions break down:

- **Distances converge.** As dimensions increase, the ratio of the nearest to farthest neighbor approaches 1. Everything is roughly equally far from everything else.
- **Volume concentrates on the surface.** In a 100-dimensional unit sphere, virtually all the volume is in a thin shell near the surface.
- **Data becomes sparse.** To maintain the same density as 10 points in 1D, you need 10^100 points in 100D.

These aren't abstract concerns. They directly impact k-nearest-neighbor algorithms, clustering, and density estimation.

## PCA: Principal Component Analysis

PCA is the workhorse of dimensionality reduction. It finds the directions of maximum variance in your data and projects onto them.

### How It Works

1. Center the data (subtract the mean)
2. Compute the covariance matrix
3. Find eigenvalues and eigenvectors of the covariance matrix
4. Sort eigenvectors by eigenvalue (largest = most variance)
5. Project data onto the top-k eigenvectors

```python
from sklearn.decomposition import PCA

pca = PCA(n_components=2)
X_reduced = pca.fit_transform(X)

# How much variance is explained?
print(pca.explained_variance_ratio_)
# e.g., [0.72, 0.15] → first two components explain 87%
```

### Strengths

- **Linear and deterministic** — same input always gives same output
- **Fast** — O(min(n²p, np²)) where n=samples, p=features
- **Interpretable** — each component is a linear combination of original features
- **Preserves global structure** — maximizes variance, which often preserves distances
- **Explained variance** — tells you exactly how much information each component captures

### Weaknesses

- **Only captures linear relationships** — misses curves, manifolds, nonlinear structure
- **Sensitive to scale** — always standardize features first
- **Assumes variance = importance** — not always true (noise can have high variance)

### When to Use PCA

- **Preprocessing** before modeling (reduce noise, speed up training)
- **Quick exploration** of high-dimensional data
- **When you need reproducibility** — no random initialization
- **When global structure matters** more than local neighborhoods
- **Feature compression** where interpretability matters

### Variants Worth Knowing

- **Kernel PCA:** Applies the kernel trick for nonlinear dimensionality reduction. Choose RBF, polynomial, or custom kernels.
- **Incremental PCA:** Processes data in mini-batches for large datasets that don't fit in memory.
- **Sparse PCA:** Produces components with few non-zero coefficients for interpretability.

## t-SNE: t-Distributed Stochastic Neighbor Embedding

t-SNE is designed specifically for visualization. It preserves local structure — nearby points in high dimensions stay nearby in low dimensions.

### How It Works

1. Compute pairwise similarities in high-dimensional space (using Gaussian kernels)
2. Define pairwise similarities in low-dimensional space (using t-distributions)
3. Minimize the KL divergence between these two distributions via gradient descent

The t-distribution in the low-dimensional space has heavier tails than a Gaussian, which helps prevent the "crowding problem" — where points in the center of a cluster get crushed together.

```python
from sklearn.manifold import TSNE

tsne = TSNE(n_components=2, perplexity=30, random_state=42)
X_embedded = tsne.fit_transform(X)
```

### The Perplexity Parameter

Perplexity roughly controls the number of effective neighbors each point considers. It's the most important hyperparameter:

- **Low perplexity (5-10):** Focuses on very local structure. May fragment clusters.
- **Medium perplexity (30-50):** Good default. Balances local and semi-global structure.
- **High perplexity (100+):** More global structure, but can wash out fine detail.

**Critical rule:** Always try multiple perplexity values. A single t-SNE plot can be misleading.

### Common Misinterpretations

t-SNE is one of the most commonly misused tools in data science. Key warnings:

1. **Cluster sizes are meaningless.** t-SNE can expand dense clusters and compress sparse ones. Don't interpret cluster size as density.
2. **Distances between clusters are meaningless.** Two clusters being far apart in t-SNE doesn't mean they're far apart in the original space.
3. **Random seeds matter.** Different initializations can produce qualitatively different plots. Run multiple times.
4. **Don't use t-SNE features for modeling.** The embedding is optimized for visualization, not for preserving properties useful for downstream tasks.
5. **It's non-parametric.** You can't transform new points without rerunning on the full dataset.

### When to Use t-SNE

- **Visualizing clusters** in high-dimensional data
- **Exploring embeddings** (word2vec, BERT features, image features)
- **Quality checking** clusters found by other algorithms
- When you need beautiful, publication-ready scatter plots of high-dimensional data

## UMAP: Uniform Manifold Approximation and Projection

UMAP is the newer alternative to t-SNE. It's faster, preserves more global structure, and can be used for more than just visualization.

### How It Works (Simplified)

UMAP constructs a topological representation of the high-dimensional data using fuzzy simplicial sets (a generalization of graphs), then optimizes a low-dimensional representation to have the most similar topological structure.

In practice:
1. Build a weighted k-nearest-neighbor graph
2. Construct fuzzy simplicial sets from this graph
3. Optimize the low-dimensional layout to minimize cross-entropy between the high-dimensional and low-dimensional fuzzy sets

```python
import umap

reducer = umap.UMAP(n_neighbors=15, min_dist=0.1, n_components=2)
X_embedded = reducer.fit_transform(X)
```

### Key Parameters

- **n_neighbors:** Similar to perplexity. Controls local vs. global structure. Low values (5-15) emphasize local structure; high values (50-200) capture more global patterns.
- **min_dist:** Controls how tightly points cluster. Low values (0.0-0.1) create tight clusters; high values (0.5-1.0) spread points more evenly.
- **metric:** Distance metric in the original space. Euclidean is default, but cosine, Manhattan, and custom metrics are supported.

### UMAP vs. t-SNE

| Aspect | t-SNE | UMAP |
|--------|-------|------|
| Speed | Slow (O(n²) or O(n log n) with BH) | Fast (10-100x faster) |
| Global structure | Poor | Better |
| Scalability | Struggles above 100K points | Handles millions |
| Reproducibility | Variable | More consistent |
| New data points | Must recompute everything | Can transform new points |
| Non-2D embeddings | Theoretically possible, rarely used | Works well in any dimension |
| Downstream use | Visualization only | Can use for clustering, classification |

### When to Use UMAP

- **Large datasets** where t-SNE is too slow
- **When global structure matters** — UMAP preserves it better
- **As a preprocessing step** before clustering (UMAP + HDBSCAN is a powerful combination)
- **When you need to embed new points** without recomputing
- **Non-visualization dimensionality reduction** (reducing to 10-50 dims for downstream models)

## Decision Framework

Here's how to choose:

### Use PCA when:
- You want a quick, interpretable overview
- Preprocessing for another algorithm
- Data relationships are roughly linear
- You need explained variance statistics
- Reproducibility is critical

### Use t-SNE when:
- You're making publication-quality visualizations
- Dataset is small-medium (<50K points)
- You only care about local neighborhood structure
- You want the most visually distinct clusters

### Use UMAP when:
- Dataset is large (50K+ points)
- You want both local and global structure
- You might use the reduced dimensions for downstream tasks
- You need to transform new data points
- Speed matters

### The Practical Sequence

For exploratory analysis, use all three:

1. **PCA first** — quick sanity check, see explained variance, identify outliers
2. **UMAP** — faster, preserves more structure, good for initial cluster exploration
3. **t-SNE** — if you need the most visually crisp cluster separation for a specific subset

## Advanced Techniques

### Parametric UMAP

Train a neural network to learn the UMAP mapping. Benefits: GPU-accelerated, handles new points natively, can be incorporated into end-to-end models.

### Supervised Dimensionality Reduction

Both UMAP and some PCA variants accept label information:

```python
reducer = umap.UMAP(n_components=2)
X_embedded = reducer.fit_transform(X, y=labels)  # semi-supervised
```

This biases the embedding to separate classes, which can dramatically improve visualization and downstream clustering.

### TriMAP and PaCMAP

Newer methods (2020-2023) that explicitly balance local and global structure preservation. Worth trying if UMAP's global structure preservation isn't sufficient for your use case.

## Common Pitfalls

1. **Not standardizing before PCA.** Features on different scales will dominate the first components. Always StandardScaler first.
2. **Over-interpreting t-SNE.** Repeat it: cluster sizes and distances between clusters are meaningless in t-SNE.
3. **Using default parameters.** All three methods benefit from parameter tuning. Defaults are reasonable but rarely optimal.
4. **Forgetting the Johnson-Lindenstrauss lemma.** For distance-preserving reduction, random projections can be surprisingly effective and much faster.
5. **Visualizing without context.** A beautiful 2D plot is useless without coloring by meaningful labels or features.

## Key Takeaways

- **PCA** is fast, linear, interpretable, and preserves global variance
- **t-SNE** creates beautiful visualizations with clear cluster separation but doesn't preserve global structure
- **UMAP** is the modern default — fast, preserves both local and global structure, works beyond visualization
- Always try **multiple parameter settings** and don't over-interpret any single plot
- **PCA + UMAP** is a powerful combination: PCA to 50-100 dims first, then UMAP to 2D
- The best technique depends on your **goal**: exploration, visualization, preprocessing, or downstream modeling
