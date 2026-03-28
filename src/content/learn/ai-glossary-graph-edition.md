---
title: "AI Glossary: Graph and Network Edition"
depth: essential
pillar: foundations
topic: ai-glossary
tags: [ai-glossary, graphs, knowledge-graphs, gnns, network-analysis]
author: bee
date: "2026-03-28"
readTime: 7
description: "Key terms for understanding graph-based AI — from knowledge graphs and graph neural networks to message passing and link prediction."
related: [ai-glossary-advanced, deep-learning-graph-neural-networks-guide, ai-glossary-practitioners-edition]
---

# AI Glossary: Graph and Network Edition

Graphs are everywhere in AI — social networks, molecular structures, knowledge bases, recommendation systems. This glossary covers the essential terminology for understanding graph-based AI systems.

## Core Graph Concepts

**Graph.** A data structure consisting of nodes (vertices) and edges (connections between nodes). Graphs represent relationships — users following each other, atoms bonded in a molecule, concepts linked in a knowledge base.

**Directed graph.** A graph where edges have direction. "A follows B" is different from "B follows A." Social media follow graphs, citation networks, and dependency graphs are directed.

**Undirected graph.** A graph where edges are bidirectional. "A is friends with B" implies "B is friends with A." Molecular bonds and co-authorship networks are typically undirected.

**Weighted graph.** A graph where edges carry numerical values — distance, strength, confidence, or cost. A road network with travel times is a weighted graph.

**Node features.** Attributes associated with each node. In a social network, these might be user demographics. In a molecule, they describe atomic properties like element type and charge.

**Edge features.** Attributes associated with edges. Bond type in molecular graphs, relationship type in knowledge graphs, interaction strength in biological networks.

**Adjacency matrix.** A matrix representation of a graph where entry (i,j) is 1 if nodes i and j are connected, 0 otherwise. For weighted graphs, entries contain edge weights. Sparse graphs have mostly zeros.

**Degree.** The number of edges connected to a node. In directed graphs, there is in-degree (incoming edges) and out-degree (outgoing edges). High-degree nodes are hubs.

## Knowledge Graphs

**Knowledge graph.** A graph where nodes represent entities (people, places, concepts) and edges represent relationships between them (born_in, part_of, causes). Knowledge graphs structure factual information in a queryable format.

**Triple.** The fundamental unit of a knowledge graph: (subject, predicate, object). Example: (Albert Einstein, born_in, Ulm). Also called a fact or statement.

**Entity.** A distinct thing represented as a node — a person, organization, location, concept, or event. Entities are typically identified by unique identifiers and may have labels in multiple languages.

**Relation.** A typed connection between entities. Relations have semantics — "employed_by" is different from "founded." The set of defined relations forms the schema or ontology of the knowledge graph.

**Ontology.** The schema defining what types of entities and relations exist in a knowledge graph and how they relate. An ontology might specify that "Person" entities can have "born_in" relations to "Location" entities.

**Knowledge graph embedding.** A learned vector representation of entities and relations that captures the graph's structure in continuous space. Models like TransE, RotatE, and ComplEx learn embeddings where valid triples have specific geometric relationships.

**Link prediction.** Predicting missing edges in a graph — inferring that a relationship exists even though it is not explicitly stated. A core task in knowledge graph completion.

## Graph Neural Networks

**Graph neural network (GNN).** A neural network that operates on graph-structured data. Unlike standard neural networks that expect fixed-size inputs (images, sequences), GNNs handle arbitrary graph topologies.

**Message passing.** The core mechanism of most GNNs. Each node collects information (messages) from its neighbors, aggregates them, and updates its own representation. After multiple rounds of message passing, each node's representation captures information from its broader neighborhood.

**Aggregation.** How a node combines messages from its neighbors. Common approaches include sum, mean, and max aggregation. The choice affects what information is preserved — sum captures neighborhood size, mean normalizes for it.

**Graph convolution.** An operation analogous to image convolution but on graphs. Instead of sliding a filter over a grid, a graph convolution aggregates information from each node's neighbors using learned weights. GCN (Graph Convolutional Network) is the foundational model.

**Graph attention.** Applying attention mechanisms to graphs — learning which neighbors are most relevant for each node rather than weighting all neighbors equally. GAT (Graph Attention Network) computes attention scores between connected nodes.

**Readout (graph pooling).** Producing a single vector representation for an entire graph from individual node representations. Used when the task is graph-level (classifying molecules, predicting properties) rather than node-level.

**Over-smoothing.** A problem in deep GNNs where repeated message passing causes all node representations to converge to similar values. After too many layers, every node has aggregated information from the entire graph and individual node identity is lost. This limits practical GNN depth to 2–5 layers for most architectures.

**Heterogeneous graph.** A graph with multiple types of nodes and edges. A citation network might have Paper, Author, and Venue node types with "wrote," "cited," and "published_at" edge types. Heterogeneous GNNs handle these different types explicitly.

## Graph Tasks

**Node classification.** Predicting a label for individual nodes — classifying users as bots or humans, predicting protein function, identifying fraudulent accounts.

**Edge classification.** Predicting properties of edges — classifying relationship types, predicting interaction strength.

**Graph classification.** Predicting properties of entire graphs — determining if a molecule is toxic, classifying documents represented as graphs.

**Community detection.** Finding groups of densely connected nodes within a larger graph. Useful for identifying clusters in social networks, functional modules in biological networks.

**Graph generation.** Creating new graphs that share properties with a training set. Used in drug discovery (generating molecular graphs) and circuit design.

## Applied Concepts

**Subgraph.** A portion of a larger graph. Many practical systems work with subgraphs rather than full graphs to manage computational cost — sampling a neighborhood around a target node rather than processing millions of nodes.

**Graph database.** A database optimized for storing and querying graph-structured data. Neo4j, Amazon Neptune, and TigerGraph are common choices. Graph databases use query languages like Cypher or SPARQL designed for traversing relationships.

**RAG with knowledge graphs.** Using knowledge graphs as a retrieval source for language models. Instead of (or alongside) retrieving text chunks, the system retrieves relevant subgraphs that provide structured factual context. This can improve factual accuracy compared to text-only retrieval.

**Temporal graph.** A graph that changes over time — edges appear and disappear, node features evolve. Modeling temporal graphs is critical for dynamic systems like evolving social networks, financial transaction networks, and traffic patterns.

---

*This glossary is part of a series covering AI terminology by domain. See the full glossary collection on zro2.one for other editions covering safety, retrieval, multimodal, and more.*
