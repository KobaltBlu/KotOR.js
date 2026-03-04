# Reva: Door Interact Side Detection

## Overview

The original KotOR/TSL engine determines which side of a door the interacting creature is on using a dot product between the door's orientation and the vector from door to creature. This drives `opening1` vs `opening2` animations for swinging doors (e.g., Kashyyyk doors).

## Reva Reference: CSWSDoor::OpenDoor

**Binary:** k1_win_gog_swkotor.exe  
**Address:** 0x00589c70  
**Signature:** `void __thiscall CSWSDoor::OpenDoor(CSWSDoor *this, ulong param_1)`

### Decompiled Logic

```c
bVar5 = 2;  // Default: SIDE_2 (open state 2)
pCVar1 = CServerExoApp::GetGameObject(AppManager->server, param_1);
if (pCVar1 != (CGameObject *)0x0) {
  pCVar2 = (*pCVar1->vtable->AsSWSObject)(pCVar1);
  // Dot product: (creature_pos - door_pos) · door_orientation
  if (float_0_0 <
      ((pCVar2->position).x - (this->object).position.x) * (this->object).orientation.x +
      ((pCVar2->position).y - (this->object).position.y) * (this->object).orientation.y +
      ((pCVar2->position).z - (this->object).position.z) * (this->object).orientation.z) {
    bVar5 = 1;  // SIDE_1 (open state 1) when dot > 0
  }
}
this->field46_0x31c = param_1;
SetOpenState(this, bVar5, 1);
```

### Callers

- **EventHandler** @ 0x0058c475 – `OpenDoor(this, param_2)` on door open event
- **AIActionUnlockObject** @ 0x0057e0a3, 0x0057e24e, 0x0057e530 – when AI unlocks and opens
- **OnApplyDamage** @ 0x004e05c5 – when damage opens the door (e.g., breaking it)

## Reva Reference: CSWSDoor::SetOpenState

**Address:** 0x00589600  
**Signature:** `void __thiscall CSWSDoor::SetOpenState(CSWSDoor *this, byte param_1, int param_2)`

`param_1` values map to:
- 0 = CLOSED (0x2726)
- 1 = OPEN1 (0x2742) – opening/opened animation 1
- 2 = OPEN2 (0x2743) – opening/opened animation 2
- 3 = DESTROYED (0x2758)

## Reva Reference: CSWSObject Structure

**Structure:** CSWSObject (offset from CGameObject base)
- `position`: Vector @ +0x90 (144)
- `orientation`: Vector @ +0x9C (156)

Orientation is the facing direction (forward vector). KotOR.js derives this via `getRotationFromBearing()` from `rotation.z` (bearing) as `(cos(θ), sin(θ), 0)`.

## KotOR.js Implementation

`ModuleDoor.detectInteractSide(object)` implements this 1:1:

1. Resolve interactor: `object` if valid and not `this`, else `combatData.lastDamager` (for destroy by damage).
2. Compute orientation: `this.getRotationFromBearing()` → `(cos θ, sin θ, 0)`.
3. Dot product: `(interactor_pos - door_pos) · orientation`.
4. Return `SIDE_1` if dot > 0, else `SIDE_2`.

Used in:
- `openDoor(object)` – creature opening the door
- `destroyDoor(object)` – when destroyed, uses `lastDamager` when `object === this`
