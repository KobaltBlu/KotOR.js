/**
 * MDL ASCII (MDLOps-style) read/write for KotOR.
 * Minimal parser and writer for roundtrip of model header + dummy node hierarchy.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * @file MDLAsciiIO.ts
 * @license GPL-3.0
 */

import { MDL, MDLNode } from '@/resource/MDLData';
import { MDLClassification, MDLNodeType } from '@/resource/MDLTypes';

function parseFloatRobust(s: string): number {
  const v = s.trim().toLowerCase();
  if (v.includes('qnan') || v === 'nan' || v === '-nan' || v === '+nan') return NaN;
  if (v.includes('inf')) return v.startsWith('-') ? -Infinity : Infinity;
  return parseFloat(s);
}

function classificationFromString(s: string): MDLClassification {
  const key = s.trim().toUpperCase().replace(/-/g, '_');
  const map: Record<string, MDLClassification> = {
    INVALID: MDLClassification.Invalid,
    EFFECT: MDLClassification.Effect,
    TILE: MDLClassification.Tile,
    CHARACTER: MDLClassification.Character,
    DOOR: MDLClassification.Door,
    PLACEABLE: MDLClassification.Placeable,
    OTHER: MDLClassification.Other,
    GUI: MDLClassification.Gui,
    ITEM: MDLClassification.Item,
    LIGHTSABER: MDLClassification.Lightsaber,
    WAYPOINT: MDLClassification.Waypoint,
    WEAPON: MDLClassification.Weapon,
    FURNITURE: MDLClassification.Furniture,
  };
  return map[key] ?? MDLClassification.Other;
}

function classificationToString(c: MDLClassification): string {
  const names: Record<MDLClassification, string> = {
    [MDLClassification.Invalid]: 'invalid',
    [MDLClassification.Effect]: 'effect',
    [MDLClassification.Tile]: 'tile',
    [MDLClassification.Character]: 'character',
    [MDLClassification.Door]: 'door',
    [MDLClassification.Placeable]: 'placeable',
    [MDLClassification.Other]: 'other',
    [MDLClassification.Gui]: 'gui',
    [MDLClassification.Item]: 'item',
    [MDLClassification.Lightsaber]: 'lightsaber',
    [MDLClassification.Waypoint]: 'waypoint',
    [MDLClassification.Weapon]: 'weapon',
    [MDLClassification.Furniture]: 'furniture',
  };
  return names[c] ?? 'other';
}

/**
 * Parses minimal ASCII MDL (MDLOps-style): newmodel, setsupermodel, classification,
 * ignorefog, setanimationscale, beginmodelgeom with bmin/bmax/radius and node dummy {...}, endmodelgeom, donemodel.
 */
