---
title: "Object Tracking in Video: Following Things That Move"
depth: applied
pillar: building
topic: video-ai
tags: [video-ai, object-tracking, computer-vision, surveillance, sports]
author: bee
date: "2026-03-18"
readTime: 8
description: "Object tracking follows specific objects across video frames — people through a store, cars through an intersection, players on a field. Here's how it works and how to implement it."
related: [video-ai-action-recognition-guide, video-ai-understanding-and-analysis, video-ai-security-surveillance]
---

Object detection tells you what's in a single frame. Object tracking tells you where those objects go over time. It's the difference between "there are 5 people in this frame" and "Person #3 entered the store 4 minutes ago, browsed aisle 7, and is now at checkout."

## How Tracking Works

Modern object tracking combines detection and association:

**Detection:** Run an object detector (YOLO, RT-DETR) on each frame to find objects and their bounding boxes.

**Association:** Match detections across frames — determine that the person in frame 100 at position (x1, y1) is the same person in frame 101 at position (x2, y2).

This is harder than it sounds. People occlude each other, briefly leave the frame, change appearance under different lighting, and move unpredictably.

## The Key Algorithms

### SORT (Simple Online Realtime Tracking)

Uses Kalman filters to predict where each tracked object will be in the next frame, then matches predictions to detections using the Hungarian algorithm. Fast and simple.

**Strengths:** Real-time (>100 fps with a good detector), easy to implement.
**Weaknesses:** Struggles with occlusion. When two people walk past each other, SORT frequently swaps their IDs.

### DeepSORT

Adds a deep learning appearance model to SORT. Each tracked object gets an appearance embedding (a vector describing what it looks like). When matching detections to tracks, DeepSORT considers both position and appearance.

**Strengths:** Much better at handling occlusion. When a person disappears behind a pillar and reappears, DeepSORT often maintains the correct ID.
**Weaknesses:** Slower than SORT due to the embedding extraction.

### ByteTrack

Keeps track of low-confidence detections (detections the model isn't sure about) in addition to high-confidence ones. Many tracking failures happen because the detector briefly misses an object — ByteTrack recovers from these gaps.

**Strengths:** Best accuracy/speed trade-off in 2026. Handles crowded scenes well.
**Weaknesses:** More complex to tune than SORT.

### BoT-SORT

Combines the best ideas from ByteTrack and DeepSORT: high/low confidence matching, appearance embeddings, and improved Kalman filter with camera motion compensation. Current state-of-the-art for many benchmarks.

## Quick Start: Tracking with Ultralytics

The fastest path to working object tracking:

```python
from ultralytics import YOLO

# Load a pretrained model
model = YOLO('yolov8x.pt')

# Track objects in a video
results = model.track(
    source='input_video.mp4',
    tracker='bytetrack.yaml',  # or botsort.yaml
    persist=True,               # Maintain tracks across frames
    conf=0.3,                   # Confidence threshold
    iou=0.5,                    # IoU threshold for matching
    show=True                   # Display results
)

# Access tracking data per frame
for result in results:
    boxes = result.boxes
    for box in boxes:
        track_id = box.id        # Unique ID for this tracked object
        class_id = box.cls       # Object class (person, car, etc.)
        confidence = box.conf    # Detection confidence
        xyxy = box.xyxy          # Bounding box coordinates
```

This gives you working multi-object tracking in about 10 lines of code.

## Practical Applications

### Retail Analytics

Track customer movement through a store. Measure:
- **Dwell time:** How long do customers spend in each section?
- **Path analysis:** What routes do customers take?
- **Conversion funnels:** What percentage of people who enter aisle X pick up a product?

```python
# Simplified: track customer zones
from shapely.geometry import Point, Polygon

zones = {
    "entrance": Polygon([(0,0), (100,0), (100,50), (0,50)]),
    "electronics": Polygon([(200,100), (400,100), (400,300), (200,300)]),
    "checkout": Polygon([(500,0), (600,0), (600,100), (500,100)]),
}

def get_zone(center_point):
    point = Point(center_point)
    for name, zone in zones.items():
        if zone.contains(point):
            return name
    return "other"
```

### Traffic Analysis

Track vehicles through intersections. Count turns, measure wait times, detect violations (running red lights, illegal turns). Camera-based systems are cheaper to deploy than embedded sensors.

### Sports Analytics

Track players and the ball across a field/court. Calculate:
- Player speed and distance covered
- Ball possession time
- Formation analysis
- Heat maps

This has gotten remarkably good — broadcast camera angles now produce tracking data comparable to dedicated tracking systems.

## Handling Common Problems

### Identity Switches

The biggest practical issue. Person A and Person B walk past each other, and the tracker swaps their IDs.

**Solutions:**
- Use appearance-based trackers (DeepSORT, BoT-SORT)
- Increase the re-identification buffer (keep tracks alive longer after detection loss)
- Use higher-resolution video (more visual detail for matching)
- Add pose estimation as an additional matching signal

### Occlusion

Objects disappearing behind other objects or obstacles.

**Solutions:**
- Keep "lost" tracks alive for N frames (30–60 frames is common)
- Use Kalman filter predictions to estimate where the occluded object should be
- When the object reappears, match by appearance embedding

### Camera Motion

If the camera moves (handheld, drone, pan-tilt-zoom), all objects appear to move even when stationary. This confuses position-based trackers.

**Solutions:**
- Camera Motion Compensation (CMC) — estimate camera movement and subtract it from object motion
- BoT-SORT includes CMC by default
- For static cameras, this isn't an issue

### Crowded Scenes

Dense crowds (concerts, train stations) produce overlapping detections and frequent occlusions.

**Solutions:**
- Use a stronger detector with better occlusion handling
- Lower detection confidence threshold to catch partially occluded people
- ByteTrack's two-stage matching helps here
- Accept that tracking accuracy will be lower — aim for aggregate metrics (count, flow) rather than individual tracking

## Performance Considerations

| Config | FPS (on RTX 4090) | Accuracy (MOTA) |
|--------|-------------------|-----------------|
| YOLOv8n + SORT | ~120 fps | Good |
| YOLOv8m + ByteTrack | ~60 fps | Very Good |
| YOLOv8x + BoT-SORT | ~30 fps | Excellent |
| RT-DETR-L + BoT-SORT | ~25 fps | Excellent |

For real-time applications, choose your model size based on your target frame rate and hardware. YOLOv8 medium with ByteTrack is the sweet spot for most deployments.

## Getting Started

1. **Install ultralytics:** `pip install ultralytics`
2. **Run on a test video** with default settings
3. **Adjust detector confidence** — lower if missing objects, higher if too many false detections
4. **Choose your tracker** — ByteTrack for speed, BoT-SORT for accuracy
5. **Add application logic** — zones, counting, path analysis
6. **Evaluate** on your specific scenarios — benchmark accuracy on labeled data

Object tracking is one of the most mature areas of computer vision. The tools are production-ready; the challenge is engineering the application around them.
