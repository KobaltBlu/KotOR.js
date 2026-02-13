/**
 * DLGSearchBar component.
 *
 * Search, filter, and goto functionality for the DLG editor.
 * Based on PyKotor's search/find/goto implementation.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file DLGSearchBar.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

import { DLGNodeType } from '../../../../../enums/dialog/DLGNodeType';

import { DLGTreeNode } from '../../../interfaces/DLGTreeNode';
import { DLGTreeModel } from '../../../utils/DLGTreeModel';
import './DLGSearchBar.scss';

interface DLGSearchBarProps {
  model: DLGTreeModel;
  mode: 'search' | 'goto' | 'filter';
  onClose: () => void;
  onNavigate?: (node: DLGTreeNode) => void;
}

interface SearchResult {
  node: DLGTreeNode;
  matchType: 'text' | 'comment' | 'speaker' | 'tag';
  matchText: string;
}

export const DLGSearchBar: React.FC<DLGSearchBarProps> = ({
  model,
  mode,
  onClose,
  onNavigate
}) => {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [gotoSuggestions, setGotoSuggestions] = useState<DLGTreeNode[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input when opened
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const performSearch = useCallback((searchQuery: string, caseSens: boolean) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const term = caseSens ? searchQuery : searchQuery.toLowerCase();

    model.getAllNodes().forEach(node => {
      const text = caseSens ? node.dlgNode.text : node.dlgNode.text.toLowerCase();
      const comment = caseSens ? node.dlgNode.comment : node.dlgNode.comment.toLowerCase();
      const speaker = caseSens ? node.dlgNode.speakerTag : node.dlgNode.speakerTag.toLowerCase();

      if (text.includes(term)) {
        results.push({ node, matchType: 'text', matchText: node.dlgNode.text });
      } else if (comment.includes(term)) {
        results.push({ node, matchType: 'comment', matchText: node.dlgNode.comment });
      } else if (speaker.includes(term)) {
        results.push({ node, matchType: 'speaker', matchText: node.dlgNode.speakerTag });
      }
    });

    setSearchResults(results);
    setCurrentResultIndex(0);
  }, [model]);

  const parseGotoQuery = useCallback((gotoQuery: string) => {
    // Parse goto query like "entry 5" or "e5" or "reply[3]" or "r3"
    const patterns = [
      /^(?:entry|e)\s*(\d+)$/i,
      /^(?:reply|r)\s*(\d+)$/i,
      /^(?:start|s)\s*(\d+)$/i,
      /^entry\[(\d+)\]$/i,
      /^reply\[(\d+)\]$/i,
      /^start\[(\d+)\]$/i
    ];

    for (const pattern of patterns) {
      const match = gotoQuery.match(pattern);
      if (match) {
        const index = parseInt(match[1], 10);
        const type = pattern.toString().includes('reply') || pattern.toString().includes('r')
          ? DLGNodeType.REPLY
          : pattern.toString().includes('start') || pattern.toString().includes('s')
          ? DLGNodeType.STARTING
          : DLGNodeType.ENTRY;

        return { index, type };
      }
    }

    return null;
  }, []);

  const performGoto = useCallback((gotoQuery: string) => {
    const parsed = parseGotoQuery(gotoQuery);
    if (!parsed) {
      // Show suggestions
      const suggestions: DLGTreeNode[] = [];
      const lowerQuery = gotoQuery.toLowerCase();

      model.getAllNodes().forEach(node => {
        const text = node.dlgNode.text.toLowerCase();
        if (text.includes(lowerQuery)) {
          suggestions.push(node);
        }
      });

      setGotoSuggestions(suggestions.slice(0, 10));
      return;
    }

    // Navigate to specific node
    const nodes = model.filterNodes(node =>
      node.listIndex === parsed.index && node.nodeType === parsed.type
    );

    if (nodes.length > 0) {
      navigateToNode(nodes[0]);
    } else {
      setGotoSuggestions([]);
    }
  }, [model, parseGotoQuery]);

  const navigateToNode = useCallback((node: DLGTreeNode) => {
    // Expand ancestors
    let current: DLGTreeNode | undefined = node.parent;
    while (current) {
      model.expandNode(current.id);
      current = current.parent;
    }

    // Select node
    model.selectNode(node.id);

    if (onNavigate) {
      onNavigate(node);
    }

    onClose();
  }, [model, onNavigate, onClose]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (mode === 'search') {
      performSearch(value, caseSensitive);
    } else if (mode === 'goto') {
      performGoto(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (mode === 'search' && searchResults.length > 0) {
        navigateToNode(searchResults[currentResultIndex].node);
      } else if (mode === 'goto' && gotoSuggestions.length > 0) {
        navigateToNode(gotoSuggestions[0]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (mode === 'search' && searchResults.length > 0) {
        setCurrentResultIndex((prev) => (prev + 1) % searchResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (mode === 'search' && searchResults.length > 0) {
        setCurrentResultIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
      }
    }
  };

  const handleNextResult = () => {
    if (searchResults.length > 0) {
      const nextIndex = (currentResultIndex + 1) % searchResults.length;
      setCurrentResultIndex(nextIndex);
      navigateToNode(searchResults[nextIndex].node);
    }
  };

  const handlePrevResult = () => {
    if (searchResults.length > 0) {
      const prevIndex = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
      setCurrentResultIndex(prevIndex);
      navigateToNode(searchResults[prevIndex].node);
    }
  };

  const getPlaceholder = () => {
    switch (mode) {
      case 'search':
        return 'Search dialog text, comments, speakers...';
      case 'goto':
        return 'Go to node (e.g., "entry 5" or "e5")';
      case 'filter':
        return 'Filter nodes...';
      default:
        return '';
    }
  };

  const getNodeTypeLabel = (type: DLGNodeType): string => {
    switch (type) {
      case DLGNodeType.STARTING:
        return 'Start';
      case DLGNodeType.ENTRY:
        return 'Entry';
      case DLGNodeType.REPLY:
        return 'Reply';
      default:
        return 'Node';
    }
  };

  return (
    <div className="dlg-search-bar">
      <div className="dlg-search-input-container">
        <span className="dlg-search-icon">
          {mode === 'search' ? '🔍' : mode === 'goto' ? '🎯' : '🔽'}
        </span>

        <input
          ref={inputRef}
          type="text"
          className="dlg-search-input"
          placeholder={getPlaceholder()}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />

        {mode === 'search' && (
          <label className="dlg-search-option">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => {
                setCaseSensitive(e.target.checked);
                performSearch(query, e.target.checked);
              }}
            />
            Aa
          </label>
        )}

        {mode === 'search' && searchResults.length > 0 && (
          <div className="dlg-search-navigation">
            <button onClick={handlePrevResult} title="Previous result">
              ▲
            </button>
            <span className="dlg-search-count">
              {currentResultIndex + 1}/{searchResults.length}
            </span>
            <button onClick={handleNextResult} title="Next result">
              ▼
            </button>
          </div>
        )}

        <button className="dlg-search-close" onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      {mode === 'search' && searchResults.length > 0 && (
        <div className="dlg-search-results">
          {searchResults.map((result, index) => (
            <div
              key={result.node.id}
              className={`dlg-search-result ${index === currentResultIndex ? 'active' : ''}`}
              onClick={() => {
                setCurrentResultIndex(index);
                navigateToNode(result.node);
              }}
            >
              <div className="dlg-search-result-header">
                <span className="dlg-search-result-type">
                  {getNodeTypeLabel(result.node.nodeType)}[{result.node.listIndex}]
                </span>
                <span className="dlg-search-result-match">
                  {result.matchType}
                </span>
              </div>
              <div className="dlg-search-result-text">
                {result.matchText}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === 'goto' && gotoSuggestions.length > 0 && (
        <div className="dlg-goto-suggestions">
          {gotoSuggestions.map((node, index) => (
            <div
              key={node.id}
              className="dlg-goto-suggestion"
              onClick={() => navigateToNode(node)}
            >
              <span className="dlg-goto-suggestion-type">
                {getNodeTypeLabel(node.nodeType)}[{node.listIndex}]
              </span>
              <span className="dlg-goto-suggestion-text">
                {node.dlgNode.text || '(No text)'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
