/**
 * Bare module ARE / GIT / IFO GFF outlines for File → New (module use, not minigame).
 * Field layout matches ForgeArea.exportToARE / exportToGIT and ForgeModule.exportToIFO.
 *
 * @file createUntitledModuleGff.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { GFFDataType } from "@/enums/resource/GFFDataType";
import { AreaMap } from "@/module/AreaMap";
import { CExoLocString } from "@/resource/CExoLocString";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";

export function normalizeResRef(resref: string, fallback: string): string {
  const trimmed = String(resref || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  return trimmed.slice(0, 16) || fallback;
}

function emptyLocString(value: string = ""): CExoLocString {
  const loc = new CExoLocString(-1);
  if (value.length) {
    loc.addSubString(value, 0);
  }
  return loc;
}

/**
 * Module-area ARE root fields + Map struct. Omits MiniGame (module use).
 */
export function createUntitledAreGff(resref: string = "new_area"): GFFObject {
  const areaResRef = normalizeResRef(resref, "new_area");
  const are = new GFFObject();
  are.FileType = "ARE ";

  are.RootNode.addField(new GFFField(GFFDataType.FLOAT, "AlphaTest", 0.200000002980232));
  are.RootNode.addField(new GFFField(GFFDataType.INT, "CameraStyle", 0));
  are.RootNode.addField(new GFFField(GFFDataType.INT, "ChanceLightning", 0));
  are.RootNode.addField(new GFFField(GFFDataType.INT, "ChanceRain", 0));
  are.RootNode.addField(new GFFField(GFFDataType.INT, "ChanceSnow", 0));
  are.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, "Comments", ""));
  are.RootNode.addField(new GFFField(GFFDataType.INT, "Creator_ID", 0));
  are.RootNode.addField(new GFFField(GFFDataType.BYTE, "DayNightCycle", 0));
  are.RootNode.addField(new GFFField(GFFDataType.RESREF, "DefaultEnvMap", ""));
  are.RootNode.addField(new GFFField(GFFDataType.DWORD, "DynAmbientColor", 0));
  are.RootNode.addField(new GFFField(GFFDataType.LIST, "Expansion_List"));
  are.RootNode.addField(new GFFField(GFFDataType.DWORD, "Flags", 0));
  are.RootNode.addField(new GFFField(GFFDataType.DWORD, "Grass_Ambient", 0));
  are.RootNode.addField(new GFFField(GFFDataType.FLOAT, "Grass_Density", 0));
  are.RootNode.addField(new GFFField(GFFDataType.DWORD, "Grass_Diffuse", 0));
  are.RootNode.addField(new GFFField(GFFDataType.FLOAT, "Grass_Prob_LL", 0));
  are.RootNode.addField(new GFFField(GFFDataType.FLOAT, "Grass_Prob_LR", 0));
  are.RootNode.addField(new GFFField(GFFDataType.FLOAT, "Grass_Prob_UL", 0));
  are.RootNode.addField(new GFFField(GFFDataType.FLOAT, "Grass_Prob_UR", 0));
  are.RootNode.addField(new GFFField(GFFDataType.FLOAT, "Grass_QuadSize", 0));
  are.RootNode.addField(new GFFField(GFFDataType.RESREF, "Grass_TexName", ""));
  are.RootNode.addField(new GFFField(GFFDataType.INT, "ID", 0));
  are.RootNode.addField(new GFFField(GFFDataType.BYTE, "IsNight", 0));
  are.RootNode.addField(new GFFField(GFFDataType.BYTE, "LightingScheme", 0));
  are.RootNode.addField(new GFFField(GFFDataType.WORD, "LoadScreenID", 0));

  const mapField = are.RootNode.addField(new GFFField(GFFDataType.STRUCT, "Map"));
  mapField?.addChildStruct(new AreaMap().export());

  are.RootNode.addField(new GFFField(GFFDataType.INT, "ModListenCheck", 0));
  are.RootNode.addField(new GFFField(GFFDataType.INT, "ModSpotCheck", 0));
  are.RootNode.addField(new GFFField(GFFDataType.DWORD, "MoonAmbientColor", 0));
  are.RootNode.addField(new GFFField(GFFDataType.DWORD, "MoonDiffuseColor", 0));
  are.RootNode.addField(new GFFField(GFFDataType.DWORD, "MoonFogColor", 0));
  are.RootNode.addField(new GFFField(GFFDataType.FLOAT, "MoonFogFar", 0));
  are.RootNode.addField(new GFFField(GFFDataType.FLOAT, "MoonFogNear", 0));
  are.RootNode.addField(new GFFField(GFFDataType.BYTE, "MoonFogOn", 0));
  are.RootNode.addField(new GFFField(GFFDataType.BYTE, "MoonShadows", 0));

  const nameField = are.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, "Name"))!;
  nameField.setCExoLocString(emptyLocString(areaResRef));

  are.RootNode.addField(new GFFField(GFFDataType.BYTE, "NoHangBack", 0));
  are.RootNode.addField(new GFFField(GFFDataType.BYTE, "NoRest", 0));
  are.RootNode.addField(new GFFField(GFFDataType.RESREF, "OnEnter", ""));
  are.RootNode.addField(new GFFField(GFFDataType.RESREF, "OnExit", ""));
  are.RootNode.addField(new GFFField(GFFDataType.RESREF, "OnHeartbeat", ""));
  are.RootNode.addField(new GFFField(GFFDataType.RESREF, "OnUserDefined", ""));
  are.RootNode.addField(new GFFField(GFFDataType.BYTE, "PlayerOnly", 0));
  are.RootNode.addField(new GFFField(GFFDataType.BYTE, "PlayerVsPlayer", 0));
  are.RootNode.addField(new GFFField(GFFDataType.LIST, "Rooms"));
  are.RootNode.addField(new GFFField(GFFDataType.BYTE, "ShadowOpacity", 0));
  are.RootNode.addField(new GFFField(GFFDataType.BYTE, "StealthXPEnabled", 0));
  are.RootNode.addField(new GFFField(GFFDataType.DWORD, "StealthXPLoss", 0));
  are.RootNode.addField(new GFFField(GFFDataType.DWORD, "StealthXPMax", 0));
  are.RootNode.addField(new GFFField(GFFDataType.DWORD, "SunAmbientColor", 0));
  are.RootNode.addField(new GFFField(GFFDataType.DWORD, "SunDiffuseColor", 0));
  are.RootNode.addField(new GFFField(GFFDataType.DWORD, "SunFogColor", 0));
  are.RootNode.addField(new GFFField(GFFDataType.FLOAT, "SunFogFar", 0));
  are.RootNode.addField(new GFFField(GFFDataType.FLOAT, "SunFogNear", 0));
  are.RootNode.addField(new GFFField(GFFDataType.BYTE, "SunFogOn", 0));
  are.RootNode.addField(new GFFField(GFFDataType.BYTE, "SunShadows", 0));
  are.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, "Tag", areaResRef));
  are.RootNode.addField(new GFFField(GFFDataType.BYTE, "Unescapable", 0));
  are.RootNode.addField(new GFFField(GFFDataType.DWORD, "Version", 0));
  are.RootNode.addField(new GFFField(GFFDataType.INT, "WindPower", 0));

  return are;
}

