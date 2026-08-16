import React, { useEffect, useState } from "react";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import * as KotOR from "@/apps/forge/KotOR";

export const ForgeStatusBar = function ForgeStatusBar() {
  const [tabLabel, setTabLabel] = useState("");
  const [hasGameData, setHasGameData] = useState(ForgeState.hasGameData);
  const gameKey = KotOR.ApplicationProfile.GameKey;

  const syncGame = () => {
    setHasGameData(ForgeState.hasGameData);
  };

  const sync = () => {
    const tab = ForgeState.tabManager?.currentTab;
    const filePath = tab?.file?.getPrettyPath?.() || tab?.file?.path;
    setTabLabel(filePath || tab?.tabName || "");
  };

  useEffectOnce(() => {
    const manager = ForgeState.tabManager;
    if (!manager) return;
    manager.addEventListener("onTabShow", sync);
    manager.addEventListener("onTabAdded", sync);
    manager.addEventListener("onTabRemoved", sync);
    manager.addEventListener("onTabHide", sync);
    ForgeState.addEventListener("onGameDataChanged", syncGame);
    sync();
    return () => {
      manager.removeEventListener("onTabShow", sync);
      manager.removeEventListener("onTabAdded", sync);
      manager.removeEventListener("onTabRemoved", sync);
      manager.removeEventListener("onTabHide", sync);
      ForgeState.removeEventListener("onGameDataChanged", syncGame);
    };
  });

  useEffect(() => {
    sync();
  }, []);

  return (
    <div className="forge-statusbar">
      <span className="forge-statusbar__game">{hasGameData ? gameKey : "No game"}</span>
      <span className="forge-statusbar__tab" title={tabLabel}>{tabLabel || "Ready"}</span>
      <span className="forge-statusbar__idle">Ready</span>
    </div>
  );
};
