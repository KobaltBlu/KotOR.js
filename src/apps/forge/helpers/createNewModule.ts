/**
 * Write a blank one-area module (IFO/ARE/GIT + empty LYT/VIS) into a project.
 *
 * @file createNewModule.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import {
  createUntitledAreGff,
  createUntitledGitGff,
  createUntitledIfoGff,
  normalizeResRef,
} from "@/apps/forge/helpers/createUntitledModuleGff";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { CExoLocString } from "@/resource/CExoLocString";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";

export interface NewModuleRoomSpec {
  roomName: string;
  envAudio?: number;
  ambientScale?: number;
}

export interface WriteNewModuleOptions {
  moduleName: string;
  areaResRef: string;
  rooms?: NewModuleRoomSpec[];
  overwriteExisting?: boolean;
  exists?: (path: string) => Promise<boolean>;
  writeFile: (path: string, data: Uint8Array) => Promise<boolean>;
}

export interface WriteNewModuleResult {
  ok: boolean;
  reason?: string;
  needsOverwrite?: boolean;
  areaResRef: string;
  written: string[];
}

function emptyLytBuffer(rooms: NewModuleRoomSpec[]): Uint8Array {
  const lines = [
    "#MAXLAYOUT ASCII",
    "beginlayout",
    `   roomcount ${rooms.length}`,
  ];
  for (let i = 0; i < rooms.length; i++) {
    lines.push(`      ${rooms[i].roomName} 0 0 0`);
  }
  lines.push("   trackcount 0");
  lines.push("   obstaclecount 0");
  lines.push("   doorhookcount 0");
  lines.push("donelayout");
  return new TextEncoder().encode(lines.join("\n") + "\n");
}

function emptyVisBuffer(rooms: NewModuleRoomSpec[]): Uint8Array {
  let text = "";
  for (let i = 0; i < rooms.length; i++) {
    const name = rooms[i].roomName;
    text += `${name} ${rooms.length}\n`;
    for (let j = 0; j < rooms.length; j++) {
      text += `  ${rooms[j].roomName}\n`;
    }
  }
  return new TextEncoder().encode(text);
}

export async function writeNewModuleFiles(options: WriteNewModuleOptions): Promise<WriteNewModuleResult> {
  const areaResRef = normalizeResRef(options.areaResRef, "new_area");
  const moduleName = String(options.moduleName || areaResRef).trim() || areaResRef;
  const rooms = (options.rooms || []).map((room) => ({
    roomName: normalizeResRef(room.roomName, "room"),
    envAudio: room.envAudio ?? 0,
    ambientScale: room.ambientScale ?? 1,
  })).filter((room) => room.roomName.length > 0);

  const written: string[] = [];
  if (options.exists && !options.overwriteExisting) {
    if (await options.exists("module.ifo")) {
      return { ok: false, needsOverwrite: true, reason: "module.ifo already exists", areaResRef, written };
    }
  }

  const ifo = createUntitledIfoGff(areaResRef);
  const ifoName = ifo.RootNode.getFieldByLabel("Mod_Name");
  if (ifoName) {
    const loc = new CExoLocString(-1);
    loc.addSubString(moduleName, 0);
    ifoName.setCExoLocString(loc);
  }
  const ifoTag = ifo.RootNode.getFieldByLabel("Mod_Tag");
  if (ifoTag) {
    ifoTag.setValue(areaResRef);
  }

  const are = createUntitledAreGff(areaResRef);
  const roomsField = are.RootNode.getFieldByLabel("Rooms");
  if (roomsField) {
    for (let i = 0; i < rooms.length; i++) {
      const roomStruct = new GFFStruct(3);
      roomStruct.addField(new GFFField(GFFDataType.CEXOSTRING, "RoomName", rooms[i].roomName));
      roomStruct.addField(new GFFField(GFFDataType.INT, "EnvAudio", rooms[i].envAudio));
      roomStruct.addField(new GFFField(GFFDataType.FLOAT, "AmbientScale", rooms[i].ambientScale));
      roomsField.addChildStruct(roomStruct);
    }
  }

  const git = createUntitledGitGff();
  const paths: Array<[string, Uint8Array]> = [
    ["module.ifo", ifo.getExportBuffer()],
    [`${areaResRef}.are`, are.getExportBuffer()],
    [`${areaResRef}.git`, git.getExportBuffer()],
    [`${areaResRef}.lyt`, emptyLytBuffer(rooms)],
    [`${areaResRef}.vis`, emptyVisBuffer(rooms)],
  ];

  for (let i = 0; i < paths.length; i++) {
    const [filename, data] = paths[i];
    const ok = await options.writeFile(filename, data);
    if (!ok) {
      return { ok: false, reason: `Failed to write ${filename}`, areaResRef, written };
    }
    written.push(filename);
  }

  return { ok: true, areaResRef, written };
}