/**
 * Empty GIT with AreaProperties + instance lists (no placed objects).
 */
export function createUntitledGitGff(): GFFObject {
  const git = new GFFObject();
  git.FileType = "GIT ";

  const areaPropertiesField = new GFFField(GFFDataType.STRUCT, "AreaProperties");
  const areaPropertiesStruct = new GFFStruct(100);
  areaPropertiesStruct.addField(new GFFField(GFFDataType.INT, "AmbientSndDay", 0));
  areaPropertiesStruct.addField(new GFFField(GFFDataType.INT, "AmbientSndDayVol", 0));
  areaPropertiesStruct.addField(new GFFField(GFFDataType.INT, "AmbientSndNight", 0));
  areaPropertiesStruct.addField(new GFFField(GFFDataType.INT, "AmbientSndNitVol", 0));
  areaPropertiesStruct.addField(new GFFField(GFFDataType.INT, "EnvAudio", 0));
  areaPropertiesStruct.addField(new GFFField(GFFDataType.INT, "MusicBattle", 0));
  areaPropertiesStruct.addField(new GFFField(GFFDataType.INT, "MusicDay", 0));
  areaPropertiesStruct.addField(new GFFField(GFFDataType.INT, "MusicDelay", 0));
  areaPropertiesStruct.addField(new GFFField(GFFDataType.INT, "MusicNight", 0));
  areaPropertiesField.addChildStruct(areaPropertiesStruct);
  git.RootNode.addField(areaPropertiesField);

  git.RootNode.addField(new GFFField(GFFDataType.LIST, "CameraList"));
  git.RootNode.addField(new GFFField(GFFDataType.LIST, "Creature List"));
  git.RootNode.addField(new GFFField(GFFDataType.LIST, "Door List"));
  git.RootNode.addField(new GFFField(GFFDataType.LIST, "Encounter List"));
  git.RootNode.addField(new GFFField(GFFDataType.LIST, "List"));
  git.RootNode.addField(new GFFField(GFFDataType.LIST, "Placeable List"));
  git.RootNode.addField(new GFFField(GFFDataType.LIST, "SoundList"));
  git.RootNode.addField(new GFFField(GFFDataType.LIST, "StoreList"));
  git.RootNode.addField(new GFFField(GFFDataType.LIST, "TriggerList"));
  git.RootNode.addField(new GFFField(GFFDataType.BYTE, "UseTemplates", 1));
  git.RootNode.addField(new GFFField(GFFDataType.LIST, "WaypointList"));

  return git;
}

