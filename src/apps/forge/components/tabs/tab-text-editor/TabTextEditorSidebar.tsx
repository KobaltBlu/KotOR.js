import React, { useEffect, useState } from "react";
import { TabTextEditorState } from "../../../states/tabs";

interface TabTextEditorSidebarProps {
  tab: TabTextEditorState;
}

export const TabTextEditorSidebar = function(props: TabTextEditorSidebarProps){
  const tab = props.tab;
  const [bookmarks, setBookmarks] = useState(tab.bookmarks);
  const [snippets, setSnippets] = useState(tab.snippets);
  const [bookmarkDescription, setBookmarkDescription] = useState('');
  const [snippetName, setSnippetName] = useState('');
  const [snippetContent, setSnippetContent] = useState('');

  useEffect(() => {
    const onBookmarksChanged = () => {
      setBookmarks([ ...tab.bookmarks ]);
    };
    const onSnippetsChanged = () => {
      setSnippets([ ...tab.snippets ]);
    };

    tab.addEventListener('onBookmarksChanged', onBookmarksChanged);
    tab.addEventListener('onSnippetsChanged', onSnippetsChanged);

    return () => {
      tab.removeEventListener('onBookmarksChanged', onBookmarksChanged);
      tab.removeEventListener('onSnippetsChanged', onSnippetsChanged);
    };
  }, [tab]);

  const onAddBookmark = () => {
    tab.addBookmarkAtCursor(bookmarkDescription);
    setBookmarkDescription('');
  };

  const onAddSnippet = () => {
    if(!snippetName.trim()) return;
    tab.addSnippet(snippetName, snippetContent);
    setSnippetName('');
    setSnippetContent('');
  };

  return (
    <div className="forge-text-editor__sidebar">
      <div className="forge-text-editor__section">
        <div className="forge-text-editor__section-header">
          <span>Bookmarks</span>
          <button className="forge-text-editor__button" onClick={() => tab.clearBookmarks()}>Clear</button>
        </div>
        <div className="forge-text-editor__field">
          <input
            type="text"
            value={bookmarkDescription}
            placeholder="Bookmark description"
            onChange={(e) => setBookmarkDescription(e.target.value)}
          />
          <button className="forge-text-editor__button" onClick={onAddBookmark}>Add</button>
        </div>
        <div className="forge-text-editor__list">
          {bookmarks.length === 0 && (
            <div className="forge-text-editor__empty">No bookmarks</div>
          )}
          {bookmarks.map((bookmark) => (
            <div key={`bookmark-${bookmark.line}`} className="forge-text-editor__list-item">
              <button
                className="forge-text-editor__link"
                onClick={() => tab.goToLine(bookmark.line)}
              >
                {bookmark.line}
              </button>
              <span className="forge-text-editor__list-text">{bookmark.description}</span>
              <button
                className="forge-text-editor__icon-button"
                onClick={() => tab.removeBookmark(bookmark.line)}
                title="Remove bookmark"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="forge-text-editor__section">
        <div className="forge-text-editor__section-header">
          <span>Snippets</span>
        </div>
        <div className="forge-text-editor__field">
          <input
            type="text"
            value={snippetName}
            placeholder="Snippet name"
            onChange={(e) => setSnippetName(e.target.value)}
          />
        </div>
        <div className="forge-text-editor__field">
          <textarea
            value={snippetContent}
            placeholder="Snippet content"
            onChange={(e) => setSnippetContent(e.target.value)}
          />
          <button className="forge-text-editor__button" onClick={onAddSnippet}>Save</button>
        </div>
        <div className="forge-text-editor__list">
          {snippets.length === 0 && (
            <div className="forge-text-editor__empty">No snippets</div>
          )}
          {snippets.map((snippet) => (
            <div key={`snippet-${snippet.name}`} className="forge-text-editor__list-item">
              <button
                className="forge-text-editor__link"
                onClick={() => tab.insertSnippet(snippet.content)}
                title="Insert snippet"
              >
                {snippet.name}
              </button>
              <button
                className="forge-text-editor__icon-button"
                onClick={() => tab.removeSnippet(snippet.name)}
                title="Remove snippet"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
