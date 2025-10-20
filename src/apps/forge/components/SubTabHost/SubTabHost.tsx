import React, { useState, ReactNode } from "react";

export interface SubTab {
  id: string;
  label: string;
  content: ReactNode;
}

export interface SubTabHostProps {
  tabs: SubTab[];
  defaultTab?: string;
  leftPanel?: ReactNode;
  contentStyle?: React.CSSProperties;
}

export const SubTabHost: React.FC<SubTabHostProps> = ({
  tabs,
  defaultTab,
  leftPanel,
  contentStyle = {}
}) => {
  const [selectedTab, setSelectedTab] = useState<string>(defaultTab || tabs[0]?.id || '');

  return (
    <div style={{ height: '100%' }}>
      <div className="vertical-tabs" style={{ height: '100%' }}>
        <div className="vertical-tabs-nav navbar navbar-sidebar-wizard-horizontal" role="navigation">
          <ul className="tabs-menu" style={{ textAlign: 'center' }}>
            {tabs.map(tab => (
              <li key={tab.id} className={`btn btn-tab ${selectedTab === tab.id ? 'active' : ''}`}>
                <a onClick={() => setSelectedTab(tab.id)}>{tab.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div className="vertical-tabs-container">
          {leftPanel && (
            <div className="editor-3d-preview" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: '50%' }}>
              {leftPanel}
            </div>
          )}
          <div
            id="editor-content"
            className="tabs"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: leftPanel ? '50%' : 0,
              right: 0,
              overflowY: 'auto',
              padding: '0 10px',
              ...contentStyle
            }}
          >
            {tabs.map(tab => (
              <div
                key={tab.id}
                className="tab-pane"
                style={{ display: selectedTab === tab.id ? 'block' : 'none' }}
              >
                {tab.content}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

