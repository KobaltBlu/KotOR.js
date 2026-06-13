import React, { useEffect, useState } from "react";
import { KotORModal } from "@/apps/game/components/modal/modal";
import { useApp } from "@/apps/game/context/AppContext";
import "@/apps/game/components/modal-click-to-begin/modalClickToBegin.scss";

const HELP_MESSAGE =
  "Modern browsers block audio and video from starting until you interact with the page. " +
  "This is a browser security feature, not a problem with KotOR.js. " +
  "Click BEGIN to unlock playback and start the game.";

export const ModalClickToBegin = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;
  const [showClickToBeginModal, setShowClickToBeginModal] = appContext.showClickToBeginModal;
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if(!showClickToBeginModal){
      setShowHelp(false);
    }
  }, [showClickToBeginModal]);

  const onOk = async () => {
    setShowClickToBeginModal(false);
    await appState.beginAfterAudioUnlock();
  };

  const toggleHelp = () => {
    setShowHelp((visible) => !visible);
  };

  return (
    <KotORModal
      title="Click to Begin"
      show={showClickToBeginModal}
      className="forge-style-modal click-to-begin-modal"
      enableCancel={false}
      okText="BEGIN"
      onOk={onOk}
    >
      <div className="click-to-begin-body">
        <p>Press BEGIN to start the game.</p>
        <button
          type="button"
          className="click-to-begin-help-btn"
          aria-label="Why is this required?"
          aria-expanded={showHelp}
          aria-controls="click-to-begin-help-message"
          onClick={toggleHelp}
          title="Why is this required?"
        >
          ?
        </button>
      </div>
      {showHelp && (
        <p id="click-to-begin-help-message" className="click-to-begin-help-message" role="note">
          {HELP_MESSAGE}
        </p>
      )}
    </KotORModal>
  );
};
