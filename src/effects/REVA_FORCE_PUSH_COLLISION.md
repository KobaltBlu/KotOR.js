# Reva: Force Push Direct Line / Obstacle Collision

## Overview

When Force Push is applied, the original engine tests whether a direct line from the creature to the push destination is blocked by world obstacles. If blocked, the destination is clamped to the hit point (or the creature does not move). This only runs when `bIgnoreTestDirectLine` is false.

## Reva Reference: OnApplyForcePush

**Binary:** k1_win_gog_swkotor.exe  
**Address:** 0x004e3800  
**Signature:** `int CSWSEffectListHandler::OnApplyForcePush(CSWSObject *param_1, CGameEffect *param_2)`

### Effect Parameters

- **GetInteger(param_2, 0)** = bIsForcePushedTargeted (0 = untargeted/directional, 1 = targeted)
- **GetInteger(param_2, 1)** = bIgnoreTestDirectLine (0 = test obstacles, 1 = skip)
- **GetFloat(param_2, 0|1|2)** = target location X,Y,Z (when targeted)
- **GetFloat(param_2, 3)** = push distance (default 5.0 if 0)

### Logic Summary

1. Compute direction from source (creator or target location) to creature, normalize.
2. Compute destination: start + direction * distance.
3. **When iVar8 == 0** (i.e. bIgnoreTestDirectLine is false):
   - Call `CServerExoApp::TestDirectLine(server, creature_id, area_resref, start_pos, &end_x, &end_y, height, 1, &CWalkHitInfo)`
   - TestDirectLine returns: 1 = clear path, 0 = blocked
   - If blocked (iVar5 != 1): use CWalkHitInfo hit point; when iVar5 == 0 additionally overwrite with start (no move when fully blocked).
4. Use final destination for the SetState / push path.

## Reva Reference: TestDirectLine

**CServerExoApp::TestDirectLine** (0x004aee80) forwards to **CSWSArea::TestDirectLine** (0x004bcb70).

**CSWSArea::TestDirectLine** signature:
```c
undefined4 CSWSArea::TestDirectLine(CSWSArea *this, Vector *start_, Vector *end_, Vector *param_3, float param_4, int param_5, CWalkHitInfo *param_6)
```

### Internal Steps

1. Get room at start position.
2. **ClippedLineSegmentWalkable** – clip line segment to walkable region.
3. **NoNonWalkPolysOnRoom** – check that the segment does not cross non-walk polygons; fills CWalkHitInfo on hit.
4. **NoNonWalkPolysDetailed** – detailed non-walk poly test.
5. Returns: 1 = clear, 0 = blocked (geometry), -1/-2 = other block.

### CWalkHitInfo

- `field1_0x4` (Vector) – hit point when the line intersects an obstacle.

## KotOR.js Mapping

- **bIgnoreTestDirectLine** = `getInt(1)`; when false, we must test the line.
- **Obstacles** = walkmesh faces where `!face.walk` (non-walkable polygons).
- **Test** = raycast from creature position to destination; if any obstacle face is hit along the segment, clamp destination to the closest hit point.
- **Implementation** = `testDirectLineObstacles(start, end)` returning `{ clear: boolean, hitPoint?: Vector3 }`.
