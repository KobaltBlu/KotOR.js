import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { TabSaveGameEditorState } from "@/apps/forge/states/tabs/TabSaveGameEditorState";
import { MenuBar, MenuItem } from "@/apps/forge/components/common/MenuBar";
import { ForgeButton, ForgeInput } from "@/apps/forge/components/ui";
import { ForgeCheckbox } from "@/apps/forge/components/forge-checkbox/forge-checkbox";
import { SubTabHost } from "@/apps/forge/components/SubTabHost";
import type { SubTab } from "@/apps/forge/components/SubTabHost";
import { EditorFile } from "@/apps/forge/EditorFile";
import { DefaultEditorKind } from "@/apps/forge/settings/forgeSettings";
import {
  SaveAvailNpc,
  SaveErfKey,
  SaveGlobalBoolean,
  SaveGlobalLocation,
  SaveGlobalNumber,
  SaveGlobalString,
  SaveJournalEntry,
  SavePackedModule,
  SavePartyMember,
} from "@/apps/forge/savegame/saveGameDocument";
import { compareSaveModuleGffKeys, isSaveModuleGffExt } from "@/apps/forge/savegame/saveGamePaths";
import "@/apps/forge/components/tabs/tab-savegame-editor/TabSaveGameEditor.scss";

function formatPlayed(seconds: number): string {
  const total = Math.max(0, seconds | 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${m}m ${s}s`;
}

async function openUri(uri: string, kind?: DefaultEditorKind): Promise<void> {
  const { FileTypeManager } = await import("@/apps/forge/FileTypeManager");
  const file = new EditorFile({ path: uri });
  if (kind && kind !== "native") {
    FileTypeManager.openWithEditor(kind, file);
    return;
  }
  FileTypeManager.onOpenResource(file);
}

async function openAsErf(uri: string): Promise<void> {
  const [{ TabERFEditorState }, { ForgeState }] = await Promise.all([
    import("@/apps/forge/states/tabs/TabERFEditorState"),
    import("@/apps/forge/states/ForgeState"),
  ]);
  ForgeState.tabManager.addTab(new TabERFEditorState({
    editorFile: new EditorFile({ path: uri }),
  }));
}

export const TabSaveGameEditor = function (props: BaseTabProps) {
  const tab = props.tab as TabSaveGameEditorState;
  const [generation, setGeneration] = useState(tab.generation);
  const [historyVersion, setHistoryVersion] = useState(0);
  const shotRef = useRef<HTMLCanvasElement>(null);

  const refresh = useCallback(() => {
    setGeneration(tab.generation);
    setHistoryVersion((v) => v + 1);
  }, [tab]);

  useEffect(() => {
    const onLoad = () => refresh();
    tab.addEventListener("onEditorFileLoad", onLoad);
    tab.addEventListener("onHistoryChanged", onLoad);
    refresh();
    return () => {
      tab.removeEventListener("onEditorFileLoad", onLoad);
      tab.removeEventListener("onHistoryChanged", onLoad);
    };
  }, [tab, refresh]);

  const doc = tab.document;
  const nfo = doc?.nfoFields;
  const globals = doc?.globals;
  const party = doc?.party;

  useEffect(() => {
    const canvas = shotRef.current;
    const thumb = doc?.thumbnail;
    if (!canvas || !thumb) {
      return;
    }
    canvas.width = thumb.width;
    canvas.height = thumb.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const image = new ImageData(thumb.rgba, thumb.width, thumb.height);
    ctx.putImageData(image, 0, 0);
  }, [doc, generation]);

  const openLoose = useCallback((fileName: string, kind?: DefaultEditorKind) => {
    if (!tab.document) return;
    openUri(tab.document.looseFileUri(fileName), kind);
  }, [tab]);

  const openErf = useCallback((resRef: string, ext: string, kind?: DefaultEditorKind) => {
    if (!tab.document) return;
    openUri(tab.document.archiveResourceUri(resRef, ext), kind);
  }, [tab]);

  const openPackedGff = useCallback((moduleResRef: string, resRef: string, ext: string) => {
    void tab.openPackedModuleGff(moduleResRef, resRef, ext);
  }, [tab]);

  const menuItems: MenuItem[] = [
    {
      label: "File",
      children: [
        {
          label: "Save",
          shortcut: "Ctrl+S",
          onClick: () => {
            void tab.save();
          },
        },
      ],
    },
    {
      label: "Edit",
      children: [
        {
          label: "Undo",
          shortcut: "Ctrl+Z",
          disabled: !tab.canUndo,
          onClick: () => {
            tab.undo();
            refresh();
          },
        },
        {
          label: "Redo",
          shortcut: "Ctrl+Y",
          disabled: !tab.canRedo,
          onClick: () => {
            tab.redo();
            refresh();
          },
        },
      ],
    },
  ];

  const overview = useMemo(() => {
    if (!tab.loaded && !doc) {
      return <p className="tab-savegame-editor__muted">Loading save folder…</p>;
    }
    if (tab.loadError) {
      return <p className="tab-savegame-editor__muted">Failed to load save: {tab.loadError}</p>;
    }
    if (!doc || !nfo) {
      return <p className="tab-savegame-editor__muted">Loading save folder…</p>;
    }
    return (
      <div className="tab-savegame-editor__pane">
        {!!doc.loadWarnings.length && (
          <p className="tab-savegame-editor__muted">{doc.loadWarnings.join(" ")}</p>
        )}
        <div className="tab-savegame-editor__overview">
          <div>
            {doc.thumbnail ? (
              <canvas ref={shotRef} className="tab-savegame-editor__shot" />
            ) : (
              <div className="tab-savegame-editor__shot tab-savegame-editor__shot--empty">No Screen.tga</div>
            )}
            <div className="tab-savegame-editor__actions" style={{ marginTop: "0.5rem" }}>
              <ForgeButton size="sm" onClick={() => openLoose("Screen.tga")}>Open screenshot</ForgeButton>
            </div>
          </div>
          <div className="tab-savegame-editor__form">
            <label>Folder</label>
            <span>{doc.folderName}</span>
            <label>Save name</label>
            <ForgeInput
              value={nfo.saveGameName}
              onChange={(e) => {
                tab.markDirty("nfo.saveGameName");
                nfo.saveGameName = e.target.value;
                tab.tabName = nfo.saveGameName || doc.folderName;
                tab.notifyView();
              }}
            />
            <label>PC name</label>
            <ForgeInput
              value={nfo.pcName}
              onChange={(e) => {
                tab.markDirty("nfo.pcName");
                nfo.pcName = e.target.value;
                tab.notifyView();
              }}
            />
            <label>Area</label>
            <ForgeInput
              value={nfo.areaname}
              onChange={(e) => {
                tab.markDirty("nfo.areaname");
                nfo.areaname = e.target.value;
                tab.notifyView();
              }}
            />
            <label>Last module</label>
            <ForgeInput
              value={nfo.lastModule}
              onChange={(e) => {
                tab.markDirty("nfo.lastModule");
                nfo.lastModule = e.target.value;
                tab.notifyView();
              }}
            />
            <label>Time played (s)</label>
            <ForgeInput
              type="number"
              min={0}
              value={nfo.timePlayed}
              onChange={(e) => {
                tab.markDirty("nfo.timePlayed");
                nfo.timePlayed = Number(e.target.value) || 0;
                tab.notifyView();
              }}
            />
            <label>Played</label>
            <span>{formatPlayed(nfo.timePlayed)}</span>
            <label>Timestamp</label>
            <span>{nfo.timestampMs != null ? new Date(nfo.timestampMs).toLocaleString() : "—"}</span>
            <label>Portrait 0</label>
            <ForgeInput
              value={nfo.portrait0}
              onChange={(e) => {
                tab.markDirty("nfo.portrait0");
                nfo.portrait0 = e.target.value;
                tab.notifyView();
              }}
            />
            <label>Portrait 1</label>
            <ForgeInput
              value={nfo.portrait1}
              onChange={(e) => {
                tab.markDirty("nfo.portrait1");
                nfo.portrait1 = e.target.value;
                tab.notifyView();
              }}
            />
            <label>Portrait 2</label>
            <ForgeInput
              value={nfo.portrait2}
              onChange={(e) => {
                tab.markDirty("nfo.portrait2");
                nfo.portrait2 = e.target.value;
                tab.notifyView();
              }}
            />
            <label>Cheats</label>
            <ForgeCheckbox
              label="CHEATUSED"
              value={nfo.cheatUsed}
              onChange={(value) => {
                tab.markDirty();
                nfo.cheatUsed = value;
                tab.notifyView();
              }}
            />
          </div>
        </div>
        <div className="tab-savegame-editor__actions">
          <ForgeButton size="sm" onClick={() => openLoose("savenfo.res", "gff")}>Open savenfo.res as GFF</ForgeButton>
        </div>
      </div>
    );
  }, [doc, nfo, generation, historyVersion, openLoose, tab]);

  const partyPane = useMemo(() => {
    if (!doc || !party) {
      return <p className="tab-savegame-editor__muted">No PARTYTABLE.res</p>;
    }
    const pcKey = doc.findErfKey("pc", "utc");
    return (
      <div className="tab-savegame-editor__pane">
        <div className="tab-savegame-editor__form">
          <label>Gold</label>
          <ForgeInput
            type="number"
            min={0}
            value={party.gold}
            onChange={(e) => {
              tab.markDirty("party.gold");
              party.gold = Number(e.target.value) || 0;
              tab.notifyView();
            }}
          />
          {party.chemicalCount != null && (
            <>
              <label>Chemicals</label>
              <ForgeInput
                type="number"
                min={0}
                value={party.chemicalCount}
                onChange={(e) => {
                  tab.markDirty("party.chemical");
                  party.chemicalCount = Number(e.target.value) || 0;
                  tab.notifyView();
                }}
              />
            </>
          )}
          {party.componentCount != null && (
            <>
              <label>Components</label>
              <ForgeInput
                type="number"
                min={0}
                value={party.componentCount}
                onChange={(e) => {
                  tab.markDirty("party.component");
                  party.componentCount = Number(e.target.value) || 0;
                  tab.notifyView();
                }}
              />
            </>
          )}
        </div>

        <div className="tab-savegame-editor__actions">
          {pcKey && (
            <ForgeButton size="sm" onClick={() => openErf("pc", "utc")}>Open pc.utc</ForgeButton>
          )}
          <ForgeButton size="sm" onClick={() => openLoose("PARTYTABLE.res", "gff")}>Open PARTYTABLE.res as GFF</ForgeButton>
        </div>

        <h4 className="tab-savegame-editor__section-title">Current party</h4>
        <div className="tab-savegame-editor__grid-header tab-savegame-editor__party-members">
          <span>Leader</span>
          <span>Member ID</span>
          <span className="text-end">UTC</span>
        </div>
        {party.members.length === 0 && (
          <p className="tab-savegame-editor__muted">No companion members in PT_MEMBERS (PC is stored as pc.utc).</p>
        )}
        {party.members.map((member: SavePartyMember, index: number) => (
          <div className="tab-savegame-editor__grid-row tab-savegame-editor__party-members" key={`member-${index}`}>
            <ForgeCheckbox
              label=""
              value={member.isLeader}
              onChange={(value) => {
                tab.markDirty();
                member.isLeader = value;
                tab.notifyView();
              }}
            />
            <ForgeInput
              type="number"
              value={member.memberId}
              onChange={(e) => {
                tab.markDirty(`party.member.${index}`);
                member.memberId = Number(e.target.value);
                tab.notifyView();
              }}
            />
            <div className="tab-savegame-editor__actions">
              {doc.findErfKey(`availnpc${member.memberId}`, "utc") && (
                <ForgeButton size="sm" onClick={() => openErf(`availnpc${member.memberId}`, "utc")}>
                  Open UTC
                </ForgeButton>
              )}
            </div>
          </div>
        ))}

        <h4 className="tab-savegame-editor__section-title">Available NPCs</h4>
        <div className="tab-savegame-editor__grid-header tab-savegame-editor__avail">
          <span>ID</span>
          <span>Available</span>
          <span>Selectable</span>
          <span>Influence</span>
          <span className="text-end">UTC</span>
        </div>
        {party.availNpcs.map((npc: SaveAvailNpc, index: number) => (
          <div className="tab-savegame-editor__grid-row tab-savegame-editor__avail" key={`npc-${index}`}>
            <span>{index}</span>
            <ForgeCheckbox
              label=""
              value={npc.available}
              onChange={(value) => {
                tab.markDirty();
                npc.available = value;
                tab.notifyView();
              }}
            />
            <ForgeCheckbox
              label=""
              value={npc.canSelect}
              onChange={(value) => {
                tab.markDirty();
                npc.canSelect = value;
                tab.notifyView();
              }}
            />
            <ForgeInput
              type="number"
              value={npc.influence}
              onChange={(e) => {
                tab.markDirty(`party.npc.${index}.inf`);
                npc.influence = Number(e.target.value);
                tab.notifyView();
              }}
            />
            <div className="tab-savegame-editor__actions">
              {doc.findErfKey(`availnpc${index}`, "utc") && (
                <ForgeButton size="sm" onClick={() => openErf(`availnpc${index}`, "utc")}>
                  Open UTC
                </ForgeButton>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }, [doc, party, generation, historyVersion, openErf, openLoose, tab]);

  const globalsPane = useMemo(() => {
    if (!doc || !globals) {
      return <p className="tab-savegame-editor__muted">No GLOBALVARS.res</p>;
    }
    const renderNumberRow = (row: SaveGlobalNumber, index: number) => (
      <div className="tab-savegame-editor__grid-row tab-savegame-editor__globals" key={`num-${index}`}>
        <span>{row.name}</span>
        <ForgeInput
          type="number"
          min={0}
          max={255}
          value={row.value}
          onChange={(e) => {
            tab.markDirty(`glob.num.${row.name}`);
            row.value = Number(e.target.value) || 0;
            tab.notifyView();
          }}
        />
      </div>
    );
    const renderBoolRow = (row: SaveGlobalBoolean, index: number) => (
      <div className="tab-savegame-editor__grid-row tab-savegame-editor__globals" key={`bool-${index}`}>
        <span>{row.name}</span>
        <ForgeCheckbox
          label={row.value ? "true" : "false"}
          value={row.value}
          onChange={(value) => {
            tab.markDirty();
            row.value = value;
            tab.notifyView();
          }}
        />
      </div>
    );
    const renderStringRow = (row: SaveGlobalString, index: number) => (
      <div className="tab-savegame-editor__grid-row tab-savegame-editor__globals" key={`str-${index}`}>
        <span>{row.name}</span>
        <ForgeInput
          value={row.value}
          onChange={(e) => {
            tab.markDirty(`glob.str.${row.name}`);
            row.value = e.target.value;
            tab.notifyView();
          }}
        />
      </div>
    );
    const renderLocRow = (row: SaveGlobalLocation, index: number) => (
      <div className="tab-savegame-editor__grid-row tab-savegame-editor__globals" key={`loc-${index}`}>
        <span>{row.name}</span>
        <span className="tab-savegame-editor__muted">
          {row.x.toFixed(2)}, {row.y.toFixed(2)}, {row.z.toFixed(2)}
        </span>
      </div>
    );
    return (
      <div className="tab-savegame-editor__pane">
        <div className="tab-savegame-editor__actions">
          <ForgeButton size="sm" onClick={() => openLoose("GLOBALVARS.res", "gff")}>Open GLOBALVARS.res as GFF</ForgeButton>
        </div>
        <h4 className="tab-savegame-editor__section-title">Numbers</h4>
        <div className="tab-savegame-editor__grid-header tab-savegame-editor__globals">
          <span>Name</span>
          <span>Value</span>
        </div>
        {globals.numbers.map(renderNumberRow)}
        <h4 className="tab-savegame-editor__section-title">Booleans</h4>
        <div className="tab-savegame-editor__grid-header tab-savegame-editor__globals">
          <span>Name</span>
          <span>Value</span>
        </div>
        {globals.booleans.map(renderBoolRow)}
        <h4 className="tab-savegame-editor__section-title">Strings</h4>
        <div className="tab-savegame-editor__grid-header tab-savegame-editor__globals">
          <span>Name</span>
          <span>Value</span>
        </div>
        {globals.strings.map(renderStringRow)}
        <h4 className="tab-savegame-editor__section-title">Locations</h4>
        <div className="tab-savegame-editor__grid-header tab-savegame-editor__globals">
          <span>Name</span>
          <span>XYZ / facing</span>
        </div>
        {globals.locations.map(renderLocRow)}
      </div>
    );
  }, [doc, globals, generation, historyVersion, openLoose, tab]);

  const journalPane = useMemo(() => {
    const entries = party?.journal || [];
    return (
      <div className="tab-savegame-editor__pane">
        <div className="tab-savegame-editor__grid-header tab-savegame-editor__journal">
          <span>Plot ID</span>
          <span>State</span>
          <span>Date</span>
          <span>Time</span>
        </div>
        {entries.length === 0 && <p className="tab-savegame-editor__muted">No journal entries.</p>}
        {entries.map((entry: SaveJournalEntry, index: number) => (
          <div className="tab-savegame-editor__grid-row tab-savegame-editor__journal" key={`jnl-${index}`}>
            <ForgeInput
              value={entry.plotId}
              onChange={(e) => {
                tab.markDirty(`jnl.${index}.plot`);
                entry.plotId = e.target.value;
                tab.notifyView();
              }}
            />
            <ForgeInput
              type="number"
              value={entry.state}
              onChange={(e) => {
                tab.markDirty(`jnl.${index}.state`);
                entry.state = Number(e.target.value) || 0;
                tab.notifyView();
              }}
            />
            <ForgeInput
              type="number"
              value={entry.date}
              onChange={(e) => {
                tab.markDirty(`jnl.${index}.date`);
                entry.date = Number(e.target.value) || 0;
                tab.notifyView();
              }}
            />
            <ForgeInput
              type="number"
              value={entry.time}
              onChange={(e) => {
                tab.markDirty(`jnl.${index}.time`);
                entry.time = Number(e.target.value) || 0;
                tab.notifyView();
              }}
            />
          </div>
        ))}
      </div>
    );
  }, [party, generation, historyVersion, tab]);

  const filesPane = useMemo(() => {
    if (!doc) {
      return <p className="tab-savegame-editor__muted">Loading…</p>;
    }
    const erfLike = new Set(["sav", "erf", "mod"]);
    return (
      <div className="tab-savegame-editor__pane">
        <h4 className="tab-savegame-editor__section-title">Save folder</h4>
        <div className="tab-savegame-editor__grid-header tab-savegame-editor__files">
          <span>File</span>
          <span>Kind</span>
          <span className="text-end">Open</span>
        </div>
        {doc.looseFiles.map((entry) => {
          const ext = (entry.fileName.split(".").pop() || "").toLowerCase();
          const lowerName = entry.fileName.toLowerCase();
          const gffLoose = lowerName === "savenfo.res"
            || lowerName === "partytable.res"
            || lowerName === "globalvars.res"
            || lowerName === "pifo.ifo";
          return (
            <div className="tab-savegame-editor__grid-row tab-savegame-editor__files" key={entry.fileName}>
              <span>{entry.fileName}</span>
              <span className="tab-savegame-editor__muted">{ext}</span>
              <div className="tab-savegame-editor__actions">
                <ForgeButton size="sm" onClick={() => openLoose(entry.fileName)}>Native</ForgeButton>
                {gffLoose && (
                  <ForgeButton size="sm" onClick={() => openLoose(entry.fileName, "gff")}>GFF</ForgeButton>
                )}
                {lowerName === "savegame.sav" && (
                  <ForgeButton
                    size="sm"
                    onClick={() => {
                      void openAsErf(doc.looseFileUri(entry.fileName));
                    }}
                  >
                    ERF
                  </ForgeButton>
                )}
              </div>
            </div>
          );
        })}

        <h4 className="tab-savegame-editor__section-title">SAVEGAME.sav keys</h4>
        <div className="tab-savegame-editor__grid-header tab-savegame-editor__files">
          <span>Resource</span>
          <span>Type</span>
          <span className="text-end">Open</span>
        </div>
        {(doc.erfKeys as SaveErfKey[]).map((key) => (
          <div className="tab-savegame-editor__grid-row tab-savegame-editor__files" key={key.name}>
            <span>{key.name}</span>
            <span className="tab-savegame-editor__muted">{key.ext}</span>
            <div className="tab-savegame-editor__actions">
              <ForgeButton size="sm" onClick={() => openErf(key.resRef, key.ext)}>Native</ForgeButton>
              {isSaveModuleGffExt(key.ext) && (
                <ForgeButton size="sm" onClick={() => openErf(key.resRef, key.ext, "gff")}>GFF</ForgeButton>
              )}
              {erfLike.has(key.ext) && (
                <ForgeButton
                  size="sm"
                  onClick={() => {
                    void openAsErf(doc.archiveResourceUri(key.resRef, key.ext));
                  }}
                >
                  ERF
                </ForgeButton>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }, [doc, generation, openErf, openLoose]);

  const modulesPane = useMemo(() => {
    if (!doc) {
      return <p className="tab-savegame-editor__muted">Loading…</p>;
    }
    const modules = (doc.packedModules || []) as SavePackedModule[];
    if (!modules.length) {
      return <p className="tab-savegame-editor__muted">No packed module archives (.sav) inside SAVEGAME.sav.</p>;
    }
    return (
      <div className="tab-savegame-editor__pane">
        {modules.map((mod) => {
          const gffKeys = mod.resources.filter((key) => isSaveModuleGffExt(key.ext)).sort(compareSaveModuleGffKeys);
          return (
            <div key={mod.name}>
              <h4 className="tab-savegame-editor__section-title">{mod.name}</h4>
              <div className="tab-savegame-editor__grid-header tab-savegame-editor__modules">
                <span>Resource</span>
                <span>Type</span>
                <span className="text-end">Open</span>
              </div>
              {gffKeys.length === 0 && (
                <p className="tab-savegame-editor__muted">No GFF resources in this module.</p>
              )}
              {gffKeys.map((key) => (
                <div className="tab-savegame-editor__grid-row tab-savegame-editor__modules" key={`${mod.resRef}-${key.name}`}>
                  <span>{key.name}</span>
                  <span className="tab-savegame-editor__muted">{key.ext}</span>
                  <div className="tab-savegame-editor__actions">
                    <ForgeButton size="sm" onClick={() => openPackedGff(mod.resRef, key.resRef, key.ext)}>
                      GFF
                    </ForgeButton>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }, [doc, generation, openPackedGff]);

  const tabs: SubTab[] = [
    { id: "overview", label: "Overview", headerTitle: "Save overview", content: overview },
    { id: "party", label: "Party", headerTitle: "Party table", content: partyPane },
    { id: "globals", label: "Globals", headerTitle: "Global variables", content: globalsPane },
    { id: "journal", label: "Journal", headerTitle: "Journal", content: journalPane },
    { id: "modules", label: "Modules", headerTitle: "Packed modules", content: modulesPane },
    { id: "files", label: "Files", headerTitle: "Save files", content: filesPane },
  ];

  return (
    <div className="tab-savegame-editor">
      <MenuBar items={menuItems} />
      <div className="tab-savegame-editor__host">
        <SubTabHost tabs={tabs} defaultTab="overview" />
      </div>
    </div>
  );
};
