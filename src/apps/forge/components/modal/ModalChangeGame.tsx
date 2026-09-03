import React, { useState } from "react";
import { ForgeButton, ForgeDialog } from "@/apps/forge/components/ui";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { Launcher } from "@/apps/launcher/context/Launcher";

import * as KotOR from "@/apps/forge/KotOR";

function listForgeProfiles(): any[] {
  const fromLauncher = Object.values(Launcher.AppProfiles || {}).filter((profile: any) => {
    return profile && profile.isForgeCompatible && typeof profile.key === "string";
  });
  if (fromLauncher.length) {
    return fromLauncher as any[];
  }
  const stored = KotOR.ConfigClient.get(["Profiles"]) || {};
  return Object.values(stored).filter((profile: any) => {
    return profile && profile.isForgeCompatible && typeof profile.key === "string";
  }) as any[];
}

export const ModalChangeGame = function(props: any){
  const [show, setShow] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);

  const refreshProfiles = () => {
    Launcher.ensureGameProfileSlots();
    Launcher.populateAppCategories();
    setProfiles(listForgeProfiles());
  };

  const handleClose = () => setShow(false);
  const handleShow = () => {
    refreshProfiles();
    setShow(true);
  };

  const chooseProfile = (e: React.MouseEvent<HTMLButtonElement>, profile: any) => {
    setShow(false);
    if(profile && profile.key){
      const next = `?key=${profile.key}`;
      if(window.location.search === next){
        return;
      }
      window.location.search = next;
    }
  }

  useEffectOnce( () => {
    refreshProfiles();
    ModalChangeGameState.AddEventListener('onShow', handleShow);
    ModalChangeGameState.AddEventListener('onHide', handleClose);
    return () => {
      ModalChangeGameState.RemoveEventListener('onShow', handleShow);
      ModalChangeGameState.RemoveEventListener('onHide', handleClose);
    }
  });

  return (
    <ForgeDialog 
      show={show} 
      onHide={handleClose} 
      backdrop="static" 
      keyboard={true}
      className="forge-change-game-dialog"
    >
      <ForgeDialog.Header closeButton>
        <ForgeDialog.Title>Switch Game</ForgeDialog.Title>
      </ForgeDialog.Header>

      <ForgeDialog.Body>
        <p>Choose which game data Forge should load. This reloads the application.</p>
        {profiles.length === 0 ? (
          <p>No Forge-compatible game profiles were found. Use the launcher once so KotOR and TSL are registered.</p>
        ) : null}
      </ForgeDialog.Body>

      <ForgeDialog.Footer>
        {
          profiles.map( (profile: any) => {
            return (
              <ForgeButton key={profile.key} variant="primary" onClick={(e: any) => chooseProfile(e, profile)}>{profile.full_name || profile.name}</ForgeButton>
            )
          })
        }
        <ForgeButton onClick={handleClose}>Close</ForgeButton>
      </ForgeDialog.Footer>
    </ForgeDialog>
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

  static Hide() {
    ModalChangeGameState.TriggerEventListener('onHide');
  }
}
