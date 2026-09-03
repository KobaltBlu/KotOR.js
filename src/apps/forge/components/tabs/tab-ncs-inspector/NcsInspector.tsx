import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import path from "path";
import * as fs from "fs";
import { ForgeButton, ForgeDropdown } from "@/apps/forge/components/ui";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import { ForgeFileSystem } from "@/apps/forge/ForgeFileSystem";
import type { EditorFile } from "@/apps/forge/EditorFile";
import { nssEditorApi } from "@/apps/forge/nwscript-language/nssEditorApi";
import { compareNcsInspections, type NcsCompareRow } from "@/nwscript/inspect/ncsCompare";
import {
  formatNcsDisassembly,
  inspectNcs,
  instructionAtFileOffset,
  partAtFileOffset,
  searchNcsInstructions,
  type NcsInspectedInstruction,
  type NcsInspection,
  type NcsInstructionPart,
} from "@/nwscript/inspect/ncsInspection";
import {
  nearestNssLineForCodeOffset,
  type NssCodeLineMap,
} from "@/nwscript/inspect/nssCodeLineMap";
import type { NWScript } from "@/nwscript/NWScript";
import { OP_JSR } from "@/nwscript/NWScriptOPCodes";
import {
  getNcsInspectorLayoutMode,
  getNcsInspectorShowDetails,
  getNcsInspectorShowFunctions,
  setNcsInspectorLayoutMode,
  setNcsInspectorShowDetails,
  setNcsInspectorShowFunctions,
  type NcsInspectorLayoutMode,
} from "./ncsInspectorConfig";

import "@/apps/forge/components/tabs/tab-ncs-inspector/NcsInspector.scss";

const BYTES_PER_ROW = 16;

export interface NcsInspectorProps {
  bytes: Uint8Array;
  script?: NWScript;
  recoveredFunctions?: ReadonlyArray<{ codeOffset: number; name: string }>;
  nssLineMap?: NssCodeLineMap;
  onShowInNss?: (line: number) => void;
  onClose?: () => void;
  revealCodeOffset?: number;
  fileName?: string;
  editorFile?: EditorFile;
  compact?: boolean;
}

function padHex(value: number, width: number): string {
  const unsigned = value < 0 ? 0x100000000 + value : value;
  return unsigned.toString(16).toUpperCase().padStart(width, "0");
}

