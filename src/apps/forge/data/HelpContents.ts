/**
 * Help contents and topic URLs for Forge (aligned with Holocron Toolset help structure).
 * Maps topic names to wiki/documentation URLs. Used for Help menu and onboarding.
 */
import { WIKI_BASE_URL } from "./EditorWikiMapping";

export interface HelpDocument {
  name: string;
  file: string;
  url?: string;
}

export interface HelpFolder {
  name: string;
  documents: HelpDocument[];
}

function doc(name: string, file: string): HelpDocument {
  return { name, file, url: `${WIKI_BASE_URL}${file.replace(/\s/g, "-")}` };
}

/** URL for the in-repo Getting Started markdown (opened from Help Browser). */
export const GETTING_STARTED_BLOB_URL =
  "https://github.com/KobaltBlu/KotOR.js/blob/master/src/apps/forge/help/getting-started.md";

/** Introduction and getting started (Holocron-aligned section names). */
export const HELP_INTRODUCTION: HelpFolder = {
  name: "Introduction",
  documents: [
    { name: "Getting Started", file: "getting-started.md", url: GETTING_STARTED_BLOB_URL },
    doc("Core Resources", "introduction2-coreResources.md"),
    doc("Module Resources", "introduction3-moduleResources.md"),
    doc("Override Resources", "introduction4-overrideResources.md"),
  ],
};

/** Tools (Module Editor, Map Builder). */
export const HELP_TOOLS: HelpFolder = {
  name: "Tools",
  documents: [
    doc("Module Editor", "tools/1-moduleEditor.md"),
    doc("Map Builder", "tools/2-mapBuilder.md"),
  ],
};

/** Tutorials. */
export const HELP_TUTORIALS: HelpFolder = {
  name: "Tutorials",
  documents: [
    doc("Creating Custom Robes", "tutorials/1-creatingCustomRobes.md"),
    doc("Creating a New Store", "tutorials/2-creatingANewStore.md"),
    doc("Area Transitions", "tutorials/3-areaTransition.md"),
    doc("Creating Static Cameras", "tutorials/4-creatingStaticCameras.md"),
  ],
};

export const HELP_FOLDERS: HelpFolder[] = [
  HELP_INTRODUCTION,
  HELP_TOOLS,
  HELP_TUTORIALS,
];

export function getHelpDocUrl(file: string): string {
  return `${WIKI_BASE_URL}${file.replace(/\s/g, "-")}`;
}
