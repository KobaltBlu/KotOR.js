/**
 * First-run Trask Ulgo tour step script.
 *
 * @file traskTourSteps.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { TraskFrameId } from "@/apps/forge/tutorial/traskFrames";

export type TraskTourTargetId =
  | "quick-start-actions"
  | "change-game"
  | "explorer-pane"
  | "main-tabs";

export interface TraskTourStep {
  id: string;
  title: string;
  body: string;
  pose: TraskFrameId;
  /** Matches `data-trask-target` on shell / Start Page nodes. */
  target?: TraskTourTargetId;
}

export const TRASK_TOUR_STEPS: TraskTourStep[] = [
  {
    id: "welcome",
    title: "Ensign Trask Ulgo",
    body:
      "Welcome aboard, citizen. I'm Ensign Trask Ulgo of the Republic Fleet — assigned to help you find your footing in Forge. Stick with me for a short briefing, then you're free to make your own course.",
    pose: "smile",
  },
  {
    id: "start-page",
    title: "Start Page",
    body:
      "This is your Start Page. From here you can open a single resource, create a new project, or open an existing project folder. Recent files and projects will list here as you work.",
    pose: "speaking",
    target: "quick-start-actions",
  },
  {
    id: "game-directory",
    title: "Game directory",
    body:
      "Forge needs a KotOR or TSL install to fill the Resource Explorer. Bind your game directory from File → Load Game Data, or Change Game when you need to switch profiles. The status bar shows whether you're online with game data.",
    pose: "serious",
    target: "change-game",
  },
  {
    id: "explorers",
    title: "Explorers",
    body:
      "The west pane holds your explorers — game resources from the install, and project files from your mod. Toggle it from View → Explorer if you need more room for editors.",
    pose: "thinking",
    target: "explorer-pane",
  },
  {
    id: "editors",
    title: "Editors & command palette",
    body:
      "Open a file and it lands in a tabbed editor up here. Blueprints, dialogs, 2DAs, scripts, models — Forge routes each type to the right tool. Press Ctrl+Shift+P for the command palette when you need a shortcut.",
    pose: "speaking",
    target: "main-tabs",
  },
  {
    id: "finish",
    title: "You're cleared for launch",
    body:
      "That's the gist of it. Themes and other prefs live under Settings. I'll stand down for now — if you want this briefing again, open Settings → General and replay Trask's introduction. May the Force serve you well.",
    pose: "happy",
  },
];

export function getTraskTourStepCount(): number {
  return TRASK_TOUR_STEPS.length;
}

export function getTraskTourStep(index: number): TraskTourStep | undefined {
  if (index < 0 || index >= TRASK_TOUR_STEPS.length) {
    return undefined;
  }
  return TRASK_TOUR_STEPS[index];
}

export function traskTourTargetSelector(target: TraskTourTargetId): string {
  return `[data-trask-target="${target}"]`;
}
