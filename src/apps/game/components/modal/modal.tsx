import React, { useEffect, useState } from "react";

import "@/apps/game/components/modal/modal.scss";
import { useApp } from "@/apps/game/context/AppContext";

export interface KotORModalProps {
  children: React.ReactNode;
  show: boolean;
  title: string;
  enableCancel?: boolean;
  enableOk?: boolean;
  cancelText?: string;
  okText?: string;
  onCancel?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onOk?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  gameKey?: string;
}

export const KotORModal = ({
  children,
  show,
  title,
  enableCancel = true,
  enableOk = true,
  cancelText = "CANCEL",
  okText = "OK",
  onCancel,
  onOk
}: KotORModalProps) => {
  const appContext = useApp();
  const [gameKey] = appContext.gameKey;
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(!!show);
  }, [show, title]);

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // setIsVisible(false);
    if(typeof onCancel === "function") {
      onCancel(e);
    }
  };

  const handleOk = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // setIsVisible(false);
    if(typeof onOk === "function") {
      onOk(e);
    }
  };

  return (
    isVisible && <div className={`kotor-modal-backdrop ${gameKey} ${isVisible ? "visible" : ""}`}>
      <div className="kotor-modal">
        <h2 className="modal-heading">{title}</h2>
        <div className="modal-content">{children}</div>
        <div className="modal-actions">
          {enableCancel && <button className="modal-button" onClick={handleCancel}>{cancelText}</button>}
          {enableOk && <button className="modal-button" onClick={handleOk}>{okText}</button>}
        </div>
      </div>
    </div>
  );
};
