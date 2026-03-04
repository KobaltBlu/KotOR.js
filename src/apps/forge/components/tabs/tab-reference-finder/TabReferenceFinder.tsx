import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Form, Table, Button, Spinner, Alert } from "react-bootstrap";

import type { EventListenerCallback } from "@/apps/forge/EventListenerModel";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import type { ReferenceHit, ReferenceScope } from "@/apps/forge/helpers/ReferenceFinder";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ModalReferenceSearchOptionsState } from "@/apps/forge/states/modal/ModalReferenceSearchOptionsState";
import { TabReferenceFinderState } from "@/apps/forge/states/tabs/TabReferenceFinderState";

export type TabReferenceFinderEventType = "onResults" | "onSearchState" | "onError";

export interface TabReferenceFinderProps {
  tab: TabReferenceFinderState;
}

export const TabReferenceFinder = function TabReferenceFinder(props: TabReferenceFinderProps) {
  const tab = props.tab;

  const [query, setQuery] = useState(tab.query);
  const [scope, setScope] = useState<ReferenceScope>(tab.scope);
  const [caseSensitive, setCaseSensitive] = useState<boolean>(tab.caseSensitive);

  const [searching, setSearching] = useState<boolean>(tab.searching);
  const [results, setResults] = useState(tab.results);
  const [error, setError] = useState<string | undefined>(tab.lastError);

  useEffect(() => {
    const onResults: EventListenerCallback = (...args: unknown[]) => setResults([...(args[0] as ReferenceHit[])]);
    const onSearchState: EventListenerCallback = (...args: unknown[]) => setSearching(!!args[0]);
    const onError: EventListenerCallback = (...args: unknown[]) => setError(String(args[0]));

    tab.addEventListener("onResults" as TabReferenceFinderEventType, onResults);
    tab.addEventListener("onSearchState" as TabReferenceFinderEventType, onSearchState);
    tab.addEventListener("onError" as TabReferenceFinderEventType, onError);

    return () => {
      tab.removeEventListener("onResults" as TabReferenceFinderEventType, onResults);
      tab.removeEventListener("onSearchState" as TabReferenceFinderEventType, onSearchState);
      tab.removeEventListener("onError" as TabReferenceFinderEventType, onError);
    };
  }, [tab]);

  const onRun = useCallback(async () => {
    tab.query = query;
    tab.scope = scope;
    tab.caseSensitive = caseSensitive;
    setError(undefined);
    await tab.runSearch();
  }, [tab, query, scope, caseSensitive]);

  const onOpenOptions = useCallback(() => {
    const modal = new ModalReferenceSearchOptionsState({
      defaultPartialMatch: tab.partialMatch,
      defaultCaseSensitive: tab.caseSensitive,
      defaultFilePattern: tab.filePattern,
      defaultFileTypes: tab.fileTypes,
      onApply: (options) => {
        tab.partialMatch = options.partialMatch;
        tab.caseSensitive = options.caseSensitive;
        tab.filePattern = options.filePattern;
        tab.fileTypes = options.fileTypes;
        setCaseSensitive(options.caseSensitive);
      },
    });
    modal.attachToModalManager(ForgeState.modalManager);
    modal.open();
  }, [tab]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onRun();
      }
    },
    [onRun]
  );

  const resultRows = useMemo(() => {
    return results.map((r, idx) => (
      <tr key={`${r.scope}-${r.path}-${idx}`}>
        <td style={{ width: 90 }}>{r.scope}</td>
        <td>{r.displayName}</td>
        <td style={{ width: 110, textAlign: "right" }}>{r.occurrences}</td>
        <td style={{ width: 120, textAlign: "right" }}>
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => FileTypeManager.onOpenResource(r.editorFile)}
          >
            Open
          </Button>
        </td>
      </tr>
    ));
  }, [results]);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
        <Form.Group style={{ minWidth: 280, flex: 1 }}>
          <Form.Label>Query</Form.Label>
          <Form.Control
            type="text"
            value={query}
            placeholder="e.g. tar03, p_malak, my_dialog"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={searching}
          />
        </Form.Group>

        <Form.Group style={{ width: 170 }}>
          <Form.Label>Scope</Form.Label>
          <Form.Select
            value={scope}
            onChange={(e) => setScope(e.target.value as ReferenceScope)}
            disabled={searching}
          >
            <option value="project">Project</option>
            <option value="game">Game (name only)</option>
            <option value="both">Both</option>
          </Form.Select>
        </Form.Group>

        <Form.Group style={{ width: 160 }}>
          <Form.Check
            type="checkbox"
            label="Case sensitive"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            disabled={searching}
          />
        </Form.Group>

        <Button variant="primary" onClick={onRun} disabled={searching}>
          {searching ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
              <span style={{ marginLeft: 8 }}>Searching…</span>
            </>
          ) : (
            "Search"
          )}
        </Button>

        <Button variant="outline-light" onClick={onOpenOptions} disabled={searching}>
          Options…
        </Button>
      </div>

      {error ? (
        <Alert variant="danger" style={{ marginTop: 12 }}>
          {error}
        </Alert>
      ) : null}

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
        <div style={{ color: "#999" }}>{results.length} result(s)</div>
      </div>

      <div style={{ marginTop: 10, maxHeight: "calc(100vh - 230px)", overflow: "auto" }}>
        <Table striped bordered hover size="sm" variant="dark">
          <thead>
            <tr>
              <th>Scope</th>
              <th>File</th>
              <th style={{ textAlign: "right" }}>Hits</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>{resultRows}</tbody>
        </Table>
      </div>
    </div>
  );
};
