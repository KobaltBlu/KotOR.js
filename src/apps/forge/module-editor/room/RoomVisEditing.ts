/**
 * Room / VIS authoring helpers for the module scene.
 *
 * @file RoomVisEditing.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { ForgeArea } from "@/apps/forge/module-editor/ForgeArea";
import type { ForgeRoom } from "@/apps/forge/module-editor/ForgeRoom";

export interface RoomVisLink {
  from: string;
  to: string;
}

export interface RoomVisDiagnostic {
  roomName: string;
  linkedCount: number;
  missingInVis: string[];
  orphanVisLinks: string[];
}

/**
 * Collect directed room visibility links currently loaded on the area.
 */
export function collectRoomVisLinks(area: ForgeArea | undefined): RoomVisLink[] {
  if (!area?.rooms?.length) {
    return [];
  }
  const links: RoomVisLink[] = [];
  for (const room of area.rooms) {
    const linked = (room as ForgeRoom).linkedRooms;
    if (!linked) continue;
    for (const [name] of linked) {
      links.push({ from: room.roomName, to: name });
    }
  }
  return links;
}

/**
 * Produce per-room connectivity diagnostics for PTH/VIS authoring.
 */
export function diagnoseRoomVisibility(area: ForgeArea | undefined): RoomVisDiagnostic[] {
  if (!area?.rooms?.length) {
    return [];
  }
  const names = new Set(area.rooms.map((room) => room.roomName.toLowerCase()));
  return area.rooms.map((room) => {
    const linked = Array.from(((room as ForgeRoom).linkedRooms || new Map()).keys());
    const missingInVis = linked.filter((name) => !names.has(String(name).toLowerCase()));
    return {
      roomName: room.roomName,
      linkedCount: linked.length,
      missingInVis,
      orphanVisLinks: [] as string[],
    };
  });
}

/**
 * Build a simple VIS adjacency list text for diff / export preview.
 */
export function formatVisAdjacency(area: ForgeArea | undefined): string {
  const links = collectRoomVisLinks(area);
  const byFrom = new Map<string, string[]>();
  for (const link of links) {
    const list = byFrom.get(link.from) || [];
    list.push(link.to);
    byFrom.set(link.from, list);
  }
  const lines: string[] = [];
  for (const [from, tos] of byFrom) {
    lines.push(`${from}: ${tos.sort().join(", ")}`);
  }
  return lines.sort().join("\n");
}
