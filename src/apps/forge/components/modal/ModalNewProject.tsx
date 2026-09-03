import React, { useEffect, useState } from "react";
import { BaseModalProps } from "@/apps/forge/interfaces/modal/BaseModalProps";
import { ForgeButton, ForgeInput, ForgeSelect, ForgeInputGroup, ForgeDialog } from "@/apps/forge/components/ui";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeFileSystem, ForgeFileSystemResponseType } from "@/apps/forge/ForgeFileSystem";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { Project } from "@/apps/forge/Project";
import {
  canCreateForgeProject,
  resolveProjectGame,
  type ProjectStorageMode,
} from "@/apps/forge/helpers/projectCreateOptions";
import { createForgeProject } from "@/apps/forge/helpers/createForgeProject";
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

export const ModalNewProject = (props: BaseModalProps) => {
  const modal = props.modal;
  const [show, setShow] = useState(modal.visible);
  const [projectName, setProjectName] = useState("");
  const [projectGame, setProjectGame] = useState<GameEngineType>(defaultProjectGame);
  const [projectDirectory, setProjectDirectory] = useState<ProjectDirectory>();
  const [storageMode, setStorageMode] = useState<ProjectStorageMode>(defaultStorageMode());
  const [creating, setCreating] = useState(false);

  const onHide = () => {
    setShow(false);
  };

  const onShow = () => {
    setShow(true);
  };

  useEffect(() => {
    modal.addEventListener("onHide", onHide);
    modal.addEventListener("onShow", onShow);
    return () => {
      modal.removeEventListener("onHide", onHide);
      modal.removeEventListener("onShow", onShow);
    };
  }, []);

  const handleHide = () => {
    modal.close();
  };

  const handleClose = () => {
    modal.close();
  };

  const createEnabled = canCreateForgeProject({
    name: projectName,
    game: projectGame,
    storage: storageMode,
    directory: projectDirectory,
  }) && !creating;

  const handleCreateProject = async () => {
    if (!createEnabled) {
      return;
    }
    setCreating(true);
    try {
      const project = await createForgeProject({
        name: projectName,
        game: projectGame,
        storage: storageMode,
        directory: projectDirectory,
      });
      modal.close();
      await project.open();
      if (ForgeState.project instanceof Project) {
        await ProjectFileSystem.initializeProjectExplorer();
      }
    } catch (e) {
      console.error("Failed to create project", e);
    } finally {
      setCreating(false);
    }
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

  return (
    <ForgeDialog
      show={show}
      onHide={handleHide}
      backdrop="static"
      keyboard={false}
    >
      <ForgeDialog.Header closeButton>
        <ForgeDialog.Title>{modal.title}</ForgeDialog.Title>
      </ForgeDialog.Header>

      <ForgeDialog.Body>
        <div>
          <h3>Project Details:</h3>

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
              <ForgeInput type="text" value={projectDirectory?.name || ""} onChange={(e) => setProjectDirectory({ path: e.target.value })} />
              <ForgeButton variant="primary" onClick={handleSelectProjectDirectory}>Locate</ForgeButton>
            </ForgeInputGroup>
          )}

          <ForgeInputGroup>
            <ForgeInputGroup.Text>Game</ForgeInputGroup.Text>
            <ForgeSelect
              value={projectGame}
              onChange={(e) => setProjectGame(resolveProjectGame(e.target.value))}
            >
              <option value={GameEngineType.KOTOR}>KotOR</option>
              <option value={GameEngineType.TSL}>TSL</option>
            </ForgeSelect>
          </ForgeInputGroup>
        </div>
      </ForgeDialog.Body>

      <ForgeDialog.Footer>
        <ForgeButton variant="secondary" onClick={handleClose}>Close</ForgeButton>
        <ForgeButton
          variant="primary"
          onClick={handleCreateProject}
          disabled={!createEnabled}
        >
          {creating ? "Creating…" : "Create Project"}
        </ForgeButton>
      </ForgeDialog.Footer>
    </ForgeDialog>
  );
};
