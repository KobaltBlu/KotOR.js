import React, { useState } from "react";
import type { TwoDAObject } from "../../../resource/TwoDAObject";


export const TwoDAEditorColumnHeader = function(props: any){
  const [render, rerender] = useState<boolean>(false);

  const twoDAObject: TwoDAObject = props.twoDAObject;
  const column = props.column;
  const index = twoDAObject.columns.indexOf(column);

  return (
    <th key={index}>
      {!index ? 'ID' : column}
    </th>
  );

}