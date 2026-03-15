---
title: "Video AI: Real-Time Processing and Edge Deployment"
depth: technical
pillar: building
topic: video-ai
tags: [video-ai, real-time, edge-computing, optimization, deployment]
author: "bee"
date: "2026-03-14"
readTime: 10
description: "How to deploy video AI at the edge for real-time processing—model optimization, hardware selection, inference pipelines, latency management, and production deployment patterns."
related: [video-ai-2026-guide, video-ai-understanding-and-analysis, video-ai-security-surveillance]
---

## Why Edge Video AI?

Sending raw video to the cloud for processing is expensive, slow, and sometimes impossible. A single 1080p camera at 30 FPS generates roughly 1.5 Gbps of uncompressed data. Even compressed, streaming dozens of cameras to cloud APIs is impractical for many deployments.

Edge video AI processes video where it's captured—on-device or on local servers—sending only results (metadata, alerts, compressed clips) to the cloud. This reduces bandwidth by 99%+, cuts latency from seconds to milliseconds, and works even without internet connectivity.

Applications span industries: manufacturing quality inspection, retail analytics, autonomous vehicles, smart cities, agriculture, security, and healthcare.

## The Edge Inference Pipeline

A typical real-time video AI pipeline:

```
Camera → Decode → Preprocess → Inference → Postprocess → Action
  ↓         ↓          ↓           ↓            ↓           ↓
 RTSP    Hardware    Resize,     Model      NMS, track,   Alert,
 stream  decoder    normalize   forward     classify      record,
                                 pass                     stream
```

### Frame Acquisition

- **RTSP/RTMP streams**: Standard protocols for IP cameras. Use hardware-accelerated decoders (NVDEC, VA-API, VideoToolbox).
- **USB cameras**: Direct capture via V4L2 (Linux) or platform APIs.
- **Frame rate management**: Not every frame needs inference. Process every Nth frame (temporal subsampling) and interpolate for tracking.

### Preprocessing

Resize, normalize, and format frames for the model:

```python
# Typical preprocessing for a detection model
def preprocess(frame, input_size=(640, 640)):
    # Letterbox resize (maintain aspect ratio)
    resized = letterbox_resize(frame, input_size)
    # BGR to RGB, HWC to CHW
    blob = cv2.dnn.blobFromImage(resized, 1/255.0, input_size, swapRB=True)
    return blob
```

Use hardware-accelerated preprocessing where possible. NVIDIA's nvJPEG and NPP libraries handle resize and color conversion on GPU, avoiding CPU bottlenecks.

### Inference

The model forward pass. Optimization here determines whether you hit real-time:

- **Batch processing**: Accumulate N frames and run inference on the batch. Higher throughput but higher latency.
- **Async pipelines**: Overlap frame acquisition, preprocessing, inference, and postprocessing using separate threads/streams.
- **Model cascade**: Run a lightweight detector first, then a heavier classifier only on detected regions.

### Postprocessing

- **Non-Maximum Suppression (NMS)**: Filter overlapping detections.
- **Object tracking**: Associate detections across frames (SORT, DeepSORT, ByteTrack).
- **Classification**: Crop detected regions and classify (vehicle type, product defect, behavior).
- **Event detection**: Trigger alerts based on rules or learned patterns.

## Model Optimization for Edge

### Quantization

Reduce numerical precision from FP32 to INT8 or INT4:

- **Post-Training Quantization (PTQ)**: Quantize a trained model with a calibration dataset. Typical accuracy loss: 0.5-2%.
- **Quantization-Aware Training (QAT)**: Simulate quantization during training. Better accuracy retention but requires retraining.
- **Mixed precision**: Keep sensitive layers in higher precision, quantize the rest.

INT8 quantization typically provides **2-4x speedup** and **4x memory reduction** compared to FP32.

### Pruning

Remove unnecessary weights or entire channels:

- **Unstructured pruning**: Zero out individual weights. Requires sparse computation support for speedup.
- **Structured pruning**: Remove entire filters/channels. Produces standard dense models that run on any hardware.
- **Typical results**: 50-70% parameter reduction with <1% accuracy loss for well-pruned models.

### Knowledge Distillation

Train a small "student" model to mimic a large "teacher" model:

```
Teacher (YOLOv8-X, 68M params) → Student (YOLOv8-N, 3M params)
```

The student learns richer representations than it would from labels alone, often achieving accuracy close to the teacher at a fraction of the computational cost.

### Architecture Selection

Choose the right model architecture for your latency budget:

| Model | Params | FPS (Jetson Orin) | mAP@50 |
|-------|--------|-------------------|--------|
| YOLOv8-N | 3.2M | 180 | 37.3 |
| YOLOv8-S | 11.2M | 95 | 44.9 |
| YOLOv8-M | 25.9M | 45 | 50.2 |
| YOLOv8-X | 68.2M | 15 | 53.9 |
| RT-DETR-L | 32M | 35 | 53.0 |

For edge deployment, YOLOv8-N or YOLOv8-S with INT8 quantization is the sweet spot for most applications.

### TensorRT and Runtime Optimization

NVIDIA TensorRT is the standard for deploying models on NVIDIA hardware:

```python
import tensorrt as trt

# Convert ONNX model to TensorRT engine
builder = trt.Builder(logger)
network = builder.create_network(1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH))
parser = trt.OnnxParser(network, logger)
parser.parse_from_file("model.onnx")

config = builder.create_builder_config()
config.set_flag(trt.BuilderFlag.INT8)  # Enable INT8 quantization
config.int8_calibrator = calibrator    # Calibration data

engine = builder.build_serialized_network(network, config)
```

