import React, { useState, useEffect } from "react";
import * as KotOR from "../../KotOR";
import { TLKSearchModal } from "../TLKSearchModal";
import "./CExoLocStringEditor.scss";

export interface CExoLocStringEditorProps {
  value: KotOR.CExoLocString;
  onChange: (value: KotOR.CExoLocString) => void;
  label?: string;
}

const LANGUAGES = [
  { id: 0, name: 'English' },
  { id: 1, name: 'French' },
  { id: 2, name: 'German' },
  { id: 3, name: 'Italian' },
  { id: 4, name: 'Spanish' },
  { id: 5, name: 'Polish' },
  { id: 6, name: 'Korean' },
  { id: 7, name: 'Chinese (Traditional)' },
  { id: 8, name: 'Chinese (Simplified)' },
  { id: 9, name: 'Japanese' },
];

const GENDERS = [
  { id: 0, name: 'Male' },
  { id: 1, name: 'Female' },
];

export const CExoLocStringEditor: React.FC<CExoLocStringEditorProps> = ({
  value,
  onChange,
  label
}) => {
  const [expanded, setExpanded] = useState(false);
  const [resref, setResref] = useState(value.RESREF);
  const [substrings, setSubstrings] = useState(value.getStrings());
  const [showTLKModal, setShowTLKModal] = useState(false);
  
  // Store original values when editor is opened
  const [originalResref, setOriginalResref] = useState(value.RESREF);
  const [originalSubstrings, setOriginalSubstrings] = useState(value.getStrings());

  useEffect(() => {
    setResref(value.RESREF);
    setSubstrings(value.getStrings());
    if (!expanded) {
      // Update originals when not editing
      setOriginalResref(value.RESREF);
      setOriginalSubstrings(value.getStrings());
    }
  }, [value, expanded]);

  const handleResrefChange = (newResref: number) => {
    setResref(newResref);
    
    // If RESREF > -1, clear all substrings (mutual exclusion)
    if (newResref > -1) {
      setSubstrings([]);
    }
  };

  const handleTLKModalSelect = (index: number) => {
    handleResrefChange(index);
  };

  const handleSubstringChange = (index: number, field: 'language' | 'gender' | 'str', newValue: any) => {
    const updatedSubstrings = [...substrings];
    const substring = updatedSubstrings[index];
    
    if (field === 'language') {
      substring.setLanguage(Number(newValue));
    } else if (field === 'gender') {
      substring.setGender(Number(newValue));
    } else if (field === 'str') {
      substring.setString(newValue);
    }
    
    setSubstrings(updatedSubstrings);
  };

  const handleAddSubstring = () => {
    const newSubstring = new KotOR.CExoLocSubString(0, '');
    const updatedSubstrings = [...substrings, newSubstring];
    setSubstrings(updatedSubstrings);
    
    // When adding a substring, RESREF must be -1 (mutual exclusion)
    setResref(-1);
  };

  const handleRemoveSubstring = (index: number) => {
    const updatedSubstrings = substrings.filter((_, idx) => idx !== index);
    setSubstrings(updatedSubstrings);
  };

  const handleSave = () => {
    const newLocString = new KotOR.CExoLocString(resref);
    substrings.forEach((sub, idx) => {
      newLocString.addSubString(sub, idx);
    });
    onChange(newLocString);
    setExpanded(false);
  };

  const handleCancel = () => {
    // Revert to original values
    setResref(originalResref);
    setSubstrings([...originalSubstrings]);
    setExpanded(false);
  };

  const displayValue = value.getValue();

  return (
    <div className="cexoloc-editor">
      {label && <label className="cexoloc-label">{label}</label>}
      
      <div className="cexoloc-container">
        {/* Main input showing current value */}
        <div className="cexoloc-main-input-row">
          <input 
            type="text" 
            value={displayValue} 
            readOnly 
            className="cexoloc-display-input"
            placeholder="(empty)"
          />
          {!expanded ? (
            <button 
              type="button"
              onClick={() => setExpanded(true)}
              className="cexoloc-toggle-button"
            >
              Edit
            </button>
          ) : (
            <div className="cexoloc-button-group">
              <button 
                type="button"
                onClick={handleSave}
                className="cexoloc-save-button"
              >
                Save
              </button>
              <button 
                type="button"
                onClick={handleCancel}
                className="cexoloc-cancel-button"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Expanded editor */}
        {expanded && (
          <div className="cexoloc-expanded">
            <div className="cexoloc-resref-section">
              <label className="cexoloc-resref-label">
                TLK RESREF:
              </label>
              
              <div className="cexoloc-resref-display">
                {resref > -1 && KotOR.TLKManager.TLKStrings[resref] ? (
                  <div className="cexoloc-tlk-current">
                    <div className="cexoloc-tlk-info">
                      <span className="cexoloc-tlk-index">[{resref}]</span>
                      <span className="cexoloc-tlk-text">{KotOR.TLKManager.TLKStrings[resref].Value}</span>
                    </div>
                    <div className="cexoloc-tlk-actions">
                      <button 
                        type="button"
                        onClick={() => setShowTLKModal(true)}
                        className="cexoloc-inline-button cexoloc-search-icon-button"
                        title="Search TLK strings"
                      >
                        <i className="fa-solid fa-search"></i>
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleResrefChange(-1)}
                        className="cexoloc-inline-button cexoloc-clear-icon-button"
                        title="Clear TLK reference and use custom strings"
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="cexoloc-tlk-custom">
                    <div className="cexoloc-tlk-info">
                      <span className="cexoloc-tlk-index">[-1]</span>
                      <span className="cexoloc-tlk-text">Using custom strings</span>
                    </div>
                    <div className="cexoloc-tlk-actions">
                      <button 
                        type="button"
                        onClick={() => setShowTLKModal(true)}
                        className="cexoloc-inline-button cexoloc-search-icon-button"
                        title="Search TLK strings"
                      >
                        <i className="fa-solid fa-search"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <small className="cexoloc-resref-hint">
                {resref > -1 
                  ? 'Using TLK reference (substrings disabled). Click search to find a different string or × to use custom strings.' 
                  : 'Using custom strings. Add substrings below for different languages, or click search to use a TLK reference.'}
              </small>
            </div>

            <div className="cexoloc-substrings-section">
              <div className="cexoloc-substrings-header">
                <label className="cexoloc-substrings-label">
                  SubStrings ({substrings.length}):
                </label>
                <button 
                  type="button"
                  onClick={handleAddSubstring}
                  className="cexoloc-add-button"
                  disabled={resref > -1}
                  title={resref > -1 ? "Cannot add substrings when using TLK reference" : "Add a new substring"}
                >
                  + Add SubString
                </button>
              </div>

              {substrings.length === 0 && (
                <div className="cexoloc-empty-state">
                  {resref > -1 
                    ? 'Substrings disabled when using TLK reference. Set RESREF to -1 to add custom strings.'
                    : 'No substrings. Add one to provide custom text.'}
                </div>
              )}

              {substrings.map((substring, index) => (
                <div 
                  key={index}
                  className="cexoloc-substring"
                >
                  <div className="cexoloc-substring-controls">
                    <div className="cexoloc-substring-field">
                      <label className="cexoloc-substring-field-label">
                        Language:
                      </label>
                      <select 
                        value={substring.language}
                        onChange={(e) => handleSubstringChange(index, 'language', e.target.value)}
                        className="cexoloc-substring-select"
                      >
                        {LANGUAGES.map(lang => (
                          <option key={lang.id} value={lang.id}>{lang.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="cexoloc-substring-field">
                      <label className="cexoloc-substring-field-label">
                        Gender:
                      </label>
                      <select 
                        value={substring.gender}
                        onChange={(e) => handleSubstringChange(index, 'gender', e.target.value)}
                        className="cexoloc-substring-select"
                      >
                        {GENDERS.map(gender => (
                          <option key={gender.id} value={gender.id}>{gender.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="cexoloc-substring-remove-wrapper">
                      <button 
                        type="button"
                        onClick={() => handleRemoveSubstring(index)}
                        className="cexoloc-remove-button"
                        title="Remove SubString"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="cexoloc-substring-text">
                    <label className="cexoloc-substring-text-label">
                      Text (max 1024 chars):
                    </label>
                    <textarea 
                      value={substring.str}
                      onChange={(e) => handleSubstringChange(index, 'str', e.target.value)}
                      maxLength={1024}
                      rows={2}
                      className="cexoloc-substring-textarea"
                      placeholder="Enter text..."
                    />
                    <small className="cexoloc-char-counter">
                      {substring.str.length} / 1024 characters
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <TLKSearchModal 
        isOpen={showTLKModal}
        onClose={() => setShowTLKModal(false)}
        onSelect={handleTLKModalSelect}
        currentResref={resref}
      />
    </div>
  );
};