export function readMDLFromAsciiBuffer(buffer: Uint8Array): MDL {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const lines = text.split(/\r?\n/);
  const mdl = new MDL();
  mdl.name = '';
  mdl.supermodel = '';
  mdl.fog = false;
  mdl.classification = MDLClassification.Other;
  mdl.classificationUnk1 = 0;
  mdl.animationScale = 0.971;
  mdl.bmin = { x: -5, y: -5, z: -1 };
  mdl.bmax = { x: 5, y: 5, z: 10 };
  mdl.radius = 7;
  mdl.compressQuaternions = 0;

  let inGeometry = false;
  let inNode = false;
  let currentNode: MDLNode | null = null;
  const nodes: MDLNode[] = [];
  const nodeIndex: Record<string, number> = { null: -1 };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === 'newmodel' && parts.length >= 2) {
      mdl.name = parts[1];
      continue;
    }
    if (cmd === 'setsupermodel' && parts.length >= 3) {
      mdl.supermodel = parts[2];
      continue;
    }
    if (cmd === 'classification' && parts.length >= 2) {
      mdl.classification = classificationFromString(parts[1]);
      continue;
    }
    if (cmd === 'classification_unk1' && parts.length >= 2) {
      mdl.classificationUnk1 = parseInt(parts[1], 10) || 0;
      continue;
    }
    if (cmd === 'ignorefog' && parts.length >= 2) {
      mdl.fog = parseInt(parts[1], 10) === 0;
      continue;
    }
    if (cmd === 'compress_quaternions' && parts.length >= 2) {
      mdl.compressQuaternions = parseInt(parts[1], 10) || 0;
      continue;
    }
    if (cmd === 'setanimationscale' && parts.length >= 2) {
      mdl.animationScale = parseFloatRobust(parts[1]) || 0.971;
      continue;
    }
    if (trimmed.toLowerCase().startsWith('beginmodelgeom')) {
      inGeometry = true;
      continue;
    }
    if (trimmed.toLowerCase().startsWith('endmodelgeom')) {
      inGeometry = false;
      continue;
    }
    if (trimmed.toLowerCase().startsWith('donemodel')) {
      break;
    }

    if (inNode && currentNode) {
      if (trimmed === '}' || cmd === 'endnode') {
        inNode = false;
        currentNode = null;
        continue;
      }
      if (cmd === 'parent' && parts.length >= 2) {
        // Store parent name for hierarchy build; root uses NULL
        (currentNode as MDLNode & { _parentName?: string })._parentName = parts[1];
        continue;
      }
      if (cmd === 'position' && parts.length >= 4) {
        currentNode.position = {
          x: parseFloatRobust(parts[1]),
          y: parseFloatRobust(parts[2]),
          z: parseFloatRobust(parts[3]),
        };
        continue;
      }
      if (cmd === 'orientation' && parts.length >= 5) {
        currentNode.orientation = {
          x: parseFloatRobust(parts[1]),
          y: parseFloatRobust(parts[2]),
          z: parseFloatRobust(parts[3]),
          w: parseFloatRobust(parts[4]),
        };
        continue;
      }
      continue;
    }

    if (inGeometry && /^\s*node\s+\S+\s+\S+/.test(line)) {
      const match = line.match(/\s*node\s+(\S+)\s+(\S+)/i);
      if (match) {
        const typeStr = match[1].toLowerCase();
        const nodeName = match[2];
        const node = new MDLNode();
        node.name = nodeName;
        node.nodeId = nodes.length;
        node.parentId = -1;
        node.nodeType = typeStr === 'dummy' ? MDLNodeType.Dummy : MDLNodeType.Dummy;
        nodes.push(node);
        nodeIndex[nodeName.toLowerCase()] = nodes.length - 1;
        currentNode = node;
        inNode = true;
      }
      continue;
    }

    if (inGeometry && !inNode) {
      if (cmd === 'bmin' && parts.length >= 4) {
        mdl.bmin = {
          x: parseFloatRobust(parts[1]),
          y: parseFloatRobust(parts[2]),
          z: parseFloatRobust(parts[3]),
        };
        continue;
      }
      if (cmd === 'bmax' && parts.length >= 4) {
        mdl.bmax = {
          x: parseFloatRobust(parts[1]),
          y: parseFloatRobust(parts[2]),
          z: parseFloatRobust(parts[3]),
        };
        continue;
      }
      if (cmd === 'radius' && parts.length >= 2) {
        mdl.radius = parseFloatRobust(parts[1]);
        continue;
      }
    }
  }

  // Build hierarchy: assign parentId and children
  for (const n of nodes) {
    const parentName = (n as MDLNode & { _parentName?: string })._parentName;
    if (parentName && parentName.toLowerCase() !== 'null') {
      const idx = nodeIndex[parentName.toLowerCase()];
      if (idx !== undefined && idx >= 0) {
        n.parentId = idx;
        nodes[idx].children.push(n);
      }
    }
    delete (n as MDLNode & { _parentName?: string })._parentName;
  }
  const root = nodes.find((n) => n.parentId < 0);
  mdl.root = root ?? (nodes.length > 0 ? nodes[0] : new MDLNode());
  return mdl;
}

function fmt(n: number): string {
  if (Number.isNaN(n) || !Number.isFinite(n)) return String(n);
  return ` ${n}`;
}

/**
 * Writes minimal ASCII MDL (MDLOps-style) so that readMDLFromAsciiBuffer( writeMDLToAsciiBuffer(mdl) ) roundtrips.
 */
export function writeMDLToAsciiBuffer(mdl: MDL): Uint8Array {
  const lines: string[] = [];
  lines.push('# ASCII MDL');
  lines.push(`filedependancy ${mdl.name} NULL.mlk`);
  lines.push(`newmodel ${mdl.name}`);
  lines.push('');
  lines.push(`setsupermodel ${mdl.name} ${mdl.supermodel || ''}`);
  lines.push(`classification ${classificationToString(mdl.classification)}`);
  lines.push(`classification_unk1 ${mdl.classificationUnk1}`);
  lines.push(`ignorefog ${mdl.fog ? 0 : 1}`);
  lines.push(`compress_quaternions ${mdl.compressQuaternions}`);
  lines.push('');
  lines.push(`setanimationscale ${fmt(mdl.animationScale)}`);
  lines.push('');
  lines.push(`beginmodelgeom ${mdl.name}`);
  lines.push(`  bmin${fmt(mdl.bmin.x)}${fmt(mdl.bmin.y)}${fmt(mdl.bmin.z)}`);
  lines.push(`  bmax${fmt(mdl.bmax.x)}${fmt(mdl.bmax.y)}${fmt(mdl.bmax.z)}`);
  lines.push(`  radius${fmt(mdl.radius)}`);
  writeNodeAscii(lines, 1, mdl.root);
  lines.push('endmodelgeom ' + mdl.name);
  lines.push('');
  lines.push('donemodel ' + mdl.name);

  const str = lines.join('\n');
  return new TextEncoder().encode(str);
}

function writeNodeAscii(lines: string[], indent: number, node: MDLNode): void {
  const pad = '  '.repeat(indent);
  lines.push(`${pad}node dummy ${node.name}`);
  lines.push(`${pad}{`);
  lines.push(`${pad}  parent NULL`);
  lines.push(`${pad}  position${fmt(node.position.x)}${fmt(node.position.y)}${fmt(node.position.z)}`);
  lines.push(
    `${pad}  orientation${fmt(node.orientation.x)}${fmt(node.orientation.y)}${fmt(node.orientation.z)}${fmt(node.orientation.w)}`
  );
  lines.push(`${pad}}`);
  for (const child of node.children) {
    writeNodeAscii(lines, indent, child);
  }
}
