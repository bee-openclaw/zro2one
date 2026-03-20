---
title: "Graph Neural Networks: Deep Learning on Non-Euclidean Data"
depth: technical
pillar: foundations
topic: deep-learning
tags: [deep-learning, graph-neural-networks, gnn, graph-learning, architecture]
author: bee
date: "2026-03-20"
readTime: 11
description: "Not all data fits in a grid. Social networks, molecules, knowledge graphs, and road networks are naturally graphs. Graph neural networks learn representations that respect this structure."
related: [deep-learning-cnns-explained, ai-foundations-transformers, deep-learning-attention-mechanisms]
---

CNNs process grids (images). RNNs and Transformers process sequences (text). But many real-world datasets are neither — they're graphs. Social networks, molecular structures, road networks, recommendation systems, knowledge graphs, and citation networks are all naturally represented as nodes connected by edges.

Graph Neural Networks (GNNs) extend deep learning to graph-structured data. They've become essential for drug discovery, fraud detection, recommendation systems, and any domain where relationships between entities matter as much as the entities themselves.

## The Intuition

A GNN learns a representation for each node by aggregating information from its neighbors. After multiple layers, each node's representation captures information from increasingly distant parts of the graph.

Think of it like gossip spreading through a social network:
- **Layer 1:** Each person learns about their direct friends
- **Layer 2:** Each person knows about friends-of-friends
- **Layer 3:** Each person has information about a wider neighborhood

After enough layers, each node's representation encodes the structure of its local graph neighborhood.

## Message Passing

The core mechanism is **message passing**: nodes send messages to their neighbors, aggregate incoming messages, and update their representations.

```python
import torch
import torch.nn as nn

class SimpleGNNLayer(nn.Module):
    def __init__(self, in_features, out_features):
        super().__init__()
        self.linear = nn.Linear(in_features, out_features)
    
    def forward(self, x, edge_index):
        """
        x: Node features [num_nodes, in_features]
        edge_index: Edge list [2, num_edges]
        """
        # Message: transform neighbor features
        messages = self.linear(x)
        
        # Aggregate: sum messages from neighbors
        row, col = edge_index
        out = torch.zeros_like(messages)
        out.scatter_add_(0, row.unsqueeze(1).expand_as(messages), messages[col])
        
        # Update: apply activation
        return torch.relu(out)
```

This is the foundation. Every GNN variant modifies how messages are created, aggregated, or used for updates.

## Key Architectures

### GCN (Graph Convolutional Network)

Kipf & Welling (2017). The foundational GNN architecture. Each layer performs a normalized sum of neighbor features followed by a linear transformation.

```python
# GCN layer: H' = σ(D̃^(-1/2) Ã D̃^(-1/2) H W)
# Where Ã = A + I (adjacency + self-loops)
# D̃ = degree matrix of Ã

class GCNLayer(nn.Module):
    def __init__(self, in_dim, out_dim):
        super().__init__()
        self.weight = nn.Parameter(torch.FloatTensor(in_dim, out_dim))
        nn.init.xavier_uniform_(self.weight)
    
    def forward(self, x, adj_norm):
        # adj_norm is the normalized adjacency matrix
        support = torch.mm(x, self.weight)
        output = torch.spmm(adj_norm, support)
        return output
```

Simple, efficient, effective. The normalization ensures that high-degree nodes don't dominate.

### GAT (Graph Attention Network)

Veličković et al. (2018). Instead of treating all neighbors equally, GAT learns attention weights — some neighbors matter more than others.

```python
class GATLayer(nn.Module):
    def __init__(self, in_dim, out_dim, num_heads=4):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = out_dim // num_heads
        
        self.W = nn.Linear(in_dim, out_dim, bias=False)
        self.attn = nn.Parameter(torch.FloatTensor(num_heads, 2 * self.head_dim))
        nn.init.xavier_uniform_(self.attn)
    
    def forward(self, x, edge_index):
        h = self.W(x).view(-1, self.num_heads, self.head_dim)
        
        row, col = edge_index
        # Compute attention for each edge
        alpha = (torch.cat([h[row], h[col]], dim=-1) * self.attn).sum(-1)
        alpha = torch.softmax(alpha, dim=0)  # Normalize per node
        
        # Weighted aggregation
        out = torch.zeros_like(h)
        out.scatter_add_(0, 
            row.unsqueeze(1).unsqueeze(2).expand_as(h[col]),
            alpha.unsqueeze(-1) * h[col])
        
        return out.view(-1, self.num_heads * self.head_dim)
```

GAT is especially useful when neighbor importance varies significantly — in citation networks, not all papers cited by a paper are equally relevant.

### GraphSAGE

