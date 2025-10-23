import React, { useCallback, useEffect, useState } from "react"
import "./forge-checkbox.scss"

export const ForgeCheckbox = function(props: { label: string, value: boolean, onChange: (value: boolean) => void }) {
  const [value, setValue] = useState<boolean>(props.value);

  const onChange = useCallback((e: React.MouseEvent<HTMLLabelElement>) => {
    setValue(!value);
    props.onChange(!value);
  }, [value, props.onChange]);

  useEffect(() => {
    setValue(!!props.value);
  }, [props.value]);

  return (
    <div className="forge-checkbox">
      <input type="checkbox" className="ui" checked={value} />
      <label className="checkbox-label" onClick={(e) => onChange(e)}>{props.label}</label>
    </div>
  );
}