/**
 * Module IFO outline with one Mod_Area_list entry and null Mod_ID.
 */
export function createUntitledIfoGff(areaResRef: string = "new_area"): GFFObject {
  const entry = normalizeResRef(areaResRef, "new_area");
  const ifo = new GFFObject();
  ifo.FileType = "IFO ";

  ifo.RootNode.addField(new GFFField(GFFDataType.WORD, "Expansion_Pack", 0));

  const areaList = ifo.RootNode.addField(new GFFField(GFFDataType.LIST, "Mod_Area_list"))!;
  const areaStruct = new GFFStruct(6);
  areaStruct.addField(new GFFField(GFFDataType.RESREF, "Area_Name", entry));
  areaList.addChildStruct(areaStruct);

  ifo.RootNode.addField(new GFFField(GFFDataType.INT, "Mod_Creator_ID", 2));
  ifo.RootNode.addField(new GFFField(GFFDataType.LIST, "Mod_CutSceneList"));
  ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, "Mod_DawnHour", 6));

  const modDescriptionField = ifo.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, "Mod_Description"))!;
  modDescriptionField.setCExoLocString(emptyLocString());

  ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, "Mod_DuskHour", 18));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_Entry_Area", entry));
  ifo.RootNode.addField(new GFFField(GFFDataType.FLOAT, "Mod_Entry_Dir_X", 0));
  ifo.RootNode.addField(new GFFField(GFFDataType.FLOAT, "Mod_Entry_Dir_Y", 1));
  ifo.RootNode.addField(new GFFField(GFFDataType.FLOAT, "Mod_Entry_X", 0));
  ifo.RootNode.addField(new GFFField(GFFDataType.FLOAT, "Mod_Entry_Y", 0));
  ifo.RootNode.addField(new GFFField(GFFDataType.FLOAT, "Mod_Entry_Z", 0));
  ifo.RootNode.addField(new GFFField(GFFDataType.LIST, "Mod_Expan_List"));
  ifo.RootNode.addField(new GFFField(GFFDataType.LIST, "Mod_GVar_List"));
  ifo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, "Mod_Hak", ""));

  const modIdField = ifo.RootNode.addField(new GFFField(GFFDataType.VOID, "Mod_ID"))!;
  modIdField.setData(new Uint8Array(16));

  ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, "Mod_IsSaveGame", 0));
  ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, "Mod_MinPerHour", 2));

  const modNameField = ifo.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, "Mod_Name"))!;
  modNameField.setCExoLocString(emptyLocString(entry));

  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_OnAcquirItem", ""));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_OnActvtItem", ""));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_OnClientEntr", ""));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_OnClientLeav", ""));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_OnHeartbeat", ""));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_OnModLoad", ""));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_OnModStart", ""));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_OnPlrDeath", ""));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_OnPlrDying", ""));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_OnPlrLvlUp", ""));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_OnPlrRest", ""));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_OnSpawnBtnDn", ""));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_OnUnAqreItem", ""));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_OnUsrDefined", ""));

  ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, "Mod_StartDay", 0));
  ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, "Mod_StartHour", 0));
  ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, "Mod_StartMonth", 0));
  ifo.RootNode.addField(new GFFField(GFFDataType.RESREF, "Mod_StartMovie", ""));
  ifo.RootNode.addField(new GFFField(GFFDataType.DWORD, "Mod_StartYear", 0));
  ifo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, "Mod_Tag", entry));
  ifo.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, "Mod_VO_ID", entry));
  ifo.RootNode.addField(new GFFField(GFFDataType.DWORD, "Mod_Version", 3));
  ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, "Mod_XPScale", 10));

  return ifo;
}

export function createUntitledModuleGffForExt(
  ext: string,
  resref: string = "new_area",
): GFFObject | undefined {
  const key = String(ext || "").toLowerCase().replace(/^\./, "");
  if (key === "are") {
    return createUntitledAreGff(resref);
  }
  if (key === "git") {
    return createUntitledGitGff();
  }
  if (key === "ifo") {
    return createUntitledIfoGff(resref === "module" ? "new_area" : resref);
  }
  return undefined;
}