function formatPartValue(part: NcsInstructionPart, instruction: NcsInspectedInstruction): string {
  switch (part.kind) {
    case "relativeAddress":
      return instruction.opcode === OP_JSR
        ? `fn_${padHex(instruction.jumpTarget ?? 0, 8)}`
        : `off_${padHex(instruction.jumpTarget ?? 0, 8)}`;
    case "string":
      return `"${String(part.value ?? "")}"`;
    case "float":
      return String(part.value ?? "");
    case "actionId":
      return instruction.actionName
        ? `${instruction.actionName}(${padHex(Number(part.value ?? 0), 4)})`
        : padHex(Number(part.value ?? 0), 4);
    default:
      if (typeof part.value === "number") {
        return padHex(part.value, part.size * 2);
      }
      return String(part.value ?? "");
  }
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

async function saveTextFile(suggestedName: string, text: string): Promise<void> {
  const bytes = new TextEncoder().encode(text);
  if (typeof window.showSaveFilePicker === "function") {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: "Disassembly text", accept: { "text/plain": [".txt", ".asm"] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(bytes);
    await writable.close();
    return;
  }
  const blob = new Blob([bytes], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(url);
}

async function pickNcsFile(): Promise<{ name: string; bytes: Uint8Array } | null> {
  const response = await ForgeFileSystem.OpenFile({ ext: ["ncs"] });
  if (response.paths?.[0]) {
    const filePath = response.paths[0];
    const buffer = fs.readFileSync(filePath);
    return { name: path.basename(filePath), bytes: new Uint8Array(buffer) };
  }
  const handle = response.handles?.[0] as FileSystemFileHandle | undefined;
  if (handle && "getFile" in handle) {
    const file = await handle.getFile();
    return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
  }
  return null;
}

function actionSignature(actionId?: number): string | undefined {
  if (actionId == null) {
    return undefined;
  }
  try {
    const match = nssEditorApi.getEngineModel().functions.find((fn) => fn.actionId === actionId);
    return match?.signature;
  } catch {
    return undefined;
  }
}

export const NcsInspector: React.FC<NcsInspectorProps> = ({
  bytes,
  script,
  recoveredFunctions,
  nssLineMap,
  onShowInNss,
  onClose,
  revealCodeOffset,
  fileName,
  editorFile,
  compact,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [layoutMode, setLayoutMode] = useState<NcsInspectorLayoutMode>(getNcsInspectorLayoutMode);
  const [showFunctions, setShowFunctions] = useState(() => getNcsInspectorShowFunctions(!compact));
  const [showDetails, setShowDetails] = useState(() => getNcsInspectorShowDetails(false));
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedPart, setSelectedPart] = useState(0);
  const [compareRows, setCompareRows] = useState<NcsCompareRow[] | null>(null);
  const [compareName, setCompareName] = useState<string>("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => {
      setLayoutMode(getNcsInspectorLayoutMode());
      setShowFunctions(getNcsInspectorShowFunctions(!compact));
      setShowDetails(getNcsInspectorShowDetails(false));
    };
    window.addEventListener("forge-ncs-inspector-settings-change", sync);
    return () => window.removeEventListener("forge-ncs-inspector-settings-change", sync);
  }, [compact]);

  const inspection = useMemo<NcsInspection>(
    () => inspectNcs(bytes, { script, recoveredFunctions, actionsMap: script?.actionsMap }),
    [bytes, script, recoveredFunctions],
  );

  const searchHits = useMemo(
    () => (search.trim() ? new Set(searchNcsInstructions(inspection, search)) : new Set<number>()),
    [inspection, search],
  );

  const selected = inspection.instructions[selectedIndex];
  const selectedPartInfo = selected?.parts[selectedPart];

  useEffect(() => {
    setSelectedIndex(0);
    setSelectedPart(0);
    setCompareRows(null);
  }, [bytes]);

  useEffect(() => {
    if (revealCodeOffset == null) {
      return;
    }
    const index = inspection.instructions.findIndex(
      (instr) => revealCodeOffset >= instr.codeOffset && revealCodeOffset < instr.codeOffset + instr.size,
    );
    if (index >= 0) {
      setSelectedIndex(index);
      setSelectedPart(0);
    }
  }, [revealCodeOffset, inspection]);

  useEffect(() => {
    rowRefs.current.get(selectedIndex)?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const selectInstruction = useCallback((index: number, partIndex = 0) => {
    setSelectedIndex(Math.max(0, Math.min(index, inspection.instructions.length - 1)));
    setSelectedPart(partIndex);
  }, [inspection.instructions.length]);

  const jumpToCodeOffset = useCallback((codeOffset: number) => {
    let index = inspection.instructions.findIndex((instr) => instr.codeOffset === codeOffset);
    if (index < 0) {
      index = inspection.instructions.findIndex(
        (instr) => codeOffset >= instr.codeOffset && codeOffset < instr.codeOffset + instr.size,
      );
    }
    if (index >= 0) {
      selectInstruction(index, 0);
    }
  }, [inspection.instructions, selectInstruction]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && document.activeElement !== searchRef.current) {
      event.preventDefault();
      setSearchOpen(true);
      setTimeout(() => searchRef.current?.focus(), 0);
      return;
    }
    if (event.target instanceof HTMLInputElement) {
      if (event.key === "Enter" && searchHits.size) {
        const first = [...searchHits][0];
        selectInstruction(first);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectInstruction(selectedIndex + 1, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selectInstruction(selectedIndex - 1, 0);
    } else if (event.key === "Enter" && selected?.jumpTarget != null) {
      event.preventDefault();
      jumpToCodeOffset(selected.jumpTarget);
    }
  }, [jumpToCodeOffset, searchHits, selectInstruction, selected, selectedIndex]);

  const hexRows = useMemo(() => {
    const rows: Array<{ offset: number; bytes: number[] }> = [];
    for (let offset = 0; offset < inspection.fileBytes.length; offset += BYTES_PER_ROW) {
      const slice = inspection.fileBytes.subarray(offset, offset + BYTES_PER_ROW);
      rows.push({ offset, bytes: [...slice] });
    }
    return rows;
  }, [inspection.fileBytes]);

  const onByteClick = (fileOffset: number) => {
    const instruction = instructionAtFileOffset(inspection, fileOffset);
    if (!instruction) {
      return;
    }
    const part = partAtFileOffset(instruction, fileOffset);
    selectInstruction(instruction.index, part ? instruction.parts.indexOf(part) : 0);
  };

  const showInNss = () => {
    if (!selected || !nssLineMap || !onShowInNss) {
      return;
    }
    const line = nearestNssLineForCodeOffset(nssLineMap, selected.codeOffset);
    if (line != null) {
      onShowInNss(line);
    }
  };

  const changeLayout = (mode: NcsInspectorLayoutMode) => {
    setLayoutMode(mode);
    setNcsInspectorLayoutMode(mode);
  };

  const disassembly = useMemo(() => formatNcsDisassembly(inspection), [inspection]);
  const baseName = (fileName || "script").replace(/\.ncs$/i, "");

  return (
    <div
      ref={rootRef}
      className={`ncs-inspector${compact ? " ncs-inspector--compact" : ""}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="ncs-inspector__toolbar">
        <div className="ncs-inspector__modes">
          {(["split", "assembly", "bytecode"] as NcsInspectorLayoutMode[]).map((mode) => (
            <ForgeButton
              key={mode}
              size="sm"
              variant={layoutMode === mode ? "primary" : "secondary"}
              onClick={() => changeLayout(mode)}
            >
              {mode === "split" ? "Split" : mode === "assembly" ? "Asm" : "Bytes"}
            </ForgeButton>
          ))}
        </div>
        {searchOpen || search ? (
          <input
            ref={searchRef}
            className="ncs-inspector__search"
            placeholder="Offset, opcode, ACTION, or bytes"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onBlur={() => {
              if (!search) setSearchOpen(false);
            }}
          />
        ) : (
          <ForgeButton
            size="sm"
            variant="secondary"
            title="Search instructions (/)"
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchRef.current?.focus(), 0);
            }}
          >
            Search
          </ForgeButton>
        )}
        <ForgeButton
          size="sm"
          variant={showFunctions ? "primary" : "secondary"}
          onClick={() => {
            const next = !showFunctions;
            setShowFunctions(next);
            setNcsInspectorShowFunctions(next);
          }}
        >
          Functions
        </ForgeButton>
        <ForgeButton
          size="sm"
          variant={showDetails ? "primary" : "secondary"}
          onClick={() => {
            const next = !showDetails;
            setShowDetails(next);
            setNcsInspectorShowDetails(next);
          }}
        >
          Details
        </ForgeButton>
        <ForgeDropdown align="end">
          <ForgeDropdown.Toggle size="sm" variant="secondary">More</ForgeDropdown.Toggle>
          <ForgeDropdown.Menu>
            <ForgeDropdown.Item
              disabled={!inspection.instructions.length}
              onClick={() => void copyText(disassembly)}
            >
              Copy assembly
            </ForgeDropdown.Item>
            <ForgeDropdown.Item
              disabled={!inspection.instructions.length}
              onClick={() => void saveTextFile(`${baseName}.ncs.txt`, disassembly)}
            >
              Save disassembly…
            </ForgeDropdown.Item>
            <ForgeDropdown.Item
              onClick={async () => {
                const picked = await pickNcsFile();
                if (!picked) return;
                setCompareName(picked.name);
                setCompareRows(compareNcsInspections(
                  inspection,
                  inspectNcs(picked.bytes, { recoveredFunctions }),
                ));
              }}
            >
              Compare NCS…
            </ForgeDropdown.Item>
            <ForgeDropdown.Divider />
            <ForgeDropdown.Item
              onClick={() => {
                FileTypeManager.openHexEditor({
                  buffer: bytes,
                  filename: editorFile?.getFilename?.() || `${baseName}.ncs`,
                  resref: editorFile?.resref || baseName,
                  ext: "ncs",
                  path: editorFile?.path,
                  handle: editorFile?.handle,
                  archive_path: editorFile?.archive_path,
                  useGameFileSystem: editorFile?.useGameFileSystem,
                  useProjectFileSystem: editorFile?.useProjectFileSystem,
                  useSystemFileSystem: editorFile?.useSystemFileSystem,
                });
              }}
            >
              Open in hex editor
            </ForgeDropdown.Item>
          </ForgeDropdown.Menu>
        </ForgeDropdown>
        {onClose && (
          <ForgeButton
            size="sm"
            variant="secondary"
            className="ncs-inspector__close"
            title="Close inspector"
            aria-label="Close inspector"
            onClick={onClose}
          >
            ×
          </ForgeButton>
        )}
      </div>

      {inspection.inspectError && (
        <div className="ncs-inspector__error">{inspection.inspectError}</div>
      )}

      <div className="ncs-inspector__body">
        <div className="ncs-inspector__panes">
          {layoutMode !== "bytecode" && (
            <div className="ncs-inspector__asm">
              {inspection.instructions.map((instruction) => (
                <button
                  key={instruction.codeOffset}
                  type="button"
                  ref={(el) => {
                    if (el) rowRefs.current.set(instruction.index, el);
                    else rowRefs.current.delete(instruction.index);
                  }}
                  className={[
                    "ncs-inspector__row",
                    instruction.index === selectedIndex ? "ncs-inspector__row--active" : "",
                    searchHits.has(instruction.index) ? "ncs-inspector__row--search" : "",
                  ].join(" ")}
                  onClick={() => selectInstruction(instruction.index, 0)}
                >
                  <span>{padHex(instruction.fileOffset, 8)}  </span>
                  <span>{instruction.mnemonic.padEnd(10, " ")}</span>
                  {instruction.parts.slice(2).map((part, partIndex) => {
                    const index = partIndex + 2;
                    const jump = part.kind === "relativeAddress" && instruction.jumpTarget != null;
                    return (
                      <span
                        key={`${part.kind}-${part.fileOffset}`}
                        className={[
                          "ncs-inspector__operand",
                          instruction.index === selectedIndex && selectedPart === index ? "ncs-inspector__operand--active" : "",
                          jump ? "ncs-inspector__operand--jump" : "",
                        ].join(" ")}
                        onClick={(event) => {
                          event.stopPropagation();
                          selectInstruction(instruction.index, index);
                          if (jump) {
                            jumpToCodeOffset(instruction.jumpTarget as number);
                          }
                        }}
                      >
                        {` ${formatPartValue(part, instruction)}`}
                      </span>
                    );
                  })}
                </button>
              ))}
            </div>
          )}
          {layoutMode !== "assembly" && (
            <div className="ncs-inspector__hex">
              {hexRows.map((row) => (
                <div key={row.offset} className="ncs-inspector__hex-row">
                  <span className="ncs-inspector__offset">{padHex(row.offset, 8)}</span>
                  <span>
                    {row.bytes.map((value, col) => {
                      const fileOffset = row.offset + col;
                      const inHeader = fileOffset < inspection.header.headerSize;
                      const inInstr = selected
                        && fileOffset >= selected.fileOffset
                        && fileOffset < selected.fileOffset + selected.size;
                      const inPart = selectedPartInfo
                        && fileOffset >= selectedPartInfo.fileOffset
                        && fileOffset < selectedPartInfo.fileOffset + Math.max(selectedPartInfo.size, 1);
                      return (
                        <span
                          key={fileOffset}
                          className={[
                            "ncs-inspector__byte",
                            inHeader ? "ncs-inspector__byte--header" : "",
                            inInstr ? "ncs-inspector__byte--instr" : "",
                            inPart ? "ncs-inspector__byte--part" : "",
                          ].join(" ")}
                          onClick={() => onByteClick(fileOffset)}
                        >
                          {padHex(value, 2)}
                        </span>
                      );
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
          {showFunctions && (
            <div className="ncs-inspector__functions">
              <div className="ncs-inspector__functions-title">Functions</div>
              {inspection.functions.length === 0 && <div>No JSR targets</div>}
              {inspection.functions.map((fn) => (
                <button
                  key={`${fn.kind}-${fn.codeOffset}`}
                  type="button"
                  className={[
                    "ncs-inspector__function",
                    selected?.codeOffset === fn.codeOffset ? "ncs-inspector__function--active" : "",
                  ].join(" ")}
                  onClick={() => jumpToCodeOffset(fn.codeOffset)}
                >
                  {fn.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {showDetails && (
        <div className="ncs-inspector__details">
          <div className="ncs-inspector__details-title">
            {selected ? `${selected.mnemonic} @ ${padHex(selected.fileOffset, 8)}` : "Details"}
            {onShowInNss && (
              <ForgeButton
                size="sm"
                variant="link"
                disabled={!selected || !nssLineMap}
                onClick={showInNss}
              >
                Reveal in NSS
              </ForgeButton>
            )}
          </div>
          {!selected && (
            <div>
              Header {inspection.header.hasHeader ? inspection.header.magic : "(none / ScriptSituation)"}
              {inspection.header.declaredSize != null ? ` size=${inspection.header.declaredSize}` : ""}
            </div>
          )}
          {selected && (
            <>
              <div>Code offset {padHex(selected.codeOffset, 8)} · file offset {padHex(selected.fileOffset, 8)} · size {selected.size}</div>
              <div>Opcode {padHex(selected.opcode, 2)} · type {padHex(selected.aux, 2)}</div>
              {selectedPartInfo && (
                <div>
                  Field {selectedPartInfo.label}: {formatPartValue(selectedPartInfo, selected)}
                  {" "}({selectedPartInfo.size} byte{selectedPartInfo.size === 1 ? "" : "s"} @ {padHex(selectedPartInfo.fileOffset, 8)})
                </div>
              )}
              {selected.jumpTarget != null && (
                <div>
                  Target{" "}
                  <button
                    type="button"
                    className="ncs-inspector__operand ncs-inspector__operand--jump"
                    onClick={() => jumpToCodeOffset(selected.jumpTarget as number)}
                  >
                    {padHex(selected.jumpTarget, 8)}
                  </button>
                </div>
              )}
              {selected.actionId != null && (
                <div>
                  ACTION #{selected.actionId} {selected.actionName || ""}
                  {actionSignature(selected.actionId) ? ` — ${actionSignature(selected.actionId)}` : ""}
                </div>
              )}
            </>
          )}
        </div>
        )}

        {compareRows && (
          <div className="ncs-inspector__compare">
            <div className="ncs-inspector__details-title">Compare with {compareName}</div>
            <ForgeButton size="sm" variant="secondary" onClick={() => setCompareRows(null)}>Close compare</ForgeButton>
            {compareRows.filter((row) => row.kind !== "equal").map((row, index) => (
              <button
                key={index}
                type="button"
                className={`ncs-inspector__compare-row ncs-inspector__compare-row--${row.kind}`}
                onClick={() => {
                  const offset = row.left?.fileOffset ?? row.right?.fileOffset;
                  if (offset == null) return;
                  const instr = instructionAtFileOffset(inspection, offset);
                  if (instr) selectInstruction(instr.index, 0);
                }}
              >
                <span>{row.kind}</span>
                <span>{row.left?.assembly || "—"}</span>
                <span>{row.right?.assembly || "—"}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
