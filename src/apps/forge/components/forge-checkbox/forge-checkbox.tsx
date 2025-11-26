import React, { useCallback, useEffect, useState } from "react"
import "./forge-checkbox.scss"
import { InfoBubble } from "../info-bubble/info-bubble";

export const ForgeCheckbox = function(props: { label: string, info?: string, value: boolean, onChange: (value: boolean) => void }) {
  const [value, setValue] = useState<boolean>(props.value);
  const [info, setInfo] = useState<string>(props.info || '');

  const onChange = useCallback((e: React.MouseEvent<HTMLLabelElement>) => {
    setValue(!value);
    props.onChange(!value);
  }, [value, props.onChange]);

  useEffect(() => {
    setInfo(props.info || '');
    setValue(!!props.value);
  }, [props.value, props.info]);

  return (
    <div className="forge-checkbox">
      {info && <InfoBubble content={info} position="right">
        <input type="checkbox" className="ui" checked={value} />
        <label className="checkbox-label" onClick={(e) => onChange(e)}>{props.label}</label>
      </InfoBubble>}
      {!info && <>
        <input type="checkbox" className="ui" checked={value} />
        <label className="checkbox-label" onClick={(e) => onChange(e)}>{props.label}</label>
      </>}
    </div>
  );
}