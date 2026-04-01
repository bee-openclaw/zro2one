---
title: "Video AI for Fitness and Rehabilitation: Pose Estimation, Form Correction, and Progress Tracking"
depth: applied
pillar: video-ai
topic: video-ai
tags: [video-ai, fitness, rehabilitation, pose-estimation, movement-analysis]
author: bee
date: "2026-04-01"
readTime: 9
description: "How video AI enables automated movement analysis for fitness coaching and physical therapy — covering pose estimation, form correction, rep counting, and progress tracking, with honest assessment of current accuracy limits."
related: [video-ai-action-recognition-guide, video-ai-real-time-edge, video-ai-object-tracking-guide]
---

Personal training is expensive. Physical therapy sessions are limited. And in both cases, the practitioner is not there when you are doing your exercises at home, which is where most of the actual work happens. Video AI offers something genuinely new: automated movement analysis that can provide real-time feedback on exercise form, count repetitions, measure range of motion, and track progress over time.

The technology works well enough today to be useful, but the gap between a marketing demo and a system that handles real-world conditions reliably is significant. This guide covers what the technology can do, how it works, where it breaks down, and how to think about building or buying solutions in this space.

## Core Technology: Pose Estimation

Everything in fitness and rehabilitation video AI starts with pose estimation: detecting a person in a video frame and identifying the positions of their body joints (keypoints).

### How It Works

Modern pose estimation models detect 17-33 keypoints on the human body: head, shoulders, elbows, wrists, hips, knees, ankles, and sometimes individual finger joints and facial landmarks. The output for each frame is a skeleton: a set of (x, y) coordinates for each keypoint, often with confidence scores.

The main frameworks:

- **MediaPipe Pose** (Google): Runs efficiently on mobile devices and in browsers. 33 keypoints. Good balance of accuracy and speed. The most common choice for real-time consumer applications.
- **MoveNet** (Google): Optimized specifically for fitness applications. Available in Lightning (fast, less accurate) and Thunder (slower, more accurate) variants.
- **OpenPose** (CMU): The original widely-used pose estimation system. Higher accuracy but heavier computational requirements. Better for offline analysis than real-time feedback.
- **MMPose** (OpenMMLab): Research-focused framework with many model options. Good for experimentation and custom training.

```python
import mediapipe as mp
import cv2

mp_pose = mp.solutions.pose

def estimate_pose(frame):
    """Extract pose keypoints from a video frame."""
    with mp_pose.Pose(
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose:
        # MediaPipe expects RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)

        if results.pose_landmarks:
            keypoints = {}
            for idx, landmark in enumerate(results.pose_landmarks.landmark):
                keypoints[mp_pose.PoseLandmark(idx).name] = {
                    "x": landmark.x,  # Normalized 0-1
                    "y": landmark.y,
                    "z": landmark.z,  # Depth estimate
                    "visibility": landmark.visibility,
                }
            return keypoints
    return None
```

### From Keypoints to Biomechanics

Raw keypoint coordinates are not directly useful for fitness analysis. The next step is computing biomechanical features:

```python
import numpy as np

def calculate_angle(point_a, point_b, point_c):
    """Calculate angle at point_b formed by points a-b-c."""
    a = np.array([point_a["x"], point_a["y"]])
    b = np.array([point_b["x"], point_b["y"]])
    c = np.array([point_c["x"], point_c["y"]])

    ba = a - b
    bc = c - b

    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    angle = np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0)))
    return angle

def analyze_squat(keypoints):
    """Analyze squat form from pose keypoints."""
    # Knee angle (hip-knee-ankle)
    knee_angle = calculate_angle(
        keypoints["LEFT_HIP"],
        keypoints["LEFT_KNEE"],
        keypoints["LEFT_ANKLE"],
    )

    # Hip angle (shoulder-hip-knee)
    hip_angle = calculate_angle(
        keypoints["LEFT_SHOULDER"],
        keypoints["LEFT_HIP"],
        keypoints["LEFT_KNEE"],
    )

    # Spine inclination
    spine_vertical = calculate_angle(
        {"x": keypoints["LEFT_SHOULDER"]["x"], "y": 0},  # Vertical ref
        keypoints["LEFT_SHOULDER"],
        keypoints["LEFT_HIP"],
    )

    return {
        "knee_angle": knee_angle,
        "hip_angle": hip_angle,
        "spine_inclination": spine_vertical,
        "depth_adequate": knee_angle < 90,  # Parallel or below
        "knee_tracking": check_knee_over_toe(keypoints),
    }
```

## Applications

### Exercise Form Analysis

The most developed application. For exercises with well-defined form criteria, video AI can provide useful feedback:

**Squats:** Knee tracking (knees caving inward), squat depth, forward lean angle, heel lift detection. These are all measurable from 2D pose estimation when the camera angle is appropriate (side view for depth, front view for knee tracking).

**Deadlifts:** Back rounding detection (spine curvature changes), lockout position, bar path relative to body center. Requires side camera view.

**Push-ups:** Elbow angle at bottom, body alignment (sagging hips, piking), range of motion consistency across reps.

**Yoga and stretching:** Pose matching against reference positions, symmetry analysis, range of motion measurement.

The feedback works best when it is specific and actionable: "Your knees are caving inward by 15 degrees at the bottom of the squat" rather than "Bad form detected."

### Rep Counting

Counting repetitions requires detecting the cyclic nature of exercises. The approach:

1. Track a key joint angle over time (e.g., knee angle for squats)
2. Detect peaks and valleys in the angle time series
3. Count complete cycles that meet minimum range-of-motion thresholds

