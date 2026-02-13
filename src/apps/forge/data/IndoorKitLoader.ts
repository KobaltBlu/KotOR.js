import * as fs from "fs";
import * as path from "path";

import * as THREE from "three";

import { Kit, KitComponent, KitComponentHook, KitDoor, MDLMDXTuple } from "./IndoorKit";
import { cloneWalkmeshFromBuffer } from "./IndoorWalkmesh";

const numberRegex = /(\d+)/g;

const getNumbers = (value: string): number[] => {
  const matches = value.matchAll(numberRegex);
  return Array.from(matches, (entry) => Number(entry[1]));
};

/** Parsed kit JSON file shape. */
interface KitJsonShape {
  id?: string;
  name?: string;
  doors?: KitDoorJson[];
  components?: KitComponentJson[];
}

interface KitDoorJson {
  utd_k1?: string;
  utd_k2?: string;
  width?: number;
  height?: number;
}

interface KitComponentJson {
  name?: string;
  id?: string;
  doorhooks?: KitDoorhookJson[];
}

interface KitDoorhookJson {
  x?: number;
  y?: number;
  z?: number;
  rotation?: number;
  door?: number;
  edge?: number;
}

export const loadKits = async (kitsPath: string): Promise<Kit[]> => {
  const [kits] = await loadKitsWithMissingFiles(kitsPath);
  return kits;
};

