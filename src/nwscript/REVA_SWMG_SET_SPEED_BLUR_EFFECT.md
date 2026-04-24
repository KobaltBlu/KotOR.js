# Reva: SWMG_SetSpeedBlurEffect (ExecuteCommandSWMG_SetSpeedBlurEffect)

## Overview

`ExecuteCommandSWMG_SetSpeedBlurEffect` (0x00543550) turns the speed blur (motion blur) effect on or off and sets the frame accumulation ratio. Reversed from CSWVirtualMachineCommands, AurEnableSpeedBlur, AurDisableSpeedBlur, AurSetSpeedBlurRatio.

## NWScript Signature

```c
void SWMG_SetSpeedBlurEffect(int bEnabled, float fRatio = 0.75f);
// bEnabled: TRUE = on, FALSE = off
// fRatio: frame accumulation ratio (optional, applied only when paramCount > 1)
```

## ExecuteCommandSWMG_SetSpeedBlurEffect Logic

1. StackPopInteger → bEnabled (stored in local_4)
2. If paramCount > 1: StackPopFloat → fRatio, AurSetSpeedBlurRatio(fRatio)
3. If bEnabled == 0: AurDisableSpeedBlur(), return
4. Else: AurEnableSpeedBlur(), return

## AurEnableSpeedBlur (0x0044f0a0)

Sets global `enableSpeedBlur = 1`.

## AurDisableSpeedBlur (0x0044f0b0)

Sets global `enableSpeedBlur = 0`.

## AurSetSpeedBlurRatio (0x0044f130)

Sets global `accumulationRatio = param_1`. Used by UpdateMotionBlur; default 0.75 (0x3f400000) in ApplyMotionBlur.

## KotOR.js Mapping

- enableSpeedBlur → AfterimagePass.enabled
- accumulationRatio → AfterimagePass uniform 'damp' (higher = more ghosting/motion blur)
- AfterimagePass inserted after RenderPass in EffectComposer when initialized
