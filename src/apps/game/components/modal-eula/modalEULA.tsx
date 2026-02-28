import React, { useEffect } from "react";

import { KotORModal } from "@/apps/game/components/modal/modal";
import { useApp } from "@/apps/game/context/AppContext";
import { EULA_VERSION, EULA } from "@/apps/game/eula";
import * as KotOR from "@/apps/KotOR";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);

export const ModalEULA = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;
  const [gameKey] = appContext.gameKey;
  const [showEULAModal] = appContext.showEULAModal;

  useEffect(() => {

  }, []);

  const onCancel = () => {
    alert('You must accept the Usage Notice to play this game. We are sorry to see you go.');
    window.close();
  }

  const onOk = () => {
    log.info("onOk EULA accepted");
    const gameEULAConfig = {
      key: gameKey,
      accepted: true,
      date: new Date().toISOString(),
      version: EULA_VERSION
    };
    const raw = window.localStorage.getItem('acceptEULA');
    const eulaState: Record<string, { key: KotOR.GameEngineType; accepted: boolean; date: string; version: string }> = Object.assign(
      {},
      raw ? (JSON.parse(raw) as Record<string, { key: KotOR.GameEngineType; accepted: boolean; date: string; version: string }>) : {}
    );
    eulaState[gameKey] = gameEULAConfig;
    window.localStorage.setItem('acceptEULA', JSON.stringify(eulaState));
    appState.acceptEULA();
  }

  return (
    <KotORModal
      title="EULA"
      show={showEULAModal}
      onCancel={onCancel}
      onOk={onOk}
    >
      {<EULA />}
    </KotORModal>
  );
};
