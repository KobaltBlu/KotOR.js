import * as THREE from "three";
import { GameState } from "@engine/runtime/GameState";
import type { SceneMapPin } from "@engine/debug/inspect/runtimeSnapshots";
import { OVERVIEW_PARTY_RING, OVERVIEW_PC_COLOR } from "@engine/debug/inspect/runtimeSnapshots";

const MARKER_GROUP_NAME = 'scene_overview_markers';

type MarkerBundle = {
  root: THREE.Group;
  disc: THREE.Mesh;
  ring?: THREE.Mesh;
  cross?: THREE.LineSegments;
};

let markerGroup: THREE.Group | null = null;
const meshById = new Map<string, MarkerBundle>();

function ensureGroup(): THREE.Group | null {
  const scene = GameState.scene;
  if(!scene){ return null; }
  if(markerGroup && markerGroup.parent === scene){
    return markerGroup;
  }
  if(markerGroup){
    markerGroup.removeFromParent();
    disposeGroupContents(markerGroup);
  }
  markerGroup = new THREE.Group();
  markerGroup.name = MARKER_GROUP_NAME;
  scene.add(markerGroup);
  return markerGroup;
}

function disposeMesh(mesh: THREE.Object3D){
  if(mesh instanceof THREE.Mesh){
    mesh.geometry?.dispose?.();
    const mat = mesh.material as THREE.Material | THREE.Material[];
    if(Array.isArray(mat)){ mat.forEach((m) => m.dispose?.()); }
    else mat?.dispose?.();
  }else if(mesh instanceof THREE.LineSegments){
    mesh.geometry?.dispose?.();
    (mesh.material as THREE.Material)?.dispose?.();
  }
}

function disposeBundle(bundle: MarkerBundle){
  bundle.root.removeFromParent();
  for(const child of [...bundle.root.children]){
    bundle.root.remove(child);
    disposeMesh(child);
  }
}

function disposeGroupContents(group: THREE.Group){
  while(group.children.length){
    const child = group.children[0];
    group.remove(child);
    disposeMesh(child);
    child.traverse((n) => disposeMesh(n));
  }
}

function makeDisc(color: string, radius: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 10;
  return mesh;
}

function makeRing(color: string, inner: number, outer: number): THREE.Mesh {
  const geo = new THREE.RingGeometry(inner, outer, 28);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 11;
  return mesh;
}

function makeCross(color: string, size: number): THREE.LineSegments {
  const positions = new Float32Array([
    -size, 0, 0, size, 0, 0,
    0, 0, -size, 0, 0, size,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  const line = new THREE.LineSegments(geo, mat);
  line.renderOrder = 12;
  return line;
}

function makeBundle(entry: SceneMapPin): MarkerBundle {
  const root = new THREE.Group();
  if(entry.isPlayer){
    const disc = makeDisc(OVERVIEW_PC_COLOR, 0.7);
    const ring = makeRing('#ffffff', 0.75, 0.95);
    const cross = makeCross(OVERVIEW_PC_COLOR, 1.1);
    root.add(disc, ring, cross);
    return { root, disc, ring, cross };
  }
  if(entry.isParty || entry.kind === 'party'){
    const disc = makeDisc(entry.color, 0.55);
    const ring = makeRing(OVERVIEW_PARTY_RING, 0.6, 0.78);
    root.add(disc, ring);
    return { root, disc, ring };
  }
  const disc = makeDisc(entry.color, 0.4);
  root.add(disc);
  return { root, disc };
}

export function syncWorldMarkers(
  entries: SceneMapPin[],
  enabled: boolean,
  selectedId: string | null
){
  if(!enabled){
    clearWorldMarkers();
    return;
  }
  const group = ensureGroup();
  if(!group){ return; }

  const seen = new Set<string>();
  for(const e of entries){
    seen.add(e.id);
    let bundle = meshById.get(e.id);
    const wantsPlayer = e.isPlayer;
    const wantsParty = !wantsPlayer && (e.isParty || e.kind === 'party');
    const hasPlayer = !!(bundle?.cross);
    const hasParty = !!(bundle?.ring) && !bundle?.cross;
    const shapeMismatch =
      !bundle ||
      (wantsPlayer && !hasPlayer) ||
      (wantsParty && !hasParty) ||
      (!wantsPlayer && !wantsParty && (hasPlayer || hasParty));

    if(shapeMismatch){
      if(bundle){
        disposeBundle(bundle);
        meshById.delete(e.id);
      }
      bundle = makeBundle(e);
      meshById.set(e.id, bundle);
      group.add(bundle.root);
    }

    const mat = bundle!.disc.material as THREE.MeshBasicMaterial;
    mat.color.set(e.isPlayer ? OVERVIEW_PC_COLOR : e.color);
    mat.opacity = e.id === selectedId ? 1 : (e.isPlayer || e.isParty ? 0.9 : 0.55);

    let scale = 1;
    if(e.isPlayer){ scale = 1.35; }
    else if(e.isParty || e.kind === 'party'){ scale = 1.15; }
    if(e.id === selectedId){ scale *= 1.2; }
    bundle!.root.scale.set(scale, scale, scale);
    bundle!.root.position.set(e.x, e.y, e.z + 0.05);
    bundle!.root.renderOrder = e.isPlayer ? 30 : (e.isParty ? 20 : 10);
  }

  for(const [id, bundle] of meshById){
    if(!seen.has(id)){
      disposeBundle(bundle);
      meshById.delete(id);
    }
  }
}

export function clearWorldMarkers(){
  for(const bundle of meshById.values()){
    disposeBundle(bundle);
  }
  meshById.clear();
  if(markerGroup){
    markerGroup.removeFromParent();
    disposeGroupContents(markerGroup);
    markerGroup = null;
  }
}
