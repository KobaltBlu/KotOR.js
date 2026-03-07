import React, { useState, useEffect } from "react";
import { TabTLKEditorState } from "../../../states/tabs";
import { MenuBar, MenuItem } from "../../common/MenuBar";
import * as KotOR from "../../../KotOR";
import "./TabTLKEditor.scss";

interface BaseTabProps {
  tab: TabTLKEditorState;
}

export const TabTLKEditor = function(props: BaseTabProps){
  const tab = props.tab as TabTLKEditorState;
  const [tlk, setTlk] = useState(tab.tlk);
  const [selectedIndex, setSelectedIndex] = useState(tab.selectedStringIndex);
  const [searchFilter, setSearchFilter] = useState(tab.searchFilter);
  const [currentPage, setCurrentPage] = useState(tab.currentPage);

  useEffect(() => {
    const loadHandler = () => setTlk(tab.tlk);
    const selectHandler = () => setSelectedIndex(tab.selectedStringIndex);
    const searchHandler = () => setSearchFilter(tab.searchFilter);
    const pageHandler = () => setCurrentPage(tab.currentPage);

    tab.addEventListener('onEditorFileLoad', loadHandler);
    tab.addEventListener('onStringSelected', selectHandler);
    tab.addEventListener('onSearchFilterChanged', searchHandler);
    tab.addEventListener('onPageChanged', pageHandler);

    return () => {
      tab.removeEventListener('onEditorFileLoad', loadHandler);
      tab.removeEventListener('onStringSelected', selectHandler);
      tab.removeEventListener('onSearchFilterChanged', searchHandler);
      tab.removeEventListener('onPageChanged', pageHandler);
    };
  }, [tab]);

  const menuItems: MenuItem[] = [
    {
      label: 'File',
      children: [
        { label: 'Save', onClick: () => tab.save() },
        { label: 'Save As', onClick: () => tab.saveAs() }
      ]
    }
  ];

  if(!tlk){
    return (
      <div className="forge-tlk-editor">
        <MenuBar items={menuItems} />
        <div className="forge-tlk-editor__loading">Loading talk table...</div>
      </div>
    );
  }

  const filteredStrings = tlk.TLKStrings.filter((str, idx) => {
    if(!searchFilter) return true;
    const lowerFilter = searchFilter.toLowerCase();
    return (
      idx.toString().includes(lowerFilter) ||
      (str.Value && str.Value.toLowerCase().includes(lowerFilter)) ||
      (str.SoundResRef && str.SoundResRef.toLowerCase().includes(lowerFilter))
    );
  });

  const totalPages = Math.ceil(filteredStrings.length / tab.pageSize);
  const startIdx = currentPage * tab.pageSize;
  const endIdx = Math.min(startIdx + tab.pageSize, filteredStrings.length);
  const pageStrings = filteredStrings.slice(startIdx, endIdx);

  return (
    <div className="forge-tlk-editor">
      <MenuBar items={menuItems} />
      <div className="forge-tlk-editor__content">
        <div className="tlk-header">
          <h3>Talk Table Editor</h3>
          <div className="tlk-stats">
            <span>Total Strings: {tlk.StringCount}</span>
            <span>Language ID: {tlk.LanguageID}</span>
            <span>Version: {tlk.FileVersion}</span>
          </div>
        </div>

        <div className="tlk-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search by StrRef, text, or sound ResRef..."
            value={searchFilter}
            onChange={(e) => tab.setSearchFilter(e.target.value)}
          />
          <button
            className="clear-button"
            onClick={() => tab.setSearchFilter('')}
          >
            Clear
          </button>
        </div>

        <div className="tlk-table">
          <table>
            <thead>
              <tr>
                <th>StrRef</th>
                <th>Text</th>
                <th>Sound</th>
              </tr>
            </thead>
            <tbody>
              {pageStrings.map((str, pageIdx) => {
                const actualIndex = tlk.TLKStrings.indexOf(str);
                return (
                  <tr
                    key={actualIndex}
                    className={selectedIndex === actualIndex ? 'selected' : ''}
                    onClick={() => tab.selectString(actualIndex)}
                  >
                    <td className="strref-cell">{actualIndex}</td>
                    <td className="text-cell">{str.Value || '(empty)'}</td>
                    <td className="sound-cell">{str.SoundResRef || '(none)'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="tlk-pagination">
          <button
            disabled={currentPage === 0}
            onClick={() => tab.setPage(currentPage - 1)}
          >
            Previous
          </button>
          <span className="page-info">
            Page {currentPage + 1} of {totalPages}
            (Showing {startIdx + 1}-{endIdx} of {filteredStrings.length})
          </span>
          <button
            disabled={currentPage >= totalPages - 1}
            onClick={() => tab.setPage(currentPage + 1)}
          >
            Next
          </button>
        </div>

        {selectedIndex >= 0 && tlk.TLKStrings[selectedIndex] && (
          <div className="tlk-string-editor">
            <h4>Edit String [{selectedIndex}]</h4>
            <div className="string-details">
              <div className="property-group">
                <label>Text</label>
                <textarea
                  value={tlk.TLKStrings[selectedIndex].Value || ''}
                  onChange={(e) => {
                    tlk.TLKStrings[selectedIndex].Value = e.target.value;
                    tab.file.unsaved_changes = true;
                    // Force re-render
                    setTlk((prev) => (prev ? Object.assign(Object.create(Object.getPrototypeOf(prev)), {...prev}) : prev));
                  }}
                  rows={6}
                  placeholder="String text..."
                />
              </div>
              <div className="property-row">
                <div className="property-group">
                  <label>Sound ResRef</label>
                  <input
                    type="text"
                    value={tlk.TLKStrings[selectedIndex].SoundResRef || ''}
                    onChange={(e) => {
                      tlk.TLKStrings[selectedIndex].SoundResRef = e.target.value;
                      tab.file.unsaved_changes = true;
                      // Force a re-render by incrementing a dummy state, as TLKObject type may not be suitable for shallow copying
                      setTlk((prev) => (prev ? Object.assign(Object.create(Object.getPrototypeOf(prev)), {...prev}) : prev));
                    }}
                    placeholder="Sound file..."
                  />
                </div>
                <div className="property-group">
                  <label>Volume Variance</label>
                  <input
                    type="number"
                    value={tlk.TLKStrings[selectedIndex].VolumeVariance || 0}
                    readOnly
                    title="Volume Variance"
                    placeholder="Volume Variance"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
