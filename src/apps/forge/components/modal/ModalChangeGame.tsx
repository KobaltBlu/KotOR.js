import React, { useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { useEffectOnce } from "../../helpers/UseEffectOnce";

import * as KotOR from "../../KotOR";
import { ForgeState } from "../../states/ForgeState";

export const ModalChangeGame = function(props: any){
  const [show, setShow] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const chooseProfile = (e: React.MouseEvent<HTMLButtonElement>, profile: any) => {
    setShow(false);
    if (profile) {
      ForgeState.switchGame(profile);
    }
  }

  useEffectOnce( () => {
    let compatible_profiles: any[] = [];
    let all_profiles = (KotOR.ConfigClient.get(['Profiles']) || {});
    let all_profile_keys = Object.keys(all_profiles);

    for(let i = 0, len = all_profile_keys.length; i < len; i++){
      console.log(all_profile_keys[i])
      let profile = all_profiles[all_profile_keys[i]];
      if(profile.isForgeCompatible){
        compatible_profiles.push(profile);
      }
    }
    console.log('profiles', compatible_profiles);
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
          profiles.map( (profile: any) => {
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
      let ev = ModalChangeGameState.eventListeners[type];
      let index = ev.indexOf(cb);
      if(index == -1){
        ev.push(cb);
      }else{
        console.warn('Event Listener: Already added', type);
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static RemoveEventListener(type: ModalChangeGameEventListenerTypes, cb: Function){
    if(Array.isArray(ModalChangeGameState.eventListeners[type])){
      let ev = ModalChangeGameState.eventListeners[type];
      let index = ev.indexOf(cb);
      if(index >= 0){
        ev.splice(index, 1);
      }else{
        console.warn('Event Listener: Already removed', type);
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static ProcessEventListener(type: ModalChangeGameEventListenerTypes, args: any[] = []){
    if(Array.isArray(ModalChangeGameState.eventListeners[type])){
      let ev = ModalChangeGameState.eventListeners[type];
      for(let i = 0; i < ev.length; i++){
        const callback = ev[i];
        if(typeof callback === 'function'){
          callback(...args);
        }
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static TriggerEventListener(type: ModalChangeGameEventListenerTypes, args: any[] = []){
    ModalChangeGameState.ProcessEventListener(type, args);
  }

  static Show() {
    ModalChangeGameState.TriggerEventListener('onShow');
  }
}
