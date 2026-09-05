import React from "react";
import { useApp } from "@/apps/game/context/AppContext";
import { CheatConsoleBar } from "@/apps/game/components/cheat-console/CheatConsoleBar";
import { DebugToolsPanel } from "@/apps/game/components/cheat-console/DebugToolsPanel";
import "@/apps/game/components/cheat-console/cheat-console.scss";

export const CheatConsole = () => {
  const appContext = useApp();
  const [gameKey] = appContext.gameKey;

  return (
    <div className={`cheat-console on ${gameKey}`}>
      <DebugToolsPanel />
      <CheatConsoleBar />
    </div>
  );
};
