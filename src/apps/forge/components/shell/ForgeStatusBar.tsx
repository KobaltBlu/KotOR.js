import React, { useEffect, useState } from "react";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import {
  ForgeStatusBarItem,
  ForgeStatusBarState,
} from "@/apps/forge/states/ForgeStatusBarState";
import * as KotOR from "@/apps/forge/KotOR";

function StatusBarItemView(props: { item: ForgeStatusBarItem }) {
  const { item } = props;
  const className = `forge-statusbar__item forge-statusbar__item--${item.align ?? "end"}`;
  if (item.onClick) {
    return (
      <button
        type="button"
        className={`${className} forge-statusbar__item--btn`}
        title={item.title || item.text}
        onClick={item.onClick}
      >
        {item.text}
      </button>
    );
  }
  return (
    <span className={className} title={item.title || item.text}>
      {item.text}
    </span>
  );
}

export const ForgeStatusBar = function ForgeStatusBar() {
  const [tabLabel, setTabLabel] = useState("");
  const [hasGameData, setHasGameData] = useState(ForgeState.hasGameData);
  const [directoryLabel, setDirectoryLabel] = useState(ForgeState.getBoundGameDirectoryLabel());
  const [contributions, setContributions] = useState<ForgeStatusBarItem[]>(() =>
    ForgeStatusBarState.getItems(),
  );
  const gameKey = KotOR.ApplicationProfile.GameKey;

  const syncGame = () => {
    setHasGameData(ForgeState.hasGameData);
    setDirectoryLabel(ForgeState.getBoundGameDirectoryLabel());
  };

  const sync = () => {
    const tab = ForgeState.tabManager?.currentTab;
    const filePath = tab?.file?.getPrettyPath?.() || tab?.file?.path;
    setTabLabel(filePath || tab?.tabName || "");
  };

  const syncItems = () => {
    setContributions(ForgeStatusBarState.getItems());
  };

  useEffectOnce(() => {
    const manager = ForgeState.tabManager;
    if (!manager) return;
    manager.addEventListener("onTabShow", sync);
    manager.addEventListener("onTabAdded", sync);
    manager.addEventListener("onTabRemoved", sync);
    manager.addEventListener("onTabHide", sync);
    ForgeState.addEventListener("onGameDataChanged", syncGame);
    ForgeStatusBarState.addEventListener("onChange", syncItems);
    sync();
    syncItems();
    return () => {
      manager.removeEventListener("onTabShow", sync);
      manager.removeEventListener("onTabAdded", sync);
      manager.removeEventListener("onTabRemoved", sync);
      manager.removeEventListener("onTabHide", sync);
      ForgeState.removeEventListener("onGameDataChanged", syncGame);
      ForgeStatusBarState.removeEventListener("onChange", syncItems);
    };
  });

  useEffect(() => {
    sync();
  }, []);

  const startItems = contributions.filter((item) => item.align === "start");
  const endItems = contributions.filter((item) => item.align !== "start");

  return (
    <div className="forge-statusbar">
      <span
        className="forge-statusbar__game"
        data-trask-target="change-game"
        title={hasGameData ? (directoryLabel ? `Game directory: ${directoryLabel}` : "Game install directory loaded") : "Game install directory not loaded, forge experience will be limited"}
      >{gameKey}{!hasGameData ? " [Offline]" : ''}</span>
      <span className="forge-statusbar__tab" title={tabLabel}>{tabLabel || "Ready"}</span>
      {startItems.map((item) => (
        <StatusBarItemView key={item.id} item={item} />
      ))}
      <span className="forge-statusbar__end">
        {endItems.map((item) => (
          <StatusBarItemView key={item.id} item={item} />
        ))}
      </span>
    </div>
  );
};
