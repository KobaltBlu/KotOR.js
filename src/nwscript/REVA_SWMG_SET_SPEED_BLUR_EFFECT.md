# SWMG_SetSpeedBlurEffect (observed original game behavior)

## Overview

`SWMG_SetSpeedBlurEffect` enables or disables the speed (motion) blur post-process and can set the frame accumulation ratio. The client toggles a global “speed blur enabled” flag, sets the accumulation ratio when provided, and the motion-blur pass uses that ratio (default about 0.75 when the engine applies its default in the related path).

## NWScript

`void SWMG_SetSpeedBlurEffect(int bEnabled, float fRatio = 0.75f);`

- `bEnabled`: non-zero turns the effect on, zero turns it off.
- Optional `fRatio`: when present, sets the accumulation ratio used by the motion-blur update.

## KotOR.js

- `enableSpeedBlur` → `AfterimagePass.enabled`
- `accumulationRatio` → `AfterimagePass` uniform `damp` (higher = stronger ghosting)
- `AfterimagePass` is chained in the effect composer when initialized
