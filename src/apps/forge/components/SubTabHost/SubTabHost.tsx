import React, { useState, ReactNode } from "react";

export interface SubTab {
  id: string;
  label: string;
  headerIcon?: string;
  headerTitle?: string;
  content: ReactNode;
}

export interface SubTabHostProps {
  tabs: SubTab[];
  defaultTab?: string;
  leftPanel?: ReactNode;
  contentStyle?: React.CSSProperties;
}

export interface SubTabHeaderProps {
  title: string;
  icon?: string;
}

export const SubTabHeader = function(props: SubTabHeaderProps) {
  return (
    <div className="tab-pane-header">
      <h3>
        {props.icon && (
          <>
            <i className={`fa-solid ${props.icon}`}/>&nbsp;
          </>
        )}
        {props.title}
      </h3>
    </div>
  );
}

export interface SubTabContentProps {
  children: ReactNode;
}

export const SubTabContent = function(props: SubTabContentProps) {
  return (
    <div className="tab-pane-content relative">
      {props.children}
    </div>
  );
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
              ...contentStyle
            }}
          >
            {tabs.map(tab => (
              <div
                key={tab.id}
                className="tab-pane"
                style={{ display: selectedTab === tab.id ? 'block' : 'none' }}
              >
                {(tab.headerIcon || tab.headerTitle) && (
                  <SubTabHeader icon={tab.headerIcon || ''} title={tab.headerTitle || ''} />
                )}
                <SubTabContent>{tab.content}</SubTabContent>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

