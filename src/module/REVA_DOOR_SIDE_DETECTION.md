# Door interact side detection (observed original game behavior)

## Overview

The original KotOR/TSL client determines which side of a door the interacting creature is on using a dot product between the door's orientation and the vector from door to creature. That choice drives `opening1` versus `opening2` animations for swinging doors (for example, Kashyyyk-style doors).

## Door open and open state

When a door opens, the client resolves the interactor’s world position, forms the dot product `(creature_pos - door_pos) · door_orientation`, and chooses open state 1 or 2 from the sign of that product. `SetOpenState` maps the open state to the appropriate closed/open/destroyed presentation using the door’s animation and TLK configuration (closed, first opening, second opening, destroyed).

## KotOR.js

`ModuleDoor.detectInteractSide(object)` implements the same steps:

1. Resolve interactor: `object` if valid and not `this`, else `combatData.lastDamager` (for destroy-by-damage cases).
2. Compute orientation: `this.getRotationFromBearing()` → `(cos θ, sin θ, 0)`.
3. Dot product: `(interactor_pos - door_pos) · orientation`.
4. Return `SIDE_1` if dot &gt; 0, else `SIDE_2`.

Used in `openDoor(object)` and `destroyDoor(object)`.
