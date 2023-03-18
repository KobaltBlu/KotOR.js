import React, { useState } from "react";

import * as KotOR from "../KotOR";


export const TwoDAEditorColumnHeader = function(props: any){
  const [render, rerender] = useState<boolean>(false);

  const twoDAObject: KotOR.TwoDAObject = props.twoDAObject;
  const column = props.column;
  const index = twoDAObject.columns.indexOf(column);

  return (
    <th key={index}>
      {!index ? 'ID' : column}
    </th>
  );

}