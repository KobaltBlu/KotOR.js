import React, { useState, useEffect, useCallback, useRef } from "react";
import { Modal, Form, ListGroup } from "react-bootstrap";
import { CommandPaletteState, CommandPaletteCommand } from "../states/CommandPaletteState";
import "./CommandPalette.scss";

export interface CommandPaletteProps {
  show: boolean;
  onHide: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ show, onHide }) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = CommandPaletteState.getFilteredCommands(query);
  const byCategory = commands.reduce<Record<string, CommandPaletteCommand[]>>((acc, cmd) => {
    const cat = cmd.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cmd);
    return acc;
  }, {});

  const flatCommands = Object.values(byCategory).flat();
  const safeIndex = Math.max(0, Math.min(selectedIndex, flatCommands.length - 1));

  const handleExecute = useCallback(
    (cmd: CommandPaletteCommand) => {
      CommandPaletteState.execute(cmd.id);
      onHide();
    },
    [onHide]
  );

  useEffect(() => {
    if (show) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [show]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatCommands.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = flatCommands[safeIndex];
        if (cmd) handleExecute(cmd);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onHide();
      }
    },
    [flatCommands, safeIndex, handleExecute, onHide]
  );

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop={true}
      keyboard={true}
      contentClassName="command-palette-modal"
    >
      <Modal.Body className="p-0">
        <Form.Control
          ref={inputRef}
          type="text"
          placeholder="Type to search commands…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          className="command-palette-input border-0 rounded-0 px-3 py-3"
        />
        <div className="command-palette-list">
          {flatCommands.length === 0 ? (
            <div className="text-muted p-3">No matching commands</div>
          ) : (
            <ListGroup variant="flush">
              {Object.entries(byCategory).map(([cat, cmds]) => (
                <React.Fragment key={cat}>
                  <ListGroup.Item className="command-palette-category text-muted small py-1">
                    {cat}
                  </ListGroup.Item>
                  {cmds.map((cmd, i) => {
                    const flatIdx = flatCommands.indexOf(cmd);
                    const isSelected = flatIdx === safeIndex;
                    return (
                      <ListGroup.Item
                        key={cmd.id}
                        action
                        active={isSelected}
                        onClick={() => handleExecute(cmd)}
                        onMouseEnter={() => setSelectedIndex(flatIdx)}
                        className="py-2"
                      >
                        {cmd.label}
                      </ListGroup.Item>
                    );
                  })}
                </React.Fragment>
              ))}
            </ListGroup>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
};