Other runtimes:
- **ONNX Runtime**: Cross-platform, supports CPU, GPU, and NPU backends
- **OpenVINO**: Optimized for Intel hardware (CPU, integrated GPU, VPU)
- **TFLite**: Optimized for mobile and Coral Edge TPU
- **Apple Core ML**: Optimized for Apple Neural Engine

## Hardware Selection

### NVIDIA Jetson Family

The dominant edge AI platform:

- **Jetson Orin Nano** ($199): 20 TOPS INT8. Good for 1-2 camera streams with lightweight models.
- **Jetson Orin NX** ($399-$599): 70-100 TOPS. Handles 4-8 cameras with mid-size models.
- **Jetson AGX Orin** ($999-$1,999): 200-275 TOPS. Handles 10+ cameras or complex models.

### Alternatives

- **Google Coral** ($60-$150): 4 TOPS via Edge TPU. Very power-efficient for simple models.
- **Intel Movidius / OpenVINO**: Good ecosystem for Intel-based deployments.
- **Qualcomm Cloud AI**: Emerging competitor with strong power efficiency.
- **Hailo-8** ($99): 26 TOPS in an M.2 form factor. Interesting for retrofitting existing systems.
- **Apple Neural Engine**: 15-38 TOPS on recent Apple Silicon. Excellent for macOS/iOS applications.

### Selection Criteria

1. **Throughput requirement**: How many frames per second across how many cameras?
2. **Model complexity**: What accuracy do you need? Larger models need more compute.
3. **Power budget**: Battery-powered? Solar? Unlimited AC power?
4. **Environmental**: Temperature range, humidity, vibration, IP rating.
5. **Software ecosystem**: SDK maturity, community support, model compatibility.
6. **Cost at scale**: Unit price × deployment size + software licensing.

## Production Deployment

### Container-Based Deployment

Package your pipeline in Docker containers for reproducible deployment:

```dockerfile
FROM nvcr.io/nvidia/l4t-tensorrt:r35.4.1-runtime

COPY model.engine /app/model.engine
COPY pipeline.py /app/pipeline.py

# Install dependencies
RUN pip install opencv-python-headless numpy

CMD ["python", "/app/pipeline.py"]
```

Use NVIDIA's L4T (Linux for Tegra) containers for Jetson, or standard CUDA containers for server GPUs.

### Fleet Management

Deploying to hundreds or thousands of edge devices requires:

- **OTA updates**: Push model and software updates remotely
- **Health monitoring**: Track device status, GPU utilization, inference latency, error rates
- **Remote diagnostics**: SSH access, log collection, performance profiling
- **Configuration management**: Per-device or per-site model parameters, detection zones, alert thresholds
- **Rollback capability**: Revert to previous model/software version if an update causes issues

Tools: Balena, AWS IoT Greengrass, Azure IoT Edge, custom Kubernetes-based solutions.

### Reliability

Edge devices must operate unattended for months:

- **Watchdog processes**: Restart the pipeline if it crashes or hangs
- **Memory management**: Video pipelines can leak memory over days. Monitor and restart proactively.
- **Thermal management**: Throttle inference if the device overheats. Better to skip frames than to shut down.
- **Storage management**: Rotate local video storage. Alert before disks fill up.
- **Network resilience**: Buffer results locally during network outages. Sync when connectivity returns.

## Latency Optimization

### End-to-End Latency Budget

For a real-time pipeline targeting 30 FPS (33ms per frame):

| Stage | Budget |
|-------|--------|
| Decode | 2-5ms |
| Preprocess | 1-3ms |
| Inference | 10-25ms |
| Postprocess | 1-3ms |
| Tracking | 1-2ms |
| Total | 15-38ms |

### Optimization Techniques

1. **Pipeline parallelism**: Decode frame N+1 while inferring on frame N
2. **Skip frames intelligently**: Process every other frame; use tracking to interpolate
3. **Region of interest**: Only run full inference on regions where motion is detected
4. **Model cascading**: Lightweight motion detector → medium object detector → heavy classifier (only on detections)
5. **Dynamic resolution**: Reduce input resolution during peak load
6. **Batch accumulation**: Trade latency for throughput when latency budget allows

### Profiling

Always profile before optimizing:

```bash
# NVIDIA Nsight Systems for GPU profiling
nsys profile python pipeline.py

# TensorRT built-in profiling
trtexec --onnx=model.onnx --int8 --verbose --dumpProfile
```

Identify the actual bottleneck before optimizing. It might not be where you expect—memory copies between CPU and GPU are a common hidden bottleneck.

## Getting Started

1. **Start with a pre-trained YOLO model** (Ultralytics). Export to ONNX, convert to TensorRT.
2. **Deploy on a Jetson Orin** with a single USB camera. Get the pipeline working end-to-end.
3. **Optimize**: Quantize to INT8, profile, optimize preprocessing.
4. **Add tracking**: ByteTrack is fast and accurate for most use cases.
5. **Build the output layer**: Alerts, recording, dashboard—whatever your application needs.
6. **Scale**: Multi-camera, fleet management, OTA updates.

Edge video AI is an engineering discipline as much as a machine learning one. The model is one component of a system that includes hardware, networking, storage, deployment, and monitoring. Get the system right, and the AI delivers real value. Get it wrong, and even the best model is useless.
