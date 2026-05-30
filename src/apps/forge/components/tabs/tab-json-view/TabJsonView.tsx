import React, { useEffect, useState } from 'react';

import type { TabJsonViewState } from '@/apps/forge/states/tabs';
import '@/apps/forge/components/tabs/tab-json-view/TabJsonView.scss';

interface BaseTabProps {
  tab: TabJsonViewState;
}

export const TabJsonView = function (props: BaseTabProps) {
  const tab = props.tab as TabJsonViewState;
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const onEditorFileLoad = () => {
      forceUpdate({});
    };
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
    };
  }, [tab]);

  return (
    <div className="forge-json-view">
      <div className="forge-json-view__header">
        <span className="label">File:</span> {tab.file?.getFilename?.() ?? 'Untitled'}
        <span className="forge-json-view__hint">(read-only)</span>
      </div>
      {tab.errorMessage ? (
        <div className="forge-json-view__error">{tab.errorMessage}</div>
      ) : (
        <pre className="forge-json-view__content">{tab.jsonContent || 'Loading…'}</pre>
      )}
    </div>
  );
};
