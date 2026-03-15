---
title: "RAG for Real-Time Data: Streaming and Live Sources"
depth: technical
pillar: building
topic: rag
tags: [rag, real-time, streaming, live-data, event-driven]
author: "bee"
date: "2026-03-14"
readTime: 10
description: "How to build RAG systems that work with real-time data—streaming ingestion, live index updates, event-driven architectures, freshness guarantees, and the engineering challenges of keeping retrieval current."
related: [rag-production-architecture, rag-freshness-and-staleness-guide, rag-hybrid-search-guide]
---

## The Freshness Problem

Standard RAG pipelines are batch-oriented: ingest documents, build an index, serve queries. This works when your knowledge base changes slowly—product documentation, research papers, internal wikis. But many applications need answers grounded in data that changes constantly:

- **Financial analysis**: Stock prices, news, filings that are minutes old
- **Customer support**: Recent tickets, outage status, product changes from today
- **Operations monitoring**: System metrics, incident reports, deployment logs
- **News and intelligence**: Breaking stories, social media, regulatory announcements
- **E-commerce**: Inventory levels, pricing, reviews posted in the last hour

When your RAG system retrieves a document that's 24 hours old and the answer changed 2 hours ago, you have a freshness problem. This guide covers how to solve it.

## Architecture Patterns

### Pattern 1: Streaming Ingestion with Near-Real-Time Indexing

The most common production pattern:

```
Data Sources → Message Queue → Ingestion Service → Vector Store
                  (Kafka)      (embed + chunk)     (with upsert)
```

**How it works:**

1. Data sources emit change events (new documents, updates, deletes) to a message queue (Kafka, Pulsar, SQS)
2. An ingestion service consumes events, chunks documents, generates embeddings, and upserts to the vector store
3. The vector store supports real-time upserts so new data is immediately searchable

**Latency**: Seconds to low minutes from data change to searchable.

```python
# Simplified streaming ingestion consumer
async def ingestion_consumer(kafka_consumer, embedder, vector_store):
    async for message in kafka_consumer:
        event = parse_event(message)
        
        if event.type == 'delete':
            await vector_store.delete(ids=event.document_ids)
            continue
        
        # Chunk and embed
        chunks = chunk_document(event.document)
        embeddings = await embedder.encode([c.text for c in chunks])
        
        # Upsert (insert or update)
        await vector_store.upsert(
            ids=[c.id for c in chunks],
            vectors=embeddings,
            metadata=[c.metadata for c in chunks],
        )
```

### Pattern 2: Dual-Index (Batch + Real-Time)

Maintain two indexes:

- **Batch index**: Full corpus, rebuilt periodically (daily/weekly). Optimized for recall.
- **Real-time index**: Recent changes only. Optimized for freshness.

At query time, search both indexes and merge results, with recency boosting for the real-time index:

```python
async def hybrid_search(query: str, top_k: int = 10):
    # Search both indexes in parallel
    batch_results, rt_results = await asyncio.gather(
        batch_index.search(query, top_k=top_k),
        realtime_index.search(query, top_k=top_k),
    )
    
    # Merge with recency boost
    all_results = []
    for r in batch_results:
        r.score *= 1.0  # No boost
        all_results.append(r)
    for r in rt_results:
        recency_boost = calculate_recency_boost(r.timestamp)
        r.score *= recency_boost  # e.g., 1.2x for last hour, 1.1x for last day
        all_results.append(r)
    
    # Deduplicate (real-time version wins over batch version)
    deduplicated = deduplicate_by_source_id(all_results)
    
    return sorted(deduplicated, key=lambda r: r.score, reverse=True)[:top_k]
```

**Advantages**: The batch index is stable and well-optimized. The real-time index handles the firehose without affecting batch quality.

**When to use**: When your corpus is large (millions of documents) and only a fraction changes frequently.

### Pattern 3: Query-Time Retrieval (No Pre-Indexing)

For some data sources, skip the index entirely and fetch live at query time:

```python
async def live_rag_query(user_query: str):
    # Step 1: Determine what live data sources to query
    sources = await route_to_sources(user_query)
    
    # Step 2: Fetch live data in parallel
    live_data = await asyncio.gather(*[
        fetch_live(source, user_query) for source in sources
    ])
    
    # Step 3: Generate answer grounded in live data
    context = format_context(live_data)
    return await llm.generate(
        system="Answer based only on the provided context.",
        user=f"Context:\n{context}\n\nQuestion: {user_query}"
    )
```

**Data sources**: APIs (stock prices, weather), databases (current inventory), search engines (recent news), monitoring systems (current status).

**Advantages**: Always fresh. No index maintenance.

**Disadvantages**: Slow (depends on source latency). Limited by API rate limits. Can't do semantic search over the results.

**When to use**: When freshness is paramount and the data sources are queryable APIs.

## Streaming Infrastructure

### Message Queues

The backbone of real-time RAG ingestion:

- **Apache Kafka**: The standard for high-throughput event streaming. Durable, scalable, battle-tested. Overhead is significant for small deployments.
- **Apache Pulsar**: Similar to Kafka with better multi-tenancy and tiered storage.
- **AWS SQS/SNS**: Managed, simple, lower throughput. Good for moderate volumes.
- **Redis Streams**: Lightweight, fast, good for smaller-scale real-time pipelines.

### Change Data Capture (CDC)

For keeping RAG indexes in sync with operational databases:

```
Database → CDC (Debezium) → Kafka → Ingestion → Vector Store
```

Debezium captures row-level changes (INSERT, UPDATE, DELETE) from PostgreSQL, MySQL, MongoDB, and others, emitting them as events. Your ingestion service processes these events to keep the vector store synchronized.

