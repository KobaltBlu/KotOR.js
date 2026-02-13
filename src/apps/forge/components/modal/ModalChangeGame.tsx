import React, { useState } from "react";
import { Button, Modal } from "react-bootstrap";

import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { ForgeState } from "../../states/ForgeState";

import { createScopedLogger, LogScope } from "../../../../utility/Logger";
import * as KotOR from "../../KotOR";


const log = createScopedLogger(LogScope.Forge);

export interface ForgeCompatibleProfile {
  key: string;
  name: string;
  isForgeCompatible?: boolean;
}

export const ModalChangeGame = function(_props: Record<string, unknown>){
  const [show, setShow] = useState(false);
  const [profiles, setProfiles] = useState<ForgeCompatibleProfile[]>([]);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const chooseProfile = (e: React.MouseEvent<HTMLButtonElement>, profile: ForgeCompatibleProfile | null) => {
    setShow(false);
    if (profile) {
      ForgeState.switchGame(profile);
    }
  }

  useEffectOnce( () => {
    const compatible_profiles: ForgeCompatibleProfile[] = [];
    const all_profiles = (KotOR.ConfigClient.get(['Profiles']) as Record<string, ForgeCompatibleProfile> | undefined) ?? {};
    const all_profile_keys = Object.keys(all_profiles);

    for(let i = 0, len = all_profile_keys.length; i < len; i++){
      log.trace(all_profile_keys[i]);
      const profile = all_profiles[all_profile_keys[i]];
      if(profile?.isForgeCompatible){
        compatible_profiles.push(profile);
      }
    }
    log.trace('profiles', compatible_profiles);
    setProfiles(compatible_profiles);
    ModalChangeGameState.AddEventListener('onShow', handleShow);
    ModalChangeGameState.AddEventListener('onHide', handleShow);
    return () => {
      ModalChangeGameState.RemoveEventListener('onShow', handleShow);
      ModalChangeGameState.RemoveEventListener('onHide', handleShow);
    }
  });

  return (
    <Modal
      show={show}
      onHide={handleClose}
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>Switch Game?</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p>Choose which game you would like to switch to.</p>
      </Modal.Body>

      <Modal.Footer>
        {
          profiles.map( (profile: ForgeCompatibleProfile) => {
            return (
              <Button key={profile.key} variant="primary" onClick={(e: React.MouseEvent<HTMLButtonElement>) => chooseProfile(e, profile)}>{profile.name}</Button>
            )
          })
        }
        <Button variant="secondary" onClick={handleClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  )
};

export type ModalChangeGameEventListenerTypes = 'onShow'|'onHide';

export interface ModalChangeGameEventListeners {
  onShow: Function[];
  onHide: Function[];
}

export class ModalChangeGameState {

  static eventListeners: ModalChangeGameEventListeners = {
    onShow: [],
    onHide: [],
  };

  static AddEventListener(type: ModalChangeGameEventListenerTypes, cb: Function){
    if(Array.isArray(ModalChangeGameState.eventListeners[type])){
      const ev = ModalChangeGameState.eventListeners[type];
      const index = ev.indexOf(cb);
      if(index == -1){
        ev.push(cb);
      }else{
        log.warn('Event Listener: Already added', type);
      }
    }else{
      log.warn('Event Listener: Unsupported', type);
    }
  }

  static RemoveEventListener(type: ModalChangeGameEventListenerTypes, cb: Function){
    if(Array.isArray(ModalChangeGameState.eventListeners[type])){
      const ev = ModalChangeGameState.eventListeners[type];
      const index = ev.indexOf(cb);
      if(index >= 0){
        ev.splice(index, 1);
      }else{
        log.warn('Event Listener: Already removed', type);
      }
    }else{
      log.warn('Event Listener: Unsupported', type);
    }
  }

  static ProcessEventListener(type: ModalChangeGameEventListenerTypes, args: unknown[] = []){
    if(Array.isArray(ModalChangeGameState.eventListeners[type])){
      const ev = ModalChangeGameState.eventListeners[type];
      for(let i = 0; i < ev.length; i++){
        const callback = ev[i];
        if(typeof callback === 'function'){
          callback(...args);
        }
      }
    }else{
      log.warn('Event Listener: Unsupported', type);
    }
  }

  static TriggerEventListener(type: ModalChangeGameEventListenerTypes, args: unknown[] = []){
    ModalChangeGameState.ProcessEventListener(type, args);
  }

  static Show() {
    ModalChangeGameState.TriggerEventListener('onShow');
  }
}