export const loadKitsWithMissingFiles = async (kitsPath: string): Promise<[Kit[], Array<[string, string, string]>]> => {
  const kits: Kit[] = [];
  const missingFiles: Array<[string, string, string]> = [];
  const resolvedPath = path.resolve(kitsPath);

  const readFile = (filePath: string): Uint8Array => {
    return new Uint8Array(fs.readFileSync(filePath));
  };

  if (!fs.existsSync(resolvedPath)) {
    fs.mkdirSync(resolvedPath, { recursive: true });
  }

  const entries = fs.readdirSync(resolvedPath);
  for (const entry of entries) {
    if (!entry.toLowerCase().endsWith(".json")) {
      continue;
    }
    const filePath = path.join(resolvedPath, entry);
    let kitJson: KitJsonShape;
    try {
      kitJson = JSON.parse(Buffer.from(readFile(filePath)).toString("utf8")) as KitJsonShape;
    } catch (err) {
      continue;
    }
    if (!kitJson || typeof kitJson !== "object" || !kitJson.name) {
      continue;
    }
    const kitId = String(kitJson.id || path.parse(entry).name);
    const kitName = String(kitJson.name);
    const kit = new Kit(kitName, kitId);

    const kitRoot = path.join(resolvedPath, kitId);

    const alwaysPath = path.join(kitRoot, "always");
    if (fs.existsSync(alwaysPath)) {
      fs.readdirSync(alwaysPath).forEach((fileName) => {
        const alwaysFile = path.join(alwaysPath, fileName);
        try {
          kit.always.set(alwaysFile, readFile(alwaysFile));
        } catch (err) {
          missingFiles.push([kitName, alwaysFile, "always file"]);
        }
      });
    }

    const texturesPath = path.join(kitRoot, "textures");
    if (fs.existsSync(texturesPath)) {
      fs.readdirSync(texturesPath).forEach((fileName) => {
        if (!fileName.toLowerCase().endsWith(".tga")) return;
        const textureId = path.parse(fileName).name.toUpperCase();
        const textureFile = path.join(texturesPath, fileName);
        try {
          kit.textures.set(textureId, readFile(textureFile));
        } catch (err) {
          missingFiles.push([kitName, textureFile, "texture"]);
        }
        const txiPath = path.join(texturesPath, `${textureId}.txi`);
        if (fs.existsSync(txiPath)) {
          kit.txis.set(textureId, readFile(txiPath));
        } else {
          kit.txis.set(textureId, new Uint8Array(0));
        }
      });
    }

    const lightmapsPath = path.join(kitRoot, "lightmaps");
    if (fs.existsSync(lightmapsPath)) {
      fs.readdirSync(lightmapsPath).forEach((fileName) => {
        if (!fileName.toLowerCase().endsWith(".tga")) return;
        const lightmapId = path.parse(fileName).name.toUpperCase();
        const lightmapFile = path.join(lightmapsPath, fileName);
        try {
          kit.lightmaps.set(lightmapId, readFile(lightmapFile));
        } catch (err) {
          missingFiles.push([kitName, lightmapFile, "lightmap"]);
        }
        const txiPath = path.join(lightmapsPath, `${lightmapId}.txi`);
        if (fs.existsSync(txiPath)) {
          kit.txis.set(lightmapId, readFile(txiPath));
        } else {
          kit.txis.set(lightmapId, new Uint8Array(0));
        }
      });
    }

    const skyboxesPath = path.join(kitRoot, "skyboxes");
    if (fs.existsSync(skyboxesPath)) {
      fs.readdirSync(skyboxesPath).forEach((fileName) => {
        if (!fileName.toLowerCase().endsWith(".mdl")) return;
        const skyboxResref = path.parse(fileName).name.toUpperCase();
        const mdlPath = path.join(skyboxesPath, `${skyboxResref}.mdl`);
        const mdxPath = path.join(skyboxesPath, `${skyboxResref}.mdx`);
        if (!fs.existsSync(mdlPath)) {
          missingFiles.push([kitName, mdlPath, "skybox model"]);
          return;
        }
        if (!fs.existsSync(mdxPath)) {
          missingFiles.push([kitName, mdxPath, "skybox model"]);
          return;
        }
        kit.skyboxes.set(skyboxResref, { mdl: readFile(mdlPath), mdx: readFile(mdxPath) });
      });
    }

    const doorwayPath = path.join(kitRoot, "doorway");
    if (fs.existsSync(doorwayPath)) {
      fs.readdirSync(doorwayPath).forEach((fileName) => {
        if (!fileName.toLowerCase().endsWith(".mdl")) return;
        const paddingId = path.parse(fileName).name;
        const mdlPath = path.join(doorwayPath, `${paddingId}.mdl`);
        const mdxPath = path.join(doorwayPath, `${paddingId}.mdx`);
        if (!fs.existsSync(mdlPath)) {
          missingFiles.push([kitName, mdlPath, "doorway padding"]);
          return;
        }
        if (!fs.existsSync(mdxPath)) {
          missingFiles.push([kitName, mdxPath, "doorway padding"]);
          return;
        }
        const numbers = getNumbers(paddingId);
        if (numbers.length < 2) return;
        const [doorId, paddingSize] = numbers;
        const tuple: MDLMDXTuple = {
          mdl: readFile(mdlPath),
          mdx: readFile(mdxPath),
        };
        if (paddingId.toLowerCase().startsWith("side")) {
          if (!kit.sidePadding.has(doorId)) {
            kit.sidePadding.set(doorId, new Map());
          }
          kit.sidePadding.get(doorId)!.set(paddingSize, tuple);
        }
        if (paddingId.toLowerCase().startsWith("top")) {
          if (!kit.topPadding.has(doorId)) {
            kit.topPadding.set(doorId, new Map());
          }
          kit.topPadding.get(doorId)!.set(paddingSize, tuple);
        }
      });
    }

    if (Array.isArray(kitJson.doors)) {
      kitJson.doors.forEach((doorJson: KitDoorJson) => {
        try {
          const utdK1ResRef = String(doorJson.utd_k1);
          const utdK2ResRef = String(doorJson.utd_k2);
          const utdK1Path = path.join(kitRoot, `${utdK1ResRef}.utd`);
          const utdK2Path = path.join(kitRoot, `${utdK2ResRef}.utd`);
          const utdK1 = readFile(utdK1Path);
          const utdK2 = readFile(utdK2Path);
          kit.doors.push(new KitDoor(utdK1ResRef, utdK2ResRef, utdK1, utdK2, Number(doorJson.width), Number(doorJson.height)));
        } catch (err: unknown) {
          const ex = err as { filename?: string };
          missingFiles.push([kitName, String(ex?.filename ?? ""), "door utd"]);
        }
      });
    }

    if (Array.isArray(kitJson.components)) {
      kitJson.components.forEach((componentJson: KitComponentJson) => {
        const name = String(componentJson.name || "");
        const componentId = String(componentJson.id || "");
        const wokPath = path.join(kitRoot, `${componentId}.wok`);
        const mdlPath = path.join(kitRoot, `${componentId}.mdl`);
        const mdxPath = path.join(kitRoot, `${componentId}.mdx`);
        if (!fs.existsSync(wokPath)) {
          missingFiles.push([kitName, wokPath, "walkmesh"]);
          return;
        }
        if (!fs.existsSync(mdlPath)) {
          missingFiles.push([kitName, mdlPath, "model"]);
          return;
        }
        if (!fs.existsSync(mdxPath)) {
          missingFiles.push([kitName, mdxPath, "model extension"]);
          return;
        }
        const bwmRaw = readFile(wokPath);
        const bwm = cloneWalkmeshFromBuffer(bwmRaw);
        const mdl = readFile(mdlPath);
        const mdx = readFile(mdxPath);
        const component = new KitComponent(kit, name, componentId, bwm, bwmRaw, mdl, mdx);

        if (Array.isArray(componentJson.doorhooks)) {
          componentJson.doorhooks.forEach((hookJson: KitDoorhookJson) => {
            try {
              const position = new THREE.Vector3(Number(hookJson.x), Number(hookJson.y), Number(hookJson.z));
              const rotation = Number(hookJson.rotation);
              const doorIndex = Number(hookJson.door);
              const edge = Number(hookJson.edge);
              const door = kit.doors[doorIndex];
              if (!door) return;
              component.hooks.push(new KitComponentHook(position, rotation, edge, door));
            } catch {
              return;
            }
          });
        }

        kit.components.push(component);
      });
    }

    kits.push(kit);
  }

  return [kits, missingFiles];
};