### Webhook-Based Ingestion

For SaaS data sources (Notion, Confluence, Slack, Zendesk):

```
SaaS Platform → Webhook → Ingestion API → Queue → Vector Store
```

Most SaaS platforms offer webhooks for change notifications. Build an ingestion API that receives webhooks, validates them, and queues them for processing.

## Vector Store Considerations

Not all vector stores handle real-time updates well:

### Good for Real-Time

- **Pinecone**: Supports real-time upserts with immediate availability
- **Weaviate**: Supports live CRUD operations with near-instant indexing
- **Qdrant**: Efficient upserts with configurable consistency
- **Milvus**: Supports streaming inserts with configurable flush intervals

### Challenges

- **Index rebuilding**: Some indexing algorithms (HNSW, IVF) degrade with many insertions. Periodic re-optimization may be needed.
- **Consistency**: After an upsert, is the vector immediately searchable? This varies by store and configuration.
- **Delete propagation**: Deleting a document should remove all its chunks. Track document-to-chunk mappings.
- **Update semantics**: Updating a document means re-chunking and re-embedding. Old chunks must be deleted, new ones inserted. This isn't atomic in most vector stores.

## Freshness Guarantees

### Defining Freshness SLAs

Be explicit about what "real-time" means for your application:

- **Hard real-time** (<1 second): Stock trading, safety systems. Probably don't use RAG; use direct data access.
- **Near real-time** (1-60 seconds): Customer support, operations dashboards. Streaming ingestion works.
- **Soft real-time** (1-15 minutes): News analysis, social monitoring. Micro-batch ingestion is sufficient.
- **Eventually consistent** (15 min - hours): Knowledge bases, documentation. Standard batch pipelines.

### Monitoring Freshness

Track the lag between data change and searchability:

```python
# Emit a freshness metric with each ingested document
freshness_lag = time.time() - document.source_timestamp
metrics.histogram('rag.ingestion.freshness_lag_seconds', freshness_lag)

# Alert if lag exceeds SLA
if freshness_lag > SLA_SECONDS:
    alert(f"Freshness SLA breach: {freshness_lag}s lag for {document.source}")
```

### Staleness Detection at Query Time

When returning results, check if retrieved documents might be stale:

```python
async def search_with_staleness_check(query, max_age_seconds=300):
    results = await vector_store.search(query)
    
    for result in results:
        age = time.time() - result.metadata['indexed_at']
        result.metadata['potentially_stale'] = age > max_age_seconds
    
    # Optionally: fetch live version of stale results
    stale_results = [r for r in results if r.metadata['potentially_stale']]
    if stale_results:
        refreshed = await refresh_from_source(stale_results)
        results = merge_refreshed(results, refreshed)
    
    return results
```

## Handling Deletions and Updates

### The Tombstone Problem

When a document is deleted or updated, all its chunks must be removed from the vector store. This requires maintaining a mapping:

```python
# Document-to-chunks mapping (store in a database)
class ChunkRegistry:
    async def register(self, doc_id: str, chunk_ids: list[str]):
        await self.db.upsert(doc_id, chunk_ids)
    
    async def get_chunks(self, doc_id: str) -> list[str]:
        return await self.db.get(doc_id)
    
    async def delete_document(self, doc_id: str):
        chunk_ids = await self.get_chunks(doc_id)
        await self.vector_store.delete(ids=chunk_ids)
        await self.db.delete(doc_id)
```

### Update Strategy

For document updates:

1. Delete all existing chunks for the document
2. Re-chunk and re-embed the updated document
3. Insert new chunks
4. Update the chunk registry

This isn't atomic—there's a brief window where the document is absent from the index. For most applications this is acceptable. For critical applications, use the dual-index pattern: insert new chunks first, then delete old ones.

## Scaling Considerations

### Embedding Throughput

Real-time ingestion requires fast embedding generation. Bottlenecks:

- **API-based embedding** (OpenAI, Cohere): Rate-limited, network latency. Batch requests where possible.
- **Self-hosted embedding** (Sentence Transformers on GPU): Higher throughput, but requires GPU infrastructure.
- **Quantized models**: Faster inference with minimal quality loss for embedding generation.

For high-volume streams (>100 documents/second), self-hosted embedding on dedicated GPUs is usually necessary.

### Backpressure

If ingestion can't keep up with the data stream:

1. **Buffer in the queue**: Kafka retains messages until consumed. Monitor consumer lag.
2. **Scale consumers horizontally**: Add more ingestion workers.
3. **Prioritize**: Process high-importance documents first (customer-facing content > internal logs).
4. **Degrade gracefully**: If the backlog grows too large, skip re-embedding unchanged documents.

## Practical Recommendations

1. **Start with soft real-time.** Micro-batch ingestion (every 5-15 minutes) covers most use cases and is much simpler than true streaming.
2. **Use the dual-index pattern** for large corpora where only a fraction changes frequently.
3. **Monitor freshness as a first-class metric.** If you don't measure it, you can't guarantee it.
4. **Handle deletions explicitly.** Stale data in your index is worse than missing data.
5. **Test with realistic data volumes.** Your pipeline that handles 10 documents/minute will behave differently at 10,000/minute.
6. **Plan for replay.** When your ingestion pipeline has a bug, you need to reprocess historical events. Design for this from the start.

Real-time RAG is an infrastructure challenge more than an AI challenge. The retrieval and generation parts are well-understood. The hard part is keeping your index fresh, consistent, and performant as data flows continuously. Get the plumbing right, and the AI part works itself out.