```python
from scipy.signal import find_peaks

def count_reps(angle_series: list[float], 
               min_rom: float = 40,
               min_distance: int = 15) -> int:
    """Count exercise repetitions from joint angle time series."""
    angles = np.array(angle_series)

    # Find valleys (bottom of movement)
    valleys, properties = find_peaks(
        -angles,  # Negate to find valleys with peak finder
        distance=min_distance,  # Minimum frames between reps
        prominence=min_rom,  # Minimum range of motion
    )

    return len(valleys)
```

### Range of Motion Measurement

For rehabilitation, measuring joint range of motion over time is a primary metric. Video AI can measure:

- Shoulder flexion, extension, abduction, rotation
- Elbow flexion and extension
- Knee flexion and extension
- Hip flexion, extension, abduction
- Ankle dorsiflexion

The measurements are approximate compared to goniometer readings (the gold standard in physical therapy), but they are consistent enough to track trends over time. A patient's knee flexion going from 95 degrees to 115 degrees over four weeks is a meaningful signal even if the absolute values have a few degrees of error.

## Architecture

A typical fitness AI system has this pipeline:

**Camera input** (phone camera, webcam, or recorded video) feeds into **pose estimation** (MediaPipe, MoveNet) which produces **keypoint sequences** that are processed by **biomechanical analysis** (angle calculation, trajectory analysis) which drives **feedback generation** (form cues, rep counts, progress metrics) delivered to the **user interface** (overlaid on video, audio cues, or post-session report).

### Real-Time vs. Recorded Analysis

Real-time analysis requires the full pipeline to complete within a frame time (33ms at 30fps). MediaPipe and MoveNet Lightning achieve this on modern phones. Real-time feedback is better for form correction during exercise.

Recorded analysis can use heavier models, multi-pass processing, and more sophisticated analysis. Better for detailed progress reports and clinical assessments.

### On-Device vs. Cloud

For fitness applications, on-device processing is strongly preferred:

- **Privacy:** Users are recording themselves exercising. Sending video to a server is a privacy concern many users will not accept.
- **Latency:** Real-time feedback requires low latency. Network round trips add unacceptable delay.
- **Offline use:** Gyms often have poor connectivity.
- **Cost:** Processing video in the cloud is expensive at scale.

MediaPipe and MoveNet are specifically designed for on-device execution. They run well on mobile GPUs and even on CPU for lower frame rates.

## Accuracy Considerations

### Camera Angle Matters

Pose estimation accuracy varies dramatically with camera angle. A squat viewed from the side gives accurate depth measurement but cannot assess knee tracking. A front view shows knee tracking but not depth. Most consumer apps specify "place your phone to your side" and are optimized for that single view.

Professional systems use multiple cameras or ask users to perform exercises from different angles on different sessions.

### Occlusion and Clothing

Loose clothing, holding equipment (dumbbells, resistance bands), and self-occlusion (one arm behind the torso) all degrade keypoint accuracy. Models handle these cases better than they did two years ago, but they remain the most common source of errors.

### Body Type Diversity

Pose estimation models trained primarily on one body type will underperform on others. This is a real problem. If a model was trained mostly on athletic body types, it may be less accurate on larger body types, older adults, or people with mobility devices. Evaluate models on your actual target population, not just on benchmark datasets.

### The 3D Problem

Most accessible pose estimation works in 2D: the model estimates (x, y) positions of joints in the image plane. But exercise form is inherently 3D. A knee might appear to be tracking correctly in 2D while actually deviating laterally.

Some models estimate depth (the "z" coordinate in MediaPipe), but these estimates are less reliable than x and y positions. True 3D estimation from a single camera is an active research area with improving but still limited accuracy.

## Physical Therapy Applications

### Post-Surgery Recovery Monitoring

After knee replacement, ACL repair, or shoulder surgery, patients are prescribed home exercises with specific range-of-motion targets. Video AI can track adherence (whether the patient is doing the exercises) and progress (whether range of motion is improving).

This does not replace in-person physical therapy. It provides data between sessions that the therapist can review, catch patients who are falling behind, and adjust programs accordingly.

### Home Exercise Compliance

The biggest problem in physical therapy is not the quality of the exercise program. It is that patients do not do the exercises. Video AI that counts reps and tracks sessions provides accountability and data. Therapists report that patients who know their exercises are being tracked show significantly higher compliance.

## Current Limitations

- **Clinical validation gaps:** Most video AI fitness tools have not been validated in clinical trials. The angle measurements are approximate, and for clinical decision-making, that matters.
- **Complex movements:** Exercises involving rotation, rapid movements, or floor-based positions are harder to analyze than standing exercises with clear joint angles.
- **No load assessment:** Video cannot tell you how much weight someone is lifting. Form analysis without load context is incomplete.
- **Feedback quality:** Detecting that form is wrong is easier than explaining how to fix it. The feedback generation layer is often the weakest link.

## Build vs. Buy

**Build** if: you have specific biomechanical analysis needs, your target exercises are not covered by commercial products, you need clinical-grade measurement with custom validation, or you need deep integration with existing healthcare systems.

**Buy** if: you need standard exercise tracking for common movements, you want a consumer-facing product quickly, you do not have computer vision expertise on your team, or your differentiation is in the coaching methodology rather than the technology.

The pose estimation layer is largely commoditized through MediaPipe and MoveNet. The value-add is in the biomechanical analysis layer (what constitutes good form for each exercise) and the feedback layer (how you communicate corrections to users). Those are where domain expertise in exercise science and physical therapy matters more than computer vision expertise.