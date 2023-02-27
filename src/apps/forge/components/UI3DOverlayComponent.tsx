import React, { useState } from "react"
import { useEffectOnce } from "../helpers/UseEffectOnce"
import { UI3DRenderer } from "../UI3DRenderer";
import * as KotOR from "../KotOR";

export const UI3DOverlayComponent = function(props: any){

  const ui3DRenderer: UI3DRenderer = props.context;
  const [camera, setCamera] = useState<KotOR.THREE.PerspectiveCamera>(ui3DRenderer?.currentCamera);

  const [cameraPositionX, setCameraPositionX] = useState<number>(0);
  const [cameraPositionY, setCameraPositionY] = useState<number>(0);
  const [cameraPositionZ, setCameraPositionZ] = useState<number>(0);

  const [cameraRotationX, setCameraRotationX] = useState<number>(0);
  const [cameraRotationY, setCameraRotationY] = useState<number>(0);
  const [cameraRotationZ, setCameraRotationZ] = useState<number>(0);
  const [cameraRotationW, setCameraRotationW] = useState<number>(0);

  const onAfterRender = () => {
    setCamera(ui3DRenderer.currentCamera);
    setCameraPositionX(ui3DRenderer.currentCamera.position.x);
    setCameraPositionY(ui3DRenderer.currentCamera.position.y);
    setCameraPositionZ(ui3DRenderer.currentCamera.position.z);

    setCameraRotationX(ui3DRenderer.currentCamera.quaternion.x);
    setCameraRotationY(ui3DRenderer.currentCamera.quaternion.y);
    setCameraRotationZ(ui3DRenderer.currentCamera.quaternion.z);
    setCameraRotationW(ui3DRenderer.currentCamera.quaternion.w);
  };

  useEffectOnce( () => { //constructor
    ui3DRenderer.addEventListener('onAfterRender', onAfterRender);
    return () => { //destructor
      ui3DRenderer.removeEventListener('onAfterRender', onAfterRender)
    }
  });

  return (
    <>
      {
        camera ? (
          <div className="info-overlay">
            <b>Camera</b><br />
            <span>Position - x: {cameraPositionX.toFixed(4)}, y: {cameraPositionY.toFixed(4)}, z: {cameraPositionZ.toFixed(4)}</span><br/>
            <span>Rotation - x: {cameraRotationX.toFixed(4)}, y: {cameraRotationY.toFixed(4)}, z: {cameraRotationZ.toFixed(4)}, w: {cameraRotationW.toFixed(4)}</span><br/>
          </div>
        ) : <></>
      }
    </>
  )
}
