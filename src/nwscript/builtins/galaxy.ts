import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import { Planetary } from "@/engine/Planetary";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam } from "@/nwscript/builtins/actionBuilder";

export const ShowGalaxyMap = defineAction({
  id: 739,
  name: "ShowGalaxyMap",
  comment: "739: Bring up the galaxy map GUI with nPlanet selected.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nPlanet")] as const,
  kotor(this: NWScriptInstance, nPlanet) {
    Planetary.SetSelectedPlanet(nPlanet);
    GameState.MenuManager.MenuGalaxyMap.open();
  },
});

export const SetPlanetSelectable = defineAction({
  id: 740,
  name: "SetPlanetSelectable",
  comment: "740: Set nPlanet selectable on the galaxy map GUI.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nPlanet"), intParam("bSelectable")] as const,
  kotor(this: NWScriptInstance, nPlanet, bSelectable) {
    Planetary.SetPlanetSelectable(nPlanet, !!bSelectable);
  },
});

export const GetPlanetSelectable = defineAction({
  id: 741,
  name: "GetPlanetSelectable",
  comment: "741: Return whether or not nPlanet is selectable.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nPlanet")] as const,
  kotor(this: NWScriptInstance, nPlanet) {
    return Planetary.planets[nPlanet].selectable ? NW_TRUE : NW_FALSE;
  },
});

export const SetPlanetAvailable = defineAction({
  id: 742,
  name: "SetPlanetAvailable",
  comment: "742: Set nPlanet available on the galaxy map GUI.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nPlanet"), intParam("bAvailable")] as const,
  kotor(this: NWScriptInstance, nPlanet, bAvailable) {
    Planetary.SetPlanetAvailable(nPlanet, !!bAvailable);
  },
});

export const GetPlanetAvailable = defineAction({
  id: 743,
  name: "GetPlanetAvailable",
  comment: "743: Return whether or not nPlanet is available.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nPlanet")] as const,
  kotor(this: NWScriptInstance, nPlanet) {
    return Planetary.planets[nPlanet].enabled ? NW_TRUE : NW_FALSE;
  },
});

export const GetSelectedPlanet = defineAction({
  id: 744,
  name: "GetSelectedPlanet",
  comment: "744: Return the ID of the currently selected planet.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return Planetary.selectedIndex;
  },
});

export const galaxyActions = [
  ShowGalaxyMap,
  SetPlanetSelectable,
  GetPlanetSelectable,
  SetPlanetAvailable,
  GetPlanetAvailable,
  GetSelectedPlanet,
] as const;
