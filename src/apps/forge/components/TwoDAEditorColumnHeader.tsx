import React, { useState } from 'react';

import type * as KotOR from '../KotOR';
import { createScopedLogger, LogScope } from '../../../utility/Logger';

const log = createScopedLogger(LogScope.Forge);

export interface TwoDAEditorColumnHeaderProps {
  twoDAObject: KotOR.TwoDAObject;
  column: string;
}

export const TwoDAEditorColumnHeader: React.FC<TwoDAEditorColumnHeaderProps> = (props) => {
  log.trace('TwoDAEditorColumnHeader render', props.column);
  const [, rerender] = useState<boolean>(false);

  const twoDAObject = props.twoDAObject;
  const column = props.column;
  const index = twoDAObject.columns.indexOf(column);

  return (
    <th key={index}>
      {!index ? 'ID' : column}
    </th>
  );

}