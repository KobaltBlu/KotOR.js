# Force push: direct line and obstacles (observed original game behavior)

## Overview

When Force Push is applied, the original engine can test whether a straight line from the source to the intended destination is blocked by world geometry. If blocked, the end point is adjusted (for example, clamped to a hit). When the “ignore line test” flag is set, that test is skipped.

## Effect parameters (observed)

- Integer: targeted vs. directional mode
- Integer: whether to skip the direct-line obstacle test
- Floats: target location when targeted
- Float: push distance (with a default when zero)

## Logic (observed)

1. Compute direction and a candidate destination from source along the push.
2. If the obstacle test is not skipped, ask the area for a direct line test between start and end; if blocked, use the reported hit (or avoid moving when fully blocked).
3. Apply the resulting destination to the push / state update.

## Line test (observed)

The client delegates to the area’s walk/collision model: walkable segment clipping, non-walkable polygon tests, and a walk hit structure that can return the first hit point when the segment is blocked.

## KotOR.js

- `bIgnoreTestDirectLine` from the effect; when false, test the segment.
- Obstacles: walkmesh faces where `!face.walk`.
- `testDirectLineObstacles(start, end)` returns `{ clear, hitPoint? }` and clamps the destination when needed.
