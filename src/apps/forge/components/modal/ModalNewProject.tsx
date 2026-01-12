import React, { useEffect, useState } from "react";
import { BaseModalProps } from "../../interfaces/modal/BaseModalProps";
import { Button, FormControl, FormSelect, InputGroup, Modal } from "react-bootstrap";
import * as KotOR from "../../KotOR";
import { ProjectType } from "../../enum/ProjectType";
import { ForgeFileSystem, ForgeFileSystemResponseType } from "../../ForgeFileSystem";
import { ForgeState } from "../../states/ForgeState";
import { ProjectFileSystem } from "../../ProjectFileSystem";
import { Project } from "../../Project";
import path from "path";

type GameModule = {
  moduleName: string;
  entryArea: string;
  areaName: string;
  path: string;
  type: 'rim' | 'mod';
  ifo: KotOR.GFFObject;
  git: KotOR.GFFObject;
  are: KotOR.GFFObject;
  rooms: { roomName: string, envAudio: number, ambientScale: number }[];
}

const DEFAULT_PROJECT_NAME = '';
const DEFAULT_MODULE_NAME = 'pal_m80aa';
const DEFAULT_AREA_NAME = 'm80aa';

interface ProjectDirectory {
  path?: string;
  name?: string;
  handle?: FileSystemDirectoryHandle;
}

