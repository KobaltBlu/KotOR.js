/**
 * Module-editor task tour steps (import → place → validate → preview → export).
 *
 * @file moduleEditorTourSteps.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { TraskTourStep } from "@/apps/forge/tutorial/traskTourSteps";

export const MODULE_EDITOR_TOUR_STEPS: TraskTourStep[] = [
  {
    id: "module-workbench",
    title: "Module workbench",
    body:
      "This is your Odyssey module workbench. Hierarchy and Assets live on the west, the Scene viewport in the center, and the Inspector on the east. Problems and Output sit along the south edge when enabled.",
    pose: "speaking",
  },
  {
    id: "module-place",
    title: "Place objects",
    body:
      "Drag a blueprint from Assets into the viewport, or use Place mode. Ghost placement respects walkmesh when available. Rotate before place with the toolbar, then click to stamp.",
    pose: "thinking",
  },
  {
    id: "module-edit",
    title: "Select and transform",
    body:
      "Use Select / Move / Rotate tools (Q/W/E). Marquee-select in Select mode, then edit shared properties in the Inspector. KotOR yaw and walkmesh constraints stay enforced.",
    pose: "serious",
  },
  {
    id: "module-validate",
    title: "Validate before export",
    body:
      "Run Validate from the viewport toolbar or command palette. The Problems panel lists missing ResRefs, duplicate tags, and LYT/VIS issues. Fatal errors gate export; warnings do not.",
    pose: "speaking",
  },
  {
    id: "module-preview",
    title: "Preview and iterate",
    body:
      "Launch playable preview from the entry point, camera, or a waypoint. Use incremental reload after script or blueprint edits to keep iteration fast.",
    pose: "happy",
  },
];
