/**
 * Modal: create a new Forge project from a .mod / .rim / .erf archive.
 *
 * @file ModalNewProjectFromMod.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useEffect, useState } from "react";
import { BaseModalProps } from "@/apps/forge/interfaces/modal/BaseModalProps";
import {
  ForgeButton,
  ForgeDialog,
  ForgeInput,
  ForgeInputGroup,
  ForgeProgress,
  ForgeSelect,
} from "@/apps/forge/components/ui";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeFileSystem, ForgeFileSystemResponseType } from "@/apps/forge/ForgeFileSystem";
import {
  canCreateForgeProject,
  resolveProjectGame,
  type ProjectStorageMode,
} from "@/apps/forge/helpers/projectCreateOptions";
import {
  createForgeProjectFromModule,
  projectNameFromModuleArchive,
} from "@/apps/forge/helpers/createForgeProjectFromModule";
import {
  companionRimFilename,
  inspectModuleArchive,
  tryReadCompanionRim,
  type ModuleArchivePreview,
} from "@/apps/forge/helpers/importModuleArchive";
import {
  MODULE_ARCHIVE_EXTS,
  readPickedModuleArchive,
} from "@/apps/forge/helpers/moduleArchivePicker";
import { GameEngineType } from "@/enums/engine/GameEngineType";

interface ProjectDirectory {
  path?: string;
  name?: string;
  handle?: FileSystemDirectoryHandle;
}

function defaultStorageMode(): ProjectStorageMode {
  return KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER ? "virtual" : "local";
}

function defaultProjectGame(): GameEngineType {
  return resolveProjectGame(KotOR.GameState.GameKey || KotOR.ApplicationProfile.GameKey);
}

export const ModalNewProjectFromMod = (props: BaseModalProps) => {
  const modal = props.modal;
  const [show, setShow] = useState(modal.visible);
  const [projectName, setProjectName] = useState("");
  const [projectGame, setProjectGame] = useState<GameEngineType>(defaultProjectGame);
  const [projectDirectory, setProjectDirectory] = useState<ProjectDirectory>();
  const [storageMode, setStorageMode] = useState<ProjectStorageMode>(defaultStorageMode());
  const [archiveName, setArchiveName] = useState("");
  const [archiveBuffer, setArchiveBuffer] = useState<Uint8Array>();
  const [preview, setPreview] = useState<ModuleArchivePreview>();
  const [companionName, setCompanionName] = useState("");
  const [companionBuffer, setCompanionBuffer] = useState<Uint8Array>();
  const [includeCompanion, setIncludeCompanion] = useState(false);
  const [openEditorAfter, setOpenEditorAfter] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; filename: string }>();

  useEffect(() => {
    const onHide = () => setShow(false);
    const onShow = () => setShow(true);
    modal.addEventListener("onHide", onHide);
    modal.addEventListener("onShow", onShow);
    return () => {
      modal.removeEventListener("onHide", onHide);
      modal.removeEventListener("onShow", onShow);
    };
  }, [modal]);

  const resetArchive = () => {
    setArchiveName("");
    setArchiveBuffer(undefined);
    setPreview(undefined);
    setCompanionName("");
    setCompanionBuffer(undefined);
    setIncludeCompanion(false);
    setProgress(undefined);
  };

  const applyPickedArchive = async (picked: { buffer: Uint8Array; name: string; path?: string }) => {
    setError("");
    setBusy(true);
    try {
      const next = await inspectModuleArchive(picked.buffer, picked.name);
      if (!next.hasModuleIfo) {
        setError("Archive does not contain module.ifo. Choose a module .mod, .rim, or .erf.");
        resetArchive();
        return;
      }
      setArchiveName(picked.name);
      setArchiveBuffer(picked.buffer);
      setPreview(next);
      setCompanionName("");
      setCompanionBuffer(undefined);
      setIncludeCompanion(false);
      if (!String(projectName || "").trim()) {
        setProjectName(projectNameFromModuleArchive(picked.name));
      }
      const companion = next.companionFilename;
      if (picked.path && companion) {
        const sibling = await tryReadCompanionRim(picked.path);
        if (sibling) {
          setCompanionName(sibling.name);
          setCompanionBuffer(sibling.buffer);
          setIncludeCompanion(true);
        }
      }
    } catch (e) {
      console.error(e);
      setError("Could not read that archive. Choose a .mod, .rim, or .erf module file.");
      resetArchive();
    } finally {
      setBusy(false);
    }
  };

  const pickArchive = async () => {
    const response = await ForgeFileSystem.OpenFile({ ext: MODULE_ARCHIVE_EXTS });
    const picked = await readPickedModuleArchive(response);
    if (!picked) {
      return;
    }
    await applyPickedArchive(picked);
  };

  const pickCompanion = async () => {
    const response = await ForgeFileSystem.OpenFile({ ext: ["rim"] });
    const picked = await readPickedModuleArchive(response);
    if (!picked) {
      return;
    }
    setCompanionName(picked.name);
    setCompanionBuffer(picked.buffer);
    setIncludeCompanion(true);
  };

  const handleSelectProjectDirectory = () => {
    ForgeFileSystem.showOpenDirectoryDialog().then((response) => {
      if (response.cancelled) {
        return;
      }
      if (response.type === ForgeFileSystemResponseType.FILE_SYSTEM_HANDLE) {
        setProjectDirectory({
          name: response.handle?.name,
          path: response.handle?.name as string,
          handle: response.handle as FileSystemDirectoryHandle,
        });
      }
      if (response.type === ForgeFileSystemResponseType.FILE_PATH_STRING) {
        setProjectDirectory({
          name: response.path?.split("/").pop(),
          path: response.path as string,
          handle: undefined,
        });
      }
    });
  };

  const createEnabled =
    !!archiveBuffer &&
    !!preview &&
    preview.hasModuleIfo &&
    canCreateForgeProject({
      name: projectName,
      game: projectGame,
      storage: storageMode,
      directory: projectDirectory,
    }) &&
    !busy;

  const handleCreate = async () => {
    if (!createEnabled || !archiveBuffer || !archiveName) {
      return;
    }
    setBusy(true);
    setError("");
    setProgress(undefined);
    try {
      const result = await createForgeProjectFromModule({
        name: projectName,
        game: projectGame,
        storage: storageMode,
        directory: projectDirectory,
        buffer: archiveBuffer,
        filename: archiveName,
        companionBuffer,
        includeCompanion: includeCompanion && !!companionBuffer,
        openEditor: openEditorAfter,
        onProgress: (current, total, filename) => setProgress({ current, total, filename }),
      });
      if (!result.ok) {
        setError(result.reason || "Failed to create project from module.");
        return;
      }
      const warnings = result.warnings?.length
        ? result.warnings
        : result.import?.warnings || [];
      if (warnings.length) {
        window.alert(warnings.join("\n"));
      }
      modal.close();
    } catch (e) {
      console.error(e);
      setError("Failed to create project from module.");
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  const showCompanion = !!preview && preview.kind === "rim" && !preview.isCompanionRim;
  const companionHint = preview?.companionFilename || companionRimFilename(archiveName) || "name_s.rim";

  return (
    <ForgeDialog
      show={show}
      onHide={() => modal.close()}
      backdrop="static"
      keyboard={!busy}
    >
      <ForgeDialog.Header closeButton>
        <ForgeDialog.Title>{modal.title}</ForgeDialog.Title>
      </ForgeDialog.Header>

      <ForgeDialog.Body>
        <p>
          Create a project and unpack a <code>.mod</code>, <code>.rim</code>, or <code>.erf</code> as loose files.
        </p>

        <ForgeInputGroup>
          <ForgeInputGroup.Text>Archive</ForgeInputGroup.Text>
          <ForgeInput type="text" value={archiveName} readOnly placeholder="No file selected" />
          <ForgeButton variant="primary" onClick={() => { void pickArchive(); }} disabled={busy}>
            Locate
          </ForgeButton>
        </ForgeInputGroup>

        {preview ? (
          <p>
            {preview.resourceCount} resource{preview.resourceCount === 1 ? "" : "s"}
            {preview.hasModuleIfo ? " · contains module.ifo" : " · no module.ifo"}
            {preview.entryArea ? ` · entry area ${preview.entryArea}` : ""}
            {preview.entryArea
              ? preview.hasLayout
                ? " · has .lyt"
                : preview.layoutInGame
                  ? " · .lyt from game files"
                  : " · missing .lyt"
              : ""}
          </p>
        ) : null}

        {preview?.warnings?.length ? (
          <ul style={{ color: preview.layoutInGame || preview.visInGame ? "#c9a227" : "#d9534f", marginTop: 0 }}>
            {preview.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}

        {showCompanion ? (
          <div>
            <label>
              <input
                type="checkbox"
                checked={includeCompanion && !!companionBuffer}
                disabled={!companionBuffer || busy}
                onChange={(e) => setIncludeCompanion(e.target.checked)}
              />
              {" "}Include companion <code>{companionHint}</code>
            </label>
            <ForgeInputGroup>
              <ForgeInputGroup.Text>Companion</ForgeInputGroup.Text>
              <ForgeInput type="text" value={companionName} readOnly placeholder="Optional _s.rim" />
              <ForgeButton variant="primary" onClick={() => { void pickCompanion(); }} disabled={busy}>
                Locate
              </ForgeButton>
            </ForgeInputGroup>
          </div>
        ) : null}

        <h3>Project Details</h3>

        <ForgeInputGroup>
          <ForgeInputGroup.Text>Name</ForgeInputGroup.Text>
          <ForgeInput type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} disabled={busy} />
        </ForgeInputGroup>

        <ForgeInputGroup>
          <ForgeInputGroup.Text>Storage</ForgeInputGroup.Text>
          <ForgeSelect
            value={storageMode}
            onChange={(e) => setStorageMode(e.target.value as ProjectStorageMode)}
            disabled={busy}
          >
            <option value="virtual">Virtual folder</option>
            <option value="local">Local folder</option>
          </ForgeSelect>
        </ForgeInputGroup>

        {storageMode === "local" && (
          <ForgeInputGroup>
            <ForgeInputGroup.Text>Directory</ForgeInputGroup.Text>
            <ForgeInput
              type="text"
              value={projectDirectory?.name || ""}
              onChange={(e) => setProjectDirectory({ path: e.target.value })}
              disabled={busy}
            />
            <ForgeButton variant="primary" onClick={handleSelectProjectDirectory} disabled={busy}>
              Locate
            </ForgeButton>
          </ForgeInputGroup>
        )}

        <ForgeInputGroup>
          <ForgeInputGroup.Text>Game</ForgeInputGroup.Text>
          <ForgeSelect
            value={projectGame}
            onChange={(e) => setProjectGame(resolveProjectGame(e.target.value))}
            disabled={busy}
          >
            <option value={GameEngineType.KOTOR}>KotOR</option>
            <option value={GameEngineType.TSL}>TSL</option>
          </ForgeSelect>
        </ForgeInputGroup>

        <label>
          <input
            type="checkbox"
            checked={openEditorAfter}
            disabled={busy}
            onChange={(e) => setOpenEditorAfter(e.target.checked)}
          />
          {" "}Open module editor after create
        </label>

        {progress ? (
          <ForgeProgress
            value={progress.total ? (progress.current / progress.total) * 100 : 0}
            label={`${progress.current} / ${progress.total} ${progress.filename}`}
            animated
          />
        ) : null}
        {error ? <p style={{ color: "#d9534f" }}>{error}</p> : null}
      </ForgeDialog.Body>

      <ForgeDialog.Footer>
        <ForgeButton variant="secondary" onClick={() => modal.close()} disabled={busy}>
          Close
        </ForgeButton>
        <ForgeButton variant="primary" onClick={() => { void handleCreate(); }} disabled={!createEnabled}>
          {busy ? "Creating…" : "Create Project"}
        </ForgeButton>
      </ForgeDialog.Footer>
    </ForgeDialog>
  );
};