export const ModalNewProject = (props: BaseModalProps) => {
  const modal = props.modal;
  const [show, setShow] = useState(modal.visible);
  const [gameModules, setGameModules] = useState<GameModule[]>([]);
  const [selectedGameModule, setSelectedGameModule] = useState<number>(-1);
  const [projectName, setProjectName] = useState<string>(DEFAULT_PROJECT_NAME);
  const [projectType, setProjectType] = useState<ProjectType>(ProjectType.MODULE);
  const [moduleName, setModuleName] = useState<string>('');
  const [areaName, setAreaName] = useState<string>('');
  const [projectDirectory, setProjectDirectory] = useState<ProjectDirectory>();

  const onHide = () => {
    setShow(false);
  };

  const onShow = () => {
    setShow(true);
  };

  useEffect( () => {
    modal.addEventListener('onHide', onHide);
    modal.addEventListener('onShow', onShow);
    modal.addEventListener('onGameModulesLoaded', onGameModulesLoaded);
    return () => {
      modal.removeEventListener('onHide', onHide);
      modal.removeEventListener('onShow', onShow);
      modal.removeEventListener('onGameModulesLoaded', onGameModulesLoaded);
    }
  }, []);

  const handleHide = () => {
    modal.close();
  };

  const handleClose = (e: React.MouseEvent<HTMLButtonElement>) => {
    modal.close();
  };

  const onGameModulesLoaded = (modules: GameModule[]) => {
    console.log('onGameModulesLoaded', modules);
    setGameModules([...modules]);
  };

  const handleCreateProject = async () => {
    console.log('handleCreateProject', projectName, selectedGameModule);
    if(!projectDirectory){
      return;
    }
    const project = new Project();
    project.settings.game = KotOR.GameState.GameKey;
    project.settings.name = projectName;
    project.settings.type = projectType;
    project.settings.open_files = [];
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      if(!projectDirectory.path){
        console.error('Project directory path is required');
        return;
      }
      ProjectFileSystem.rootDirectoryPath = projectDirectory.path;
      ProjectFileSystem.rootDirectoryHandle = undefined as unknown as FileSystemDirectoryHandle;
      ForgeState.project = project;
      project.saveSettings();
      if(projectType === ProjectType.MODULE){
        const gameModule = gameModules[selectedGameModule];
        if(gameModule){
          console.log('selectedGameModule', gameModule.entryArea);
          const lyt = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes.lyt, gameModule.entryArea);
          if(lyt){  
            await ProjectFileSystem.writeFile(areaName + '.lyt', lyt);
          }
          const vis = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes.vis, gameModule.entryArea);
          if(vis){
            await ProjectFileSystem.writeFile(areaName + '.vis', vis);
          }
        }
        const { ifo, are, git } = await project.buildModuleAndArea(moduleName, areaName, gameModule?.rooms || []);
      }
      modal.close();
      return;
    }
    
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
      if(!projectDirectory.handle){
        console.error('Project directory handle is required');
        return;
      }
      ProjectFileSystem.rootDirectoryPath = undefined as unknown as string;
      ProjectFileSystem.rootDirectoryHandle = projectDirectory.handle;
      console.log('ProjectFileSystem.rootDirectoryHandle', ProjectFileSystem.rootDirectoryHandle);
      ForgeState.project = project;
      project.saveSettings();
      if(projectType === ProjectType.MODULE){
        const gameModule = gameModules[selectedGameModule];
        if(gameModule){
          console.log('selectedGameModule', gameModule.entryArea);
          const lyt = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes.lyt, gameModule.entryArea);
          if(lyt){  
            await ProjectFileSystem.writeFile(areaName + '.lyt', lyt);
          }
          const vis = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes.vis, gameModule.entryArea);
          if(vis){
            await ProjectFileSystem.writeFile(areaName + '.vis', vis);
          }
        }
        const { ifo, are, git } = await project.buildModuleAndArea(moduleName, areaName, gameModule?.rooms || []);
      }
      modal.close();
      return;
    }
  };

  const onProjectTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProjectType = parseInt(e.target.value) as ProjectType;
    setProjectType(newProjectType);
    if(newProjectType !== ProjectType.MODULE){
      setSelectedGameModule(-1);
      setModuleName('');
      setAreaName('');
    }
  };

  const handleSelectProjectDirectory = () => {
      ForgeFileSystem.showOpenDirectoryDialog().then((response) => {
        if(response.cancelled){
          return;
        }
        if(response.type === ForgeFileSystemResponseType.FILE_SYSTEM_HANDLE){
          setProjectDirectory({ 
            name: response.handle?.name,
            path: response.handle?.name as string,
            handle: response.handle as FileSystemDirectoryHandle,
          });
        }
        if(response.type === ForgeFileSystemResponseType.FILE_PATH_STRING){
          setProjectDirectory({ 
            name: response.path?.split('/').pop(),
            path: response.path as string,
            handle: undefined,
          });
        }
      });
  };

  const onModuleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGameModule(parseInt(e.target.value));
    console.log('selectedGameModule', e.target.value);
  };

  return (
    <Modal 
      show={show} 
      onHide={handleHide} 
      backdrop="static" 
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>{modal.title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div>
          <h3>Project Details:</h3>

          <InputGroup>
            <InputGroup.Text>Name</InputGroup.Text>
            <FormControl type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          </InputGroup>

          <InputGroup>
            <InputGroup.Text>Directory</InputGroup.Text>
            <FormControl type="text" value={projectDirectory?.name} onChange={(e) => setProjectDirectory({ path: e.target.value })} />
            <Button variant="primary" onClick={handleSelectProjectDirectory}>Locate</Button>
          </InputGroup>

          <InputGroup>
            <InputGroup.Text>Type</InputGroup.Text>
            <FormSelect value={projectType} onChange={onProjectTypeChange}>
              <option value={ProjectType.MODULE}>Module</option>
              <option value={ProjectType.OTHER}>Generic</option>
            </FormSelect>
          </InputGroup>
        </div>

        {projectType === ProjectType.MODULE && (
          <div>
            <hr />
            <h3>Module Details:</h3>
            <InputGroup>
              <InputGroup.Text>Module Name</InputGroup.Text>
              <FormControl type="text" value={moduleName} placeholder={DEFAULT_MODULE_NAME} onChange={(e) => setModuleName(e.target.value)} />
            </InputGroup>
            <InputGroup>
              <InputGroup.Text>Area Name</InputGroup.Text>
              <FormControl type="text" value={areaName} placeholder={DEFAULT_AREA_NAME} onChange={(e) => setAreaName(e.target.value)} />
            </InputGroup>
            <InputGroup>
              <InputGroup.Text>Template Module</InputGroup.Text>
              <FormSelect className="game-modules" value={selectedGameModule as any} onChange={onModuleTemplateChange}>
                <option value="-1">None</option>
                {gameModules.map((module, index) => (
                  <option key={module.moduleName} value={index as any}>{module.moduleName} - {module.areaName}</option>
                ))}
              </FormSelect>
            </InputGroup>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Close</Button>
        <Button variant="primary" onClick={handleCreateProject}>Create Project</Button>
      </Modal.Footer>
    </Modal>
  );
};