Hamilton et al. (2017). Designed for inductive learning — generalizing to unseen nodes. Key innovation: instead of requiring the full graph at training time, GraphSAGE samples a fixed number of neighbors and aggregates their features.

This makes it practical for:
- Large graphs that don't fit in memory
- Dynamic graphs where new nodes appear
- Production systems where you need to compute embeddings for new entities

### GIN (Graph Isomorphism Network)

Xu et al. (2019). Theoretically motivated — designed to be as powerful as the Weisfeiler-Leman graph isomorphism test. Uses a sum aggregation with learnable epsilon:

```python
h_v = MLP((1 + ε) · h_v + Σ h_u for u in neighbors(v))
```

GIN is the most discriminative standard GNN architecture — if two graph structures are different in a way that WL-test can distinguish, GIN will too.

## Common Tasks

### Node Classification

Predict a label for each node. Example: classifying papers by topic in a citation network, or detecting fraudulent accounts in a transaction network.

### Link Prediction

Predict whether an edge should exist between two nodes. Example: friend recommendation in social networks, or predicting protein-protein interactions.

### Graph Classification

Predict a label for an entire graph. Example: predicting molecular properties (toxicity, solubility) from molecular structure graphs.

```python
import torch_geometric as pyg

class MoleculeClassifier(nn.Module):
    def __init__(self, num_features, hidden_dim, num_classes):
        super().__init__()
        self.conv1 = pyg.nn.GCNConv(num_features, hidden_dim)
        self.conv2 = pyg.nn.GCNConv(hidden_dim, hidden_dim)
        self.conv3 = pyg.nn.GCNConv(hidden_dim, hidden_dim)
        self.classifier = nn.Linear(hidden_dim, num_classes)
    
    def forward(self, data):
        x, edge_index, batch = data.x, data.edge_index, data.batch
        
        x = torch.relu(self.conv1(x, edge_index))
        x = torch.relu(self.conv2(x, edge_index))
        x = torch.relu(self.conv3(x, edge_index))
        
        # Global pooling: aggregate node features into graph-level feature
        x = pyg.nn.global_mean_pool(x, batch)
        
        return self.classifier(x)
```

## Known Limitations

### Over-Smoothing

As you stack more GNN layers, node representations converge — all nodes end up with similar features. This limits the effective depth of GNNs to roughly 2-5 layers, unlike CNNs and Transformers that benefit from much greater depth.

Mitigations: residual connections, jumping knowledge networks (concatenate representations from all layers), DropEdge (randomly remove edges during training).

### Over-Squashing

Information from distant nodes must pass through bottleneck paths, losing fidelity. If the graph has a narrow bridge between two communities, information barely crosses it.

Graph Transformers address this by allowing all nodes to attend to all other nodes, removing the topology constraint for information flow.

### Scalability

Message passing over the full graph is O(|V| + |E|) per layer. For billion-node graphs, this requires specialized mini-batching strategies, neighbor sampling, or distributed training.

Libraries like PyG and DGL provide efficient implementations, but scaling GNNs to web-scale graphs remains an active engineering challenge.

## The PyG Ecosystem

PyTorch Geometric (PyG) is the dominant library for GNN research and increasingly for production:

```python
from torch_geometric.datasets import Planetoid
from torch_geometric.nn import GCNConv

# Load a standard benchmark
dataset = Planetoid(root='./data', name='Cora')
data = dataset[0]

# Build a model
class GCN(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = GCNConv(dataset.num_features, 16)
        self.conv2 = GCNConv(16, dataset.num_classes)
    
    def forward(self, data):
        x = torch.relu(self.conv1(data.x, data.edge_index))
        x = torch.dropout(x, p=0.5, train=self.training)
        x = self.conv2(x, data.edge_index)
        return torch.log_softmax(x, dim=1)
```

## Where GNNs Are Used in Production

- **Drug discovery:** Predicting molecular properties, finding drug candidates
- **Fraud detection:** Modeling transaction networks, identifying suspicious patterns
- **Recommendation systems:** Pinterest, Uber Eats, and others use GNNs for recommendations based on user-item interaction graphs
- **Traffic prediction:** Google Maps uses GNN-based models for travel time estimation
- **Chip design:** GNNs optimize placement and routing in semiconductor design

## When to Use GNNs

**Use GNNs when:**
- Your data is naturally graph-structured
- Relationships between entities are as informative as entity features
- You need to generalize to unseen graph structures

**Don't use GNNs when:**
- Your data is a table, sequence, or grid (use appropriate architectures)
- The graph structure is noisy or unreliable
- You only need simple aggregation (sometimes a graph-aware feature engineering step + standard ML is enough)

GNNs are a specialized but powerful tool. When the problem is naturally a graph problem, they outperform general-purpose alternatives convincingly.
