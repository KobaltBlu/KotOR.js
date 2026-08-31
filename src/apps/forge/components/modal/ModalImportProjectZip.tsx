/**
 * Modal: import a Forge project ZIP into a new virtual or local root.
 *
 * @file ModalImportProjectZip.tsx
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
import { createForgeProjectFromZip } from "@/apps/forge/helpers/createForgeProjectFromZip";
import { inspectProjectZip, type InspectProjectZipResult } from "@/apps/forge/helpers/projectZip";
import { readPickedModuleArchive } from "@/apps/forge/helpers/moduleArchivePicker";
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

export const ModalImportProjectZip = (props: BaseModalProps) => {
  const modal = props.modal;
  const [show, setShow] = useState(modal.visible);
  const [projectName, setProjectName] = useState("");
  const [projectGame, setProjectGame] = useState<GameEngineType>(defaultProjectGame);
  const [projectDirectory, setProjectDirectory] = useState<ProjectDirectory>();
  const [storageMode, setStorageMode] = useState<ProjectStorageMode>(defaultStorageMode());
  const [zipName, setZipName] = useState("");
  const [zipBuffer, setZipBuffer] = useState<Uint8Array>();
  const [preview, setPreview] = useState<InspectProjectZipResult>();
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

  const resetZip = () => {
    setZipName("");
    setZipBuffer(undefined);
    setPreview(undefined);
    setProgress(undefined);
  };

  const applyPickedZip = async (picked: { buffer: Uint8Array; name: string }) => {
    setError("");
    setBusy(true);
    try {
      const next = inspectProjectZip(picked.buffer);
      if (!next.ok || !next.settings) {
        setError(next.reason || "Not a Forge project ZIP.");
        resetZip();
        return;
      }
      setZipName(picked.name);
      setZipBuffer(picked.buffer);
      setPreview(next);
      setProjectName(next.settings.name);
      setProjectGame(resolveProjectGame(next.settings.game));
    } catch (e) {
      console.error(e);
      setError("Could not read that ZIP. Choose a Forge project archive.");
      resetZip();
    } finally {
      setBusy(false);
    }
  };

  const pickZip = async () => {
    const response = await ForgeFileSystem.OpenFile({ ext: ["zip"] });
    const picked = await readPickedModuleArchive(response);
    if (!picked) {
      return;
    }
    await applyPickedZip(picked);
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
          name: response.path?.split("/").pop() || response.path?.split("\\").pop(),
          path: response.path as string,
          handle: undefined,
        });
      }
    });
  };

  const createEnabled =
    !!zipBuffer &&
    !!preview?.ok &&
    canCreateForgeProject({
      name: projectName,
      game: projectGame,
      storage: storageMode,
      directory: projectDirectory,
    }) &&
    !busy;

  const handleImport = async () => {
    if (!createEnabled || !zipBuffer) {
      return;
    }
    setBusy(true);
    setError("");
    setProgress(undefined);
    try {
      const result = await createForgeProjectFromZip({
        name: projectName,
        game: projectGame,
        storage: storageMode,
        directory: projectDirectory,
        buffer: zipBuffer,
        onProgress: (current, total, filename) => setProgress({ current, total, filename }),
      });
      if (!result.ok) {
        setError(result.reason || "Failed to import project ZIP.");
        return;
      }
      modal.close();
    } catch (e) {
      console.error(e);
      setError("Failed to import project ZIP.");
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  const fileCount = preview?.files ? Object.keys(preview.files).length : 0;

  return (
    <ForgeDialog show={show} onHide={() => modal.close()} backdrop="static" keyboard={false}>
      <ForgeDialog.Header closeButton>
        <ForgeDialog.Title>{modal.title}</ForgeDialog.Title>
      </ForgeDialog.Header>

      <ForgeDialog.Body>
        <p>
          Restore a full Forge project archive (loose files + <code>.forge/settings.json</code>). For{" "}
          <code>.mod</code> / <code>.rim</code> / <code>.erf</code>, use <strong>New Project from Module</strong>{" "}
          instead.
        </p>

        <ForgeInputGroup>
          <ForgeInputGroup.Text>ZIP</ForgeInputGroup.Text>
          <ForgeInput type="text" value={zipName} readOnly placeholder="No archive selected" />
          <ForgeButton variant="primary" onClick={pickZip} disabled={busy}>
            Browse…
          </ForgeButton>
        </ForgeInputGroup>

        {preview?.ok && preview.settings && (
          <p className="text-muted" style={{ marginTop: 8 }}>
            Archive: <strong>{preview.settings.name}</strong> ({fileCount} files)
          </p>
        )}

        <h3>Destination</h3>

        <ForgeInputGroup>
          <ForgeInputGroup.Text>Name</ForgeInputGroup.Text>
          <ForgeInput type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
        </ForgeInputGroup>

        <ForgeInputGroup>
          <ForgeInputGroup.Text>Storage</ForgeInputGroup.Text>
          <ForgeSelect value={storageMode} onChange={(e) => setStorageMode(e.target.value as ProjectStorageMode)}>
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
            />
            <ForgeButton variant="primary" onClick={handleSelectProjectDirectory}>
              Locate
            </ForgeButton>
          </ForgeInputGroup>
        )}

        <ForgeInputGroup>
          <ForgeInputGroup.Text>Game</ForgeInputGroup.Text>
          <ForgeSelect value={projectGame} onChange={(e) => setProjectGame(resolveProjectGame(e.target.value))}>
            <option value={GameEngineType.KOTOR}>KotOR</option>
            <option value={GameEngineType.TSL}>TSL</option>
          </ForgeSelect>
        </ForgeInputGroup>

        {progress && (
          <div style={{ marginTop: 12 }}>
            <ForgeProgress
              value={(progress.current / Math.max(1, progress.total)) * 100}
              label={`${progress.current}/${progress.total}: ${progress.filename}`}
              animated
              striped
            />
          </div>
        )}

        {error ? <p className="text-danger" style={{ marginTop: 12 }}>{error}</p> : null}
      </ForgeDialog.Body>

      <ForgeDialog.Footer>
        <ForgeButton variant="secondary" onClick={() => modal.close()} disabled={busy}>
          Close
        </ForgeButton>
        <ForgeButton variant="primary" onClick={handleImport} disabled={!createEnabled}>
          {busy ? "Importing…" : "Import Project"}
        </ForgeButton>
      </ForgeDialog.Footer>
    </ForgeDialog>
  );
};
