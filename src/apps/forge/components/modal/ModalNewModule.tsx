import React, { useEffect, useState } from "react";
import { BaseModalProps } from "@/apps/forge/interfaces/modal/BaseModalProps";
import { ForgeButton, ForgeDialog, ForgeInput, ForgeInputGroup } from "@/apps/forge/components/ui";
import { ProjectType } from "@/apps/forge/enum/ProjectType";
import { writeNewModuleFiles } from "@/apps/forge/helpers/createNewModule";
import { normalizeResRef } from "@/apps/forge/helpers/createUntitledModuleGff";
import { openResRefBrowser } from "@/apps/forge/helpers/openGameResRefPicker";
import { Project } from "@/apps/forge/Project";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { ForgeState } from "@/apps/forge/states/ForgeState";

export const ModalNewModule = (props: BaseModalProps) => {
  const modal = props.modal;
  const [show, setShow] = useState(modal.visible);
  const [moduleName, setModuleName] = useState(ForgeState.project?.settings?.name || "New Module");
  const [areaResRef, setAreaResRef] = useState("new_area");
  const [roomList, setRoomList] = useState("");
  const [openEditorAfter, setOpenEditorAfter] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  const addRoomResRef = () => {
    openResRefBrowser("mdl", (resref) => {
      const next = normalizeResRef(resref, "");
      if (!next) {
        return;
      }
      setRoomList((prev) => {
        const rooms = prev.split(/[\s,]+/).map((r) => r.trim()).filter(Boolean);
        if (rooms.includes(next)) {
          return prev;
        }
        return rooms.concat(next).join(", ");
      });
    });
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
        console.error("Failed to open module editor after new module", e);
      }
    }
  };

  const runCreate = async () => {
    const area = normalizeResRef(areaResRef, "new_area");
    const rooms = roomList.split(/[\s,]+/).map((r) => r.trim()).filter(Boolean).map((roomName) => ({ roomName }));
    setBusy(true);
    setError("");
    try {
      let overwriteExisting = false;
      while (true) {
        const result = await writeNewModuleFiles({
          moduleName,
          areaResRef: area,
          rooms,
          overwriteExisting,
          exists: (path) => ProjectFileSystem.exists(path),
          writeFile: (path, data) => ProjectFileSystem.writeFile(path, data),
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
          setError(result.reason || "Failed to create module.");
          return;
        }
        await applyToProject();
        modal.close();
        return;
      }
    } catch (e) {
      console.error(e);
      setError("Failed to create module.");
    } finally {
      setBusy(false);
    }
  };

  const canCreate = !!normalizeResRef(areaResRef, "") && !busy;

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
        <p>Create a blank one-area module in this project (<code>module.ifo</code>, area ARE/GIT, empty LYT/VIS).</p>
        <ForgeInputGroup>
          <ForgeInputGroup.Text>Name</ForgeInputGroup.Text>
          <ForgeInput
            type="text"
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            disabled={busy}
          />
        </ForgeInputGroup>
        <ForgeInputGroup>
          <ForgeInputGroup.Text>Area ResRef</ForgeInputGroup.Text>
          <ForgeInput
            type="text"
            value={areaResRef}
            maxLength={16}
            onChange={(e) => setAreaResRef(normalizeResRef(e.target.value, e.target.value))}
            disabled={busy}
          />
        </ForgeInputGroup>
        <ForgeInputGroup>
          <ForgeInputGroup.Text>Rooms</ForgeInputGroup.Text>
          <ForgeInput
            type="text"
            value={roomList}
            placeholder="Optional KEY MDL resrefs, comma-separated"
            onChange={(e) => setRoomList(e.target.value)}
            disabled={busy}
          />
          <ForgeButton variant="primary" onClick={addRoomResRef} disabled={busy}>
            Browse
          </ForgeButton>
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
        {error ? <p style={{ color: "#d9534f" }}>{error}</p> : null}
      </ForgeDialog.Body>
      <ForgeDialog.Footer>
        <ForgeButton variant="secondary" onClick={() => modal.close()} disabled={busy}>Close</ForgeButton>
        <ForgeButton variant="primary" onClick={() => { void runCreate(); }} disabled={!canCreate}>
          {busy ? "Creating…" : "Create"}
        </ForgeButton>
      </ForgeDialog.Footer>
    </ForgeDialog>
  );
};
