import React, { useEffect, useState } from "react";
import { BaseModalProps } from "@/apps/forge/interfaces/modal/BaseModalProps";
import { ForgeButton, ForgeDialog, ForgeInput, ForgeInputGroup, ForgeProgress } from "@/apps/forge/components/ui";
import { ProjectType } from "@/apps/forge/enum/ProjectType";
import { ForgeFileSystem, ForgeFileSystemResponse, ForgeFileSystemResponseType } from "@/apps/forge/ForgeFileSystem";
import {
  companionRimFilename,
  importModuleArchive,
  inspectModuleArchive,
  tryReadCompanionRim,
  type ModuleArchivePreview,
} from "@/apps/forge/helpers/importModuleArchive";
import { Project } from "@/apps/forge/Project";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { ForgeState } from "@/apps/forge/states/ForgeState";

const ARCHIVE_EXTS = ["mod", "rim", "erf"];

async function readPickedArchive(
  response: ForgeFileSystemResponse,
): Promise<{ buffer: Uint8Array; name: string; path?: string } | undefined> {
  if (response.type === ForgeFileSystemResponseType.FILE_PATH_STRING) {
    const filePath = response.paths?.[0];
    if (!filePath) {
      return undefined;
    }
    const fs = await import("fs");
    const path = await import("path");
    const buf = await fs.promises.readFile(filePath);
    return { buffer: new Uint8Array(buf), name: path.basename(filePath), path: filePath };
  }
  const handle = response.handles?.[0] as FileSystemFileHandle | undefined;
  if (!handle || (handle as FileSystemHandle).kind === "directory") {
    return undefined;
  }
  const file = await handle.getFile();
  return {
    buffer: new Uint8Array(await file.arrayBuffer()),
    name: handle.name,
  };
}

export const ModalImportModule = (props: BaseModalProps) => {
  const modal = props.modal;
  const [show, setShow] = useState(modal.visible);
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
      setArchiveName(picked.name);
      setArchiveBuffer(picked.buffer);
      setPreview(next);
      setCompanionName("");
      setCompanionBuffer(undefined);
      setIncludeCompanion(false);
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
    const response = await ForgeFileSystem.OpenFile({ ext: ARCHIVE_EXTS });
    const picked = await readPickedArchive(response);
    if (!picked) {
      return;
    }
    await applyPickedArchive(picked);
  };

  const pickCompanion = async () => {
    const response = await ForgeFileSystem.OpenFile({ ext: ["rim"] });
    const picked = await readPickedArchive(response);
    if (!picked) {
      return;
    }
    setCompanionName(picked.name);
    setCompanionBuffer(picked.buffer);
    setIncludeCompanion(true);
  };

  const applyToProject = async () => {
    const project = ForgeState.project;
    if (!(project instanceof Project)) {
      return;
    }
    project.settings.type = ProjectType.MODULE;
    await project.saveSettings();
    await project.initModule();
    await ProjectFileSystem.initializeProjectExplorer();
    if (openEditorAfter && project.hasModule()) {
      try {
        await project.initEditor();
      } catch (e) {
        console.error("Failed to open module editor after import", e);
      }
    }
  };

  const runImport = async () => {
    if (!archiveBuffer || !archiveName) {
      return;
    }
    setBusy(true);
    setError("");
    setProgress(undefined);
    try {
      let overwriteExisting = false;
      while (true) {
        const result = await importModuleArchive({
          buffer: archiveBuffer,
          filename: archiveName,
          companionBuffer,
          includeCompanion: includeCompanion && !!companionBuffer,
          overwriteExisting,
          onProgress: (current, total, filename) => setProgress({ current, total, filename }),
        });
        if (result.needsOverwrite) {
          const ok = window.confirm(
            `${result.reason || "This project already has a module."}\n\nOverwrite the existing module?`,
          );
          if (!ok) {
            return;
          }
          overwriteExisting = true;
          continue;
        }
        if (!result.ok) {
          setError(result.reason || "Import failed.");
          return;
        }
        await applyToProject();
        modal.close();
        return;
      }
    } catch (e) {
      console.error(e);
      setError("Import failed.");
    } finally {
      setBusy(false);
      setProgress(undefined);
    }
  };

  const canImport = !!archiveBuffer && !!preview && !busy;
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
        <p>Unpack a <code>.mod</code>, <code>.rim</code>, or <code>.erf</code> into this project as loose files. One <code>module.ifo</code> per project.</p>
        <ForgeInputGroup>
          <ForgeInputGroup.Text>Archive</ForgeInputGroup.Text>
          <ForgeInput type="text" value={archiveName} readOnly placeholder="No file selected" />
          <ForgeButton variant="primary" onClick={() => { void pickArchive(); }} disabled={busy}>
            Locate
          </ForgeButton>
        </ForgeInputGroup>
        {preview ? (
          <div>
            <p>
              {preview.resourceCount} resource{preview.resourceCount === 1 ? "" : "s"}
              {preview.hasModuleIfo ? " · contains module.ifo" : " · no module.ifo"}
              {preview.entryArea ? ` · entry area ${preview.entryArea}` : ""}
            </p>
          </div>
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
        <label>
          <input
            type="checkbox"
            checked={openEditorAfter}
            disabled={busy}
            onChange={(e) => setOpenEditorAfter(e.target.checked)}
          />
          {" "}Open module editor after import
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
        <ForgeButton variant="secondary" onClick={() => modal.close()} disabled={busy}>Close</ForgeButton>
        <ForgeButton variant="primary" onClick={() => { void runImport(); }} disabled={!canImport}>
          {busy ? "Importing…" : "Import"}
        </ForgeButton>
      </ForgeDialog.Footer>
    </ForgeDialog>
  );
};
