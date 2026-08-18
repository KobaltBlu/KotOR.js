/**
 * File types that can pick a default editor in Settings.
 *
 * @file fileTypeEditorCatalog.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { DefaultEditorKind } from "@/apps/forge/settings/forgeSettings";

export interface FileTypeEditorEntry {
  ext: string;
  label: string;
  editors: DefaultEditorKind[];
}

export interface FileTypeEditorGroup {
  id: string;
  label: string;
  entries: FileTypeEditorEntry[];
}

export const FILE_TYPE_EDITOR_GROUPS: FileTypeEditorGroup[] = [
  {
    id: "blueprints",
    label: "Blueprints",
    entries: [
      { ext: "utc", label: "Creature (UTC)", editors: ["native", "gff", "hex"] },
      { ext: "utd", label: "Door (UTD)", editors: ["native", "gff", "hex"] },
      { ext: "ute", label: "Encounter (UTE)", editors: ["native", "gff", "hex"] },
      { ext: "uti", label: "Item (UTI)", editors: ["native", "gff", "hex"] },
      { ext: "utm", label: "Merchant (UTM)", editors: ["native", "gff", "hex"] },
      { ext: "utp", label: "Placeable (UTP)", editors: ["native", "gff", "hex"] },
      { ext: "uts", label: "Sound (UTS)", editors: ["native", "gff", "hex"] },
      { ext: "utt", label: "Trigger (UTT)", editors: ["native", "gff", "hex"] },
      { ext: "utw", label: "Waypoint (UTW)", editors: ["native", "gff", "hex"] },
    ],
  },
  {
    id: "modules",
    label: "Modules",
    entries: [
      { ext: "are", label: "Area (ARE)", editors: ["native", "hex", "text"] },
      { ext: "git", label: "Area instances (GIT)", editors: ["native", "hex", "text"] },
      { ext: "ifo", label: "Module info (IFO)", editors: ["native", "hex", "text"] },
      { ext: "dlg", label: "Dialogue (DLG)", editors: ["native", "gff", "hex"] },
      { ext: "jrl", label: "Journal (JRL)", editors: ["native", "hex", "text"] },
      { ext: "fac", label: "Faction (FAC)", editors: ["native", "hex", "text"] },
      { ext: "bic", label: "Character (BIC)", editors: ["native", "hex", "text"] },
      { ext: "res", label: "Generic GFF (RES)", editors: ["native", "hex", "text"] },
      { ext: "pth", label: "Path (PTH)", editors: ["native", "gff", "hex"] },
      { ext: "gui", label: "GUI (GUI)", editors: ["native", "gff", "hex"] },
    ],
  },
  {
    id: "tables",
    label: "Tables",
    entries: [
      { ext: "2da", label: "2DA table", editors: ["native", "hex", "text"] },
      { ext: "tlk", label: "Talk table (TLK)", editors: ["native", "hex"] },
      { ext: "ssf", label: "Sound set (SSF)", editors: ["native", "hex"] },
    ],
  },
  {
    id: "scripts",
    label: "Scripts",
    entries: [
      { ext: "nss", label: "NWScript source (NSS)", editors: ["native", "hex"] },
      { ext: "ncs", label: "Compiled script (NCS)", editors: ["native", "hex"] },
    ],
  },
  {
    id: "models",
    label: "Models",
    entries: [
      { ext: "mdl", label: "Model (MDL)", editors: ["native", "hex"] },
      { ext: "mdx", label: "Model extras (MDX)", editors: ["native", "hex"] },
      { ext: "wok", label: "Walkmesh (WOK)", editors: ["native", "hex"] },
      { ext: "pwk", label: "Placeable walkmesh (PWK)", editors: ["native", "hex"] },
      { ext: "dwk", label: "Door walkmesh (DWK)", editors: ["native", "hex"] },
    ],
  },
  {
    id: "media",
    label: "Media",
    entries: [
      { ext: "tpc", label: "TPC texture", editors: ["native", "hex"] },
      { ext: "tga", label: "TGA image", editors: ["native", "hex"] },
      { ext: "png", label: "PNG image", editors: ["native", "hex"] },
      { ext: "jpg", label: "JPEG image", editors: ["native", "hex"] },
      { ext: "psd", label: "Photoshop document (PSD)", editors: ["native", "hex"] },
      { ext: "wav", label: "WAV audio", editors: ["native", "hex"] },
      { ext: "mp3", label: "MP3 audio", editors: ["native", "hex"] },
      { ext: "bik", label: "Bink video (BIK)", editors: ["native", "hex"] },
    ],
  },
  {
    id: "archives",
    label: "Archives",
    entries: [
      { ext: "erf", label: "ERF archive", editors: ["native", "hex"] },
      { ext: "mod", label: "Module archive (MOD)", editors: ["native", "hex"] },
      { ext: "sav", label: "Save archive (SAV)", editors: ["native", "hex"] },
    ],
  },
  {
    id: "misc",
    label: "Other",
    entries: [
      { ext: "lyt", label: "Layout (LYT)", editors: ["native", "hex", "text"] },
      { ext: "vis", label: "Visibility (VIS)", editors: ["native", "hex"] },
      { ext: "txi", label: "Texture info (TXI)", editors: ["native", "hex"] },
      { ext: "txt", label: "Text (TXT)", editors: ["native", "hex"] },
      { ext: "lip", label: "Lipsync (LIP)", editors: ["native", "hex"] },
    ],
  },
];

export function findFileTypeEditorEntry(ext: string): FileTypeEditorEntry | undefined {
  const key = (ext || "").toLowerCase();
  for (let i = 0; i < FILE_TYPE_EDITOR_GROUPS.length; i++) {
    const group = FILE_TYPE_EDITOR_GROUPS[i];
    for (let j = 0; j < group.entries.length; j++) {
      if (group.entries[j].ext === key) {
        return group.entries[j];
      }
    }
  }
  return undefined;
}
