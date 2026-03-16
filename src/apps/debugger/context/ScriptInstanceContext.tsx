import React, { createContext, useContext, useEffect, useState } from "react";
import * as KotOR from "../KotOR";
import { useApp } from "./AppContext";
import { IPCMessageType } from "../../../enums/server/ipc/IPCMessageType";
import { IPCMessage } from "../../../server/ipc/IPCMessage";
import { IPCMessageParam } from "../../../server/ipc/IPCMessageParam";
import { IPCDataType } from "../../../enums/server/ipc/IPCDataType";
// import { useEffectOnce } from "../../forge/helpers/UseEffectOnce";

export interface ScriptInstanceProviderValues {
  instance: [KotOR.NWScriptInstance|undefined, React.Dispatch<KotOR.NWScriptInstance|undefined>];
  breakpointMap: [Map<number, boolean>, React.Dispatch<Map<number, boolean>>];
  seekAddress: [number, React.Dispatch<number>];
}
export const ScriptInstanceContext = createContext<ScriptInstanceProviderValues>({} as any);

export function useScriptInstance(){
  return useContext(ScriptInstanceContext);
}

export const ScriptInstanceProvider = (props: {children: any; instance: KotOR.NWScriptInstance|undefined}) => {
  const appContext = useApp();
  const sendMessageHelper = appContext.sendMessageHelper;
  // const [channelMessage, sendChanelMessage] = appContext.channelMessage;

  const [instance, setInstance] = useState<KotOR.NWScriptInstance|undefined>(props.instance);
  const [breakpointMap, setBreakpointMap] = useState<Map<number, boolean>>(new Map());
  const [render, rerender] = useState<boolean>(false);

  const [seekAddress, setSeekAddress] = useState<number>(0);

  const providerValue: ScriptInstanceProviderValues = {
    instance: [instance, setInstance],
    breakpointMap: [breakpointMap, setBreakpointMap],
    seekAddress: [seekAddress, setSeekAddress],
  };

  const breakPointUpdateHandler = (address: number, added: false) => {
    if(!instance) return;
    setBreakpointMap(new Map(instance.breakPoints));
    rerender(!render);

    const ipcMessage = new IPCMessage(added ? IPCMessageType.SetScriptBreakpoint : IPCMessageType.RemoveScriptBreakpoint);
    ipcMessage.addParam(new IPCMessageParam(IPCDataType.STRING, instance.uuid));
    ipcMessage.addParam(new IPCMessageParam(IPCDataType.INTEGER, address));
    sendMessageHelper(ipcMessage.toBuffer());
  }

  const seekHandler = (address: number) => {
    console.log("Seeking to", address);
    setSeekAddress(address);
  }

  useEffect(() => {
    console.log("Setting instance", props.instance);
    if(instance) {
      console.log("Removing breakpoint listener", instance.uuid);
      instance.removeEventListener('breakpoint', breakPointUpdateHandler);
      instance.removeEventListener('seek', seekHandler);
    }

    setInstance(props.instance);
    if(props.instance) {
      setBreakpointMap(new Map(props.instance.breakPoints));
      setSeekAddress(props.instance.seek);
      log.debug("Adding breakpoint listener", props.instance.uuid);
      props.instance.addEventListener('breakpoint', breakPointUpdateHandler);
      props.instance.addEventListener('seek', seekHandler);
    }
  }, [props.instance]);

  // useEffect(() => {
  //   if(!instance) return;

  //   console.log("Adding breakpoint listener", instance.uuid);
  //   instance.addEventListener('breakpoint', breakPointUpdateHandler);
  //   return () => {
  //     console.log("Removing breakpoint listener", instance.uuid);
  //     instance.removeEventListener('breakpoint', breakPointUpdateHandler);
  //   }
  // }, []);

  return (
    <ScriptInstanceContext.Provider value={providerValue}>
      {props.children}
    </ScriptInstanceContext.Provider>
  );
};
