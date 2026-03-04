import * as path from "path";

import React from "react";

import { TabResourceExplorer } from "@/apps/forge/components/tabs/tab-resource-explorer/TabResourceExplorer";
import { EditorFileProtocol } from "@/apps/forge/enum/EditorFileProtocol";
import { FileBrowserNode, FileBrowserNodesWithIndex } from "@/apps/forge/FileBrowserNode";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { AsyncLoop } from "@/utility/AsyncLoop";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabResourceExplorerState extends TabState {

  static Resources: FileBrowserNode[] = [];
  resourceNodes: FileBrowserNode[] = [];
  tabName: string = `Game`;

  onReload?: () => void;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    this.isClosable = false;
    log.trace("TabResourceExplorerState constructor", this.tabName);
    this.setContentView(
      <TabResourceExplorer tab={this} nodes={TabResourceExplorerState.Resources}></TabResourceExplorer>
    );
  }

  reload(){
    log.trace('TabResourceExplorerState.reload');
    if(typeof this.onReload === 'function'){
      this.onReload();
    }
  }

  getBifSounds(){
    const folderNode = TabResourceExplorerState.Resources.find( (node: FileBrowserNode) => node.name.toLocaleLowerCase() == 'bifs' );
    if(!folderNode){
      return [];
    }
    const soundNodes = folderNode.nodes.find( (node: FileBrowserNode) => node.type == 'group' && node.name.toLocaleLowerCase() === 'sounds' );
    if(!soundNodes){
      return [];
    }
    return soundNodes.nodes.filter( (node: FileBrowserNode) => node.type == 'resource' && node.name.toLocaleLowerCase().endsWith('.wav') );
  }

  getStreamSounds(){
    const folderNode = TabResourceExplorerState.Resources.find( (node: FileBrowserNode) => node.name.toLocaleLowerCase() == 'streamsounds' );
    if(!folderNode){
      return [];
    }
    return folderNode.nodes.filter( (node: FileBrowserNode) => node.type == 'resource' && node.name.toLocaleLowerCase().endsWith('.wav') );
  }

  static async GenerateResourceList(state: TabResourceExplorerState) {
    log.info("GenerateResourceList start");
    ForgeState.loaderMessage("Loading [BIFs]...");
    log.trace('TabResourceExplorerState.GenerateResourceList LoadBifs');
    const bifs      = await TabResourceExplorerState.LoadBifs();
    ForgeState.loaderMessage('Loading [RIMs]...');
    log.trace('TabResourceExplorerState.GenerateResourceList LoadRims');
    const rims      = await TabResourceExplorerState.LoadRims();
    ForgeState.loaderMessage('Loading [Modules]...');
    log.trace('TabResourceExplorerState.GenerateResourceList LoadModules');
    const modules   = await TabResourceExplorerState.LoadModules();
    ForgeState.loaderMessage('Loading [LIPs]...');
    log.trace('TabResourceExplorerState.GenerateResourceList LoadLips');
    const lips      = await TabResourceExplorerState.LoadLips();
    ForgeState.loaderMessage('Loading [Textures]...');
    log.trace('TabResourceExplorerState.GenerateResourceList LoadTextures');
    const textures  = await TabResourceExplorerState.LoadTextures();
    ForgeState.loaderMessage('Loading [StreamWaves]...');
    log.trace('TabResourceExplorerState.GenerateResourceList StreamWaves');
    const waves     = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamWaves');   //KOTOR
    ForgeState.loaderMessage('Loading [StreamSounds]...');
    log.trace('TabResourceExplorerState.GenerateResourceList StreamSounds');
    const sounds    = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamSounds');  //KOTOR & TSL
    ForgeState.loaderMessage('Loading [StreamMusic]...');
    log.trace('TabResourceExplorerState.GenerateResourceList StreamMusic');
    const music     = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamMusic');   //KOTOR & TSL
    ForgeState.loaderMessage('Loading [StreamVoice]...');
    log.trace('TabResourceExplorerState.GenerateResourceList StreamVoice');
    const voice     = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamVoice');   //TSL

    bifs.sort();
    rims.sort();
    modules.sort();
    lips.sort();
    textures.sort();
    // waves.sort();
    // sounds.sort();
    // music.sort();
    // voice.sort();

    const toPush = [
      bifs,
      rims,
      modules,
      lips,
      textures,
      waves,
      sounds,
      music,
      voice,
    ].filter(
      (node: FileBrowserNode) =>
        node instanceof FileBrowserNode && node.nodes.length
    );
    log.debug("GenerateResourceList pushing nodes", toPush.length);
    TabResourceExplorerState.Resources.push(...toPush);
    state.reload();
    ForgeState.loaderHide();
    return TabResourceExplorerState.Resources;
  }

  static LoadBifs() {
    log.trace('TabResourceExplorerState.LoadBifs');
    return new Promise<FileBrowserNode>( (resolve, _reject) => {
      const bifs: KotOR.BIFObject[] = [];
      KotOR.BIFManager.bifs.forEach( (bif: KotOR.BIFObject) => {
        bifs.push(bif);
      })

      const bifList: FileBrowserNode = new FileBrowserNode({
        name: 'BIFs',
        type: 'group',
        nodes: [],
        canOrphan: false,
      });

      const bifLoader = new AsyncLoop({
        array: bifs,
        onLoop: (bif: KotOR.BIFObject, asyncLoop: AsyncLoop) => {
          const name = bif.file.split(path.sep).pop()?.split('.')[0];
          const subTypes: {[key: string]: FileBrowserNode} = {};

          const node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          bifList.addChildNode(node);

          for (let i = 0; i < bif.resources.length; i++) {
            const resource = bif.resources[i];
            const resref = KotOR.KEYManager.Key.getFileLabel(resource.Id);

            if (subTypes[resource.resType] == undefined) {
              subTypes[resource.resType] = new FileBrowserNode({
                name: KotOR.ResourceTypes.getKeyByValue(resource.resType),
                type: 'group',
                canOrphan: true,
              });
              node.addChildNode(subTypes[resource.resType]);
            }

            subTypes[resource.resType].addChildNode(
              new FileBrowserNode({
                name: (`${resref}.${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`),
                type: 'resource',
                data: {
                  path: `${ EditorFileProtocol.BIF }//game.dir/${bif.file}?resref=${resref}&restype=${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`
                },
              })
            );
          }

          asyncLoop.next();
        },
      });
      bifLoader.iterate(() => {
        for(let i = 0; i < bifList.nodes.length; i++){
          const bif = bifList.nodes[i];
          if(bif.nodes.length == 1 && bif.nodes[0].type == 'group'){
            bif.nodes = bif.nodes[0].nodes;
          }
        }
        resolve(bifList);
      });
    });
  }

  static LoadRims() {
    log.trace('TabResourceExplorerState.LoadRims');
		return new Promise<FileBrowserNode>( (resolve, _reject) => {
      const rims: KotOR.RIMObject[] = [];
      KotOR.RIMManager.RIMs.forEach( (rim: KotOR.RIMObject) => {
        if(rim.group == "RIMs"){
          rims.push(rim);
        }
      })

      const rimList: FileBrowserNode = new FileBrowserNode({
        name: 'RIMs',
        type: 'group',
        nodes: [],
        canOrphan: false,
      });

      const rimLoader = new AsyncLoop({
        array: rims,
        onLoop: (rim: KotOR.RIMObject, asyncLoop: AsyncLoop) => {
          const name = rim.resource_path.split(path.sep).pop()?.split('.')[0];
          const subTypes: {[key: string]: FileBrowserNode} = {};

          const node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          rimList.addChildNode(node);

          for (let i = 0; i < rim.resources.length; i++) {
            const resource = rim.resources[i];
            const resref = resource.resRef;

            if (subTypes[resource.resType] == undefined) {
              subTypes[resource.resType] = new FileBrowserNode({
                name: KotOR.ResourceTypes.getKeyByValue(resource.resType),
                type: 'group',
                canOrphan: false,
              });
              node.addChildNode(subTypes[resource.resType]);
            }

            subTypes[resource.resType].addChildNode(new FileBrowserNode({
              name: `${resref}.${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
              type: 'resource',
              data: {
                path: `${ EditorFileProtocol.RIM }//game.dir/${rim.resource_path}?resref=${resref}&restype=${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
              },
            }));
          }

          asyncLoop.next();
        },
      });
      rimLoader.iterate(() => {
        for(let i = 0; i < rimList.nodes.length; i++){
          const rim = rimList.nodes[i];
          if(rim.nodes.length == 1 && rim.nodes[0].type == 'group'){
            rim.nodes = rim.nodes[0].nodes;
          }
        }
        resolve(rimList);
      });
    });
	}

  static LoadModules() {
    return new Promise<FileBrowserNode>( (resolve, _reject) => {
      let modules: (KotOR.RIMObject | KotOR.ERFObject)[] = [];

      KotOR.RIMManager.RIMs.forEach( (rim: KotOR.RIMObject) => {
        if(rim.group == "Module"){
          modules.push(rim);
        }
      });

      KotOR.ERFManager.ERFs.forEach( (erf: KotOR.ERFObject) => {
        if(erf.group == "Module"){
          modules.push(erf);
        }
      });

      //Sort the array by filename
      modules = modules.sort( (a: KotOR.ERFObject|KotOR.RIMObject, b: KotOR.ERFObject|KotOR.RIMObject) => {
        const nameA = a.resource_path.split(path.sep).pop() || '';
        const nameB = b.resource_path.split(path.sep).pop() || '';

        if (nameA < nameB) { return -1; }
        if (nameA > nameB) { return 1; }
        return 0;
      });

      const rimList: FileBrowserNode = new FileBrowserNode({
        name: 'Modules',
        type: 'group',
        nodes: [],
        canOrphan: false,
      });

      const rimLoader = new AsyncLoop({
        array: modules,
        onLoop: (rim: KotOR.RIMObject|KotOR.ERFObject, asyncLoop: AsyncLoop) => {
          const name = rim.resource_path.split(path.sep).pop();
          const subTypes: {[key: string]: FileBrowserNode} = {};

          const node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          rimList.addChildNode(node);

          const files = rim instanceof KotOR.ERFObject ? rim.keyList : rim.resources;

          for (let i = 0; i < files.length; i++) {
            const resource = files[i];
            const resref = resource.resRef;

            if (subTypes[resource.resType] == undefined) {
              subTypes[resource.resType] = new FileBrowserNode({
                name: KotOR.ResourceTypes.getKeyByValue(resource.resType),
                type: 'group',
                canOrphan: true,
              });
              node.addChildNode(subTypes[resource.resType]);
            }

            subTypes[resource.resType].addChildNode(new FileBrowserNode({
              name: `${resref}.${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
              type: 'resource',
              data: {
                path: `${ rim instanceof KotOR.RIMObject ? EditorFileProtocol.RIM : EditorFileProtocol.ERF }//game.dir/${rim.resource_path}?resref=${resref}&restype=${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
              }
            }));
          }

          asyncLoop.next();
        },
      });
      rimLoader.iterate(() => {
        for(let i = 0; i < rimList.nodes.length; i++){
          const rim = rimList.nodes[i];
          if(rim.nodes.length == 1 && rim.nodes[0].type == 'group'){
            rim.nodes = rim.nodes[0].nodes;
          }
        }
        resolve(rimList);
      });
    });
  }

  static LoadLips() {
    return new Promise<FileBrowserNode>( (resolve, _reject) => {
			let modules: (KotOR.RIMObject | KotOR.ERFObject)[] = [];

			KotOR.RIMManager.RIMs.forEach( (rim: KotOR.RIMObject) => {
				if(rim.group == "Lips"){
					modules.push(rim);
				}
			});

			KotOR.ERFManager.ERFs.forEach( (erf: KotOR.ERFObject) => {
				if(erf.group == "Lips"){
					modules.push(erf);
				}
			});

			//Sort the array by filename
			modules = modules.sort( (a: KotOR.ERFObject|KotOR.RIMObject, b: KotOR.ERFObject|KotOR.RIMObject) => {
				const nameA = a.resource_path.split(path.sep).pop() || '';
				const nameB = b.resource_path.split(path.sep).pop() || '';

				if (nameA < nameB) { return -1; }
				if (nameA > nameB) { return 1; }
				return 0;
			});

			const rimList: FileBrowserNode = new FileBrowserNode({
				name: 'LIPs',
				type: 'group',
				nodes: [],
				canOrphan: false,
			});

			const rimLoader = new AsyncLoop({
				array: modules,
				onLoop: (rim: KotOR.RIMObject|KotOR.ERFObject, asyncLoop: AsyncLoop) => {
					const name = rim.resource_path.split(path.sep).pop();
					const subTypes: {[key: string]: FileBrowserNode} = {};

					const node: FileBrowserNode = new FileBrowserNode({
						name: name,
						type: 'group',
						nodes: [],
						canOrphan: false,
					});

					rimList.addChildNode(node);

					const files = rim instanceof KotOR.ERFObject ? rim.keyList : rim.resources;

					for (let i = 0; i < files.length; i++) {
						const resource = files[i];
						const resRef = resource.resRef;

						if (subTypes[resource.resType] == undefined) {
							subTypes[resource.resType] = new FileBrowserNode({
								name: KotOR.ResourceTypes.getKeyByValue(resource.resType),
								type: 'group',
							});
							node.addChildNode(subTypes[resource.resType]);
						}

						subTypes[resource.resType].addChildNode(new FileBrowserNode({
							name: `${resRef}.${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
							type: 'resource',
							data: {
								path: `${ rim instanceof KotOR.RIMObject ? EditorFileProtocol.RIM : EditorFileProtocol.ERF }//game.dir/${rim.resource_path}?resref=${resRef}&restype=${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
							}
						}));
					}

					asyncLoop.next();
				},
			});
			rimLoader.iterate(() => {
        for(let i = 0; i < rimList.nodes.length; i++){
          const rim = rimList.nodes[i];
          if(rim.nodes.length == 1 && rim.nodes[0].type == 'group'){
            rim.nodes = rim.nodes[0].nodes;
          }
        }
				resolve(rimList);
			});
		});
  }

  static LoadTextures() {
    return new Promise<FileBrowserNode>( (resolve, _reject) => {
      const texture_packs: KotOR.ERFObject[] = [];

      KotOR.ERFManager.ERFs.forEach( (erf: KotOR.ERFObject) => {
        if(erf.group == "Textures"){
          texture_packs.push(erf);
        }
      });

      const erfList: FileBrowserNode = new FileBrowserNode({
        name: 'Texture Packs',
        type: 'group',
        nodes: [],
        canOrphan: false,
      });

      const erfLoader = new AsyncLoop({
        array: texture_packs,
        onLoop: (erf: KotOR.ERFObject, asyncLoop: AsyncLoop) => {
          const name = erf.resource_path.split(path.sep).pop();
          const subTypes: {[key: string]: FileBrowserNode} = {};

          const node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          erfList.addChildNode(node);

          const files = erf.keyList;

          for (let i = 0; i < files.length; i++) {
            const resource = files[i];
            const resref = resource.resRef;
            const letter = resref[0].toLowerCase();

            if (subTypes[letter] == undefined) {
              subTypes[letter] = new FileBrowserNode({
                name: letter.toUpperCase(),
                type: 'group',
                nodes: [],
              });
              node.addChildNode(subTypes[letter]);
            }

            subTypes[letter].addChildNode(new FileBrowserNode({
              name: `${resref}.${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
              type: 'resource',
              data: {
                path: `${EditorFileProtocol.ERF}//game.dir/${erf.resource_path}?resref=${resref}&restype=${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`,
              },
            }));
          }

          asyncLoop.next();
        },
      });
      erfLoader.iterate(() => {
        resolve(erfList);
      });
    });
  }

  static LoadFolderForFileBrowser(folder_name = "") {
    return new Promise<FileBrowserNode>((resolve) => {
      const folder: FileBrowserNode = new FileBrowserNode({
        name: folder_name,
        type: "group",
        nodes: [],
      });
      KotOR.GameFileSystem.readdir(folder_name, { recursive: true }).then(
        (files: string[]) => {
          const nodesWithIndex = folder.nodes as FileBrowserNodesWithIndex;
          nodesWithIndex._indexes = {};

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const parts = file.split(path.sep);
            parts.shift();

            const newfile = parts.pop() ?? "";
            let targetFolder = folder;

            for (let j = 0; j < parts.length; j++) {
              const key = parts[j].trim();
              const targetNodes = targetFolder.nodes as FileBrowserNodesWithIndex;
              if (typeof targetNodes._indexes?.[key] === "undefined") {
                const index =
                  targetFolder.addChildNode(
                    new FileBrowserNode({
                      name: key,
                      type: "group",
                      nodes: [],
                    })
                  ) - 1;
                if (!targetNodes._indexes) targetNodes._indexes = {};
                targetNodes._indexes[key] = index;
                targetFolder = targetFolder.nodes[index];
                (targetFolder.nodes as FileBrowserNodesWithIndex)._indexes = {};
              } else {
                const index = targetNodes._indexes[key];
                targetFolder = targetFolder.nodes[index];
              }
            }

            targetFolder.addChildNode(
              new FileBrowserNode({
                name: newfile.trim(),
                type: "resource",
                data: {
                  path: `${EditorFileProtocol.FILE}//game.dir/${files[i]}`,
                },
                nodes: [],
              })
            );
          }

          /*targetFolder.nodeList.sort( (a, b) => {
            return a.type == 'group' ? 0 : 1;
          });*/
          folder.nodes.sort((a: FileBrowserNode, b: FileBrowserNode) => {
            const compareType =
              a.type === "group" && b.type !== "group" ? -1 : 1;
            const compareName = a.name.localeCompare(b.name);
            return compareType || compareName;
          });

          resolve(folder);
        }
      ).catch((err: unknown) => {
        log.error("LoadFolderForFileBrowser", err instanceof Error ? err : String(err));
        resolve(folder);
      });
    });
  }

}
