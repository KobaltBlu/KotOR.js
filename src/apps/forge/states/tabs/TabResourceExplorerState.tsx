import React from "react";
import { TabState } from "./TabState";
import { BIFObject } from "../../../../resource/BIFObject";
import { RIMObject, RIMResource } from "../../../../resource/RIMObject";
import { ERFKeyEntry, ERFObject } from "../../../../resource/ERFObject";
import { TabResourceExplorer } from "../../components/tabs/TabResourceExplorer";
import { AsyncLoop } from "../../../../utility/AsyncLoop";
import { ResourceTypes } from "../../../../resource/ResourceTypes";
import * as path from "path";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

declare const KotOR: any;

export class FileBrowserNode {
  static NODE_ID = 0;
  id: number = 0;
  name: string = '';
  canOrphan: boolean = false;
  nodes: FileBrowserNode[] = [];
  type: 'group'|'resource' = 'group';
  data: any = {};
  open: boolean = false;

  constructor(options: any = {}){
    options = Object.assign({
      name: '',
      canOrphan: false,
      nodes: [],
      type: 'group',
      data: {}
    }, options);
    this.name = options.name;
    this.canOrphan = options.canOrphan;
    this.nodes = options.nodes;
    this.type = options.type;
    this.data = options.data;
    this.id = FileBrowserNode.NODE_ID++;
  }

  addChildNode(node: FileBrowserNode): number{
    return this.nodes.push(node);
  }

}

export class TabResourceExplorerState extends TabState {

  static Resources: FileBrowserNode[] = [];
  resourceNodes: FileBrowserNode[] = [];
  tabName: string = `Game`;

  onReload?: Function;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.isClosable = false;

    this.tabContentView = (
      <TabResourceExplorer tab={this} nodes={TabResourceExplorerState.Resources}></TabResourceExplorer>
    );

  }

  reload(){
    if(typeof this.onReload === 'function'){
      this.onReload();
    }
  }

  static async GenerateResourceList( state: TabResourceExplorerState ){
    KotOR.LoadingScreen.main.Show('Loading [BIFs]...');
    const bifs      = await TabResourceExplorerState.LoadBifs();
    KotOR.LoadingScreen.main.Show('Loading [RIMs]...');
    const rims      = await TabResourceExplorerState.LoadRims();
    KotOR.LoadingScreen.main.Show('Loading [Modules]...');
    const modules   = await TabResourceExplorerState.LoadModules();
    KotOR.LoadingScreen.main.Show('Loading [LIPs]...');
    const lips      = await TabResourceExplorerState.LoadLips();
    KotOR.LoadingScreen.main.Show('Loading [Textures]...');
    const textures  = await TabResourceExplorerState.LoadTextures();
    KotOR.LoadingScreen.main.Show('Loading [StreamWaves]...');
    const waves     = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamWaves');
    KotOR.LoadingScreen.main.Show('Loading [StreamSounds]...');
    const sounds    = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamSounds');
    KotOR.LoadingScreen.main.Show('Loading [StreamMusic]...');
    const music     = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamMusic');
    KotOR.LoadingScreen.main.Show('Loading [StreamVoice]...');
    const voice     = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamVoice');
    TabResourceExplorerState.Resources.push( 
      ...[
        bifs, rims, modules, lips, textures, waves, sounds, music, voice
      ].filter((node: FileBrowserNode) => (node instanceof FileBrowserNode)) 
    );
    state.reload();
    KotOR.LoadingScreen.main.Hide();
    return TabResourceExplorerState.Resources;
  }

  static LoadBifs() {
    return new Promise<FileBrowserNode>( (resolve, reject) => {
      let bifs: BIFObject[] = [];
      KotOR.BIFManager.bifs.forEach( (bif: BIFObject) => {
        bifs.push(bif);
      })

      const bifList: FileBrowserNode = new FileBrowserNode({
        name: 'BIFs',
        type: 'group',
        nodes: [],
        canOrphan: false,
      });

      let bifLoader = new AsyncLoop({
        array: bifs,
        onLoop: (bif: BIFObject, asyncLoop: AsyncLoop) => {
          let name = bif.file.split(path.sep).pop()?.split('.')[0];
          let subTypes: {[key: string]: FileBrowserNode} = {};

          let node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          bifList.addChildNode(node);

          for (let i = 0; i < bif.resources.length; i++) {
            let resource = bif.resources[i];
            let resref = KotOR.KEYManager.Key.GetFileLabel(resource.ID);

            if (subTypes[resource.ResType] == undefined) {
              subTypes[resource.ResType] = new FileBrowserNode({
                name: ResourceTypes.getKeyByValue(resource.ResType),
                type: 'group',
              });
              node.addChildNode(subTypes[resource.ResType]);
            }

            subTypes[resource.ResType].addChildNode(
              new FileBrowserNode({
                name: (`${resref}.${ResourceTypes.getKeyByValue(resource.ResType)}`),
                type: 'resource',
                data: {
                  path: `${bif.file}?${resref}.${ResourceTypes.getKeyByValue(resource.ResType)}`
                },
              })
            );
          }

          asyncLoop.next();
        },
      });
      bifLoader.iterate(() => {
        resolve(bifList);
      });
    });
  }

  static LoadRims() {
		return new Promise<FileBrowserNode>( (resolve, reject) => {
      let rims: RIMObject[] = [];
      KotOR.RIMManager.RIMs.forEach( (rim: RIMObject) => {
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

      let rimLoader = new AsyncLoop({
        array: rims,
        onLoop: (rim: RIMObject, asyncLoop: AsyncLoop) => {
          let name = rim.resource_path.split(path.sep).pop()?.split('.')[0];
          let subTypes: {[key: string]: FileBrowserNode} = {};

          let node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          rimList.addChildNode(node);

          for (let i = 0; i < rim.Resources.length; i++) {
            let resource = rim.Resources[i];
            let resref = resource.ResRef;

            if (subTypes[resource.ResType] == undefined) {
              subTypes[resource.ResType] = new FileBrowserNode({
                name: KotOR.ResourceTypes.getKeyByValue(resource.ResType),
                type: 'group',
              });
              node.addChildNode(subTypes[resource.ResType]);
            }

            subTypes[resource.ResType].addChildNode(new FileBrowserNode({
              name: `${resref}.${ResourceTypes.getKeyByValue(resource.ResType)}`,
              type: 'resource',
              data: {
                path: `${rim.resource_path}?${resref}.${ResourceTypes.getKeyByValue(resource.ResType)}`,
              },
            }));
          }

          asyncLoop.next();
        },
      });
      rimLoader.iterate(() => {
        resolve(rimList);
      });
    });
	}
	
  static LoadModules() {
		return new Promise<FileBrowserNode>( (resolve, reject) => {
      let modules: any[] = [];

      KotOR.RIMManager.RIMs.forEach( (rim: RIMObject) => {
        if(rim.group == "Module"){
          modules.push(rim);
        }
      });

      KotOR.ERFManager.ERFs.forEach( (erf: ERFObject) => {
        if(erf.group == "Module"){
          modules.push(erf);
        }
      });
      
      //Sort the array by filename
      modules = modules.sort( (a: ERFObject|RIMObject, b: ERFObject|RIMObject) => {
        let nameA = a.resource_path.split(path.sep).pop() || '';
        let nameB = b.resource_path.split(path.sep).pop() || '';
        
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

      let rimLoader = new AsyncLoop({
        array: modules,
        onLoop: (rim: RIMObject|ERFObject, asyncLoop: AsyncLoop) => {
          let name = rim.resource_path.split(path.sep).pop();
          let subTypes: {[key: string]: FileBrowserNode} = {};

          let node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          rimList.addChildNode(node);

          let files = ((rim as any)?.KeyList ? (rim as any).KeyList : rim.Resources as any);

          for (let i = 0; i < files.length; i++) {
            let resource = files[i];
            let resref = resource.ResRef;

            if (subTypes[resource.ResType] == undefined) {
              subTypes[resource.ResType] = new FileBrowserNode({
                name: ResourceTypes.getKeyByValue(resource.ResType),
                type: 'group',
              });
              node.addChildNode(subTypes[resource.ResType]);
            }

            subTypes[resource.ResType].addChildNode(new FileBrowserNode({
              name: `${resref}.${ResourceTypes.getKeyByValue(resource.ResType)}`,
              type: 'resource',
              data: {
                path: `${rim.resource_path}?${resref}.${ResourceTypes.getKeyByValue(resource.ResType)}`,
              }
            }));
          }

          asyncLoop.next();
        },
      });
      rimLoader.iterate(() => {
        resolve(rimList);
      });
    });
  }
	
  static LoadLips() {
		return new Promise<FileBrowserNode>( (resolve, reject) => {
			let modules: any[] = [];

			KotOR.RIMManager.RIMs.forEach( (rim: RIMObject) => {
				if(rim.group == "Lips"){
					modules.push(rim);
				}
			});

			KotOR.ERFManager.ERFs.forEach( (erf: ERFObject) => {
				if(erf.group == "Lips"){
					modules.push(erf);
				}
			});
			
			//Sort the array by filename
			modules = modules.sort( (a: ERFObject|RIMObject, b: ERFObject|RIMObject) => {
				let nameA = a.resource_path.split(path.sep).pop() || '';
				let nameB = b.resource_path.split(path.sep).pop() || '';
				
				if (nameA < nameB) { return -1; }
				if (nameA > nameB) { return 1; }
				return 0;
			});

			const rimList: FileBrowserNode = new FileBrowserNode({
				name: 'Lips',
				type: 'group',
				nodes: [],
				canOrphan: false,
			});

			let rimLoader = new AsyncLoop({
				array: modules,
				onLoop: (rim: RIMObject|ERFObject, asyncLoop: AsyncLoop) => {
					let name = rim.resource_path.split(path.sep).pop();
					let subTypes: {[key: string]: FileBrowserNode} = {};

					let node: FileBrowserNode = new FileBrowserNode({
						name: name,
						type: 'group',
						nodes: [],
						canOrphan: false,
					});

					rimList.addChildNode(node);

					let files = ((rim as any)?.KeyList ? (rim as any).KeyList : rim.Resources as any);

					for (let i = 0; i < files.length; i++) {
						let resource = files[i];
						let resref = resource.ResRef;

						if (subTypes[resource.ResType] == undefined) {
							subTypes[resource.ResType] = new FileBrowserNode({
								name: ResourceTypes.getKeyByValue(resource.ResType),
								type: 'group',
							});
							node.addChildNode(subTypes[resource.ResType]);
						}

						subTypes[resource.ResType].addChildNode(new FileBrowserNode({
							name: `${resref}.${ResourceTypes.getKeyByValue(resource.ResType)}`,
							type: 'resource',
							data: {
								path: `${rim.resource_path}?${resref}.${ResourceTypes.getKeyByValue(resource.ResType)}`,
							}
						}));
					}

					asyncLoop.next();
				},
			});
			rimLoader.iterate(() => {
				resolve(rimList);
			});
		});
  }
	
  static LoadTextures() {
    return new Promise<FileBrowserNode>( (resolve, reject) => {
      let texture_packs: any[] = [];

      KotOR.ERFManager.ERFs.forEach( (erf: ERFObject) => {
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

      let erfLoader = new AsyncLoop({
        array: texture_packs,
        onLoop: (erf: ERFObject, asyncLoop: AsyncLoop) => {
          let name = erf.resource_path.split(path.sep).pop();
          let subTypes: {[key: string]: FileBrowserNode} = {};

          let node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          erfList.addChildNode(node);

          let files = erf.KeyList;

          for (let i = 0; i < files.length; i++) {
            let resource = files[i];
            let resref = resource.ResRef;
            let letter = resref[0].toLowerCase();

            if (subTypes[letter] == undefined) {
              subTypes[letter] = new FileBrowserNode({
                name: letter.toUpperCase(),
                type: 'group',
                nodes: [],
              });
              node.addChildNode(subTypes[letter]);
            }

            subTypes[letter].addChildNode(new FileBrowserNode({
              name: `${resref}.${ResourceTypes.getKeyByValue(resource.ResType)}`,
              type: 'resource',
              data: {
                path: `${erf.resource_path}?${resref}.${ResourceTypes.getKeyByValue(resource.ResType)}`,
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

	static LoadFolderForFileBrowser(folder_name = '') {
    return new Promise<FileBrowserNode>( (resolve, reject) => {
      console.log('Loading: ', folder_name);
      //Load StreamWaves
      let folder: FileBrowserNode =  new FileBrowserNode({ 
        name: folder_name, 
        type: 'group', 
        nodes: [] 
      });
      console.log('DIR Read: ', folder_name, 'BEGIN');
      KotOR.GameFileSystem.readdir( folder_name, { recursive: true } ).then( (files: string[]) => {
        console.log('DIR Read: ', folder_name, 'END');
        (folder.nodes as any)._indexes = {};

        for (let i = 0; i < files.length; i++) {
          let file = files[i];
          let parts = file.split(path.sep);
          parts.shift();

          let newfile = parts.pop() || '';
          let targetFolder = folder;

          for (let i = 0; i < parts.length; i++) {
            if (
              typeof (targetFolder.nodes as any)._indexes[parts[i]] ===
              'undefined'
            ) {
              //Push the new folder and get the index
              let index =
                targetFolder.addChildNode( new FileBrowserNode({
                  name: parts[i].trim(),
                  type: 'group',
                  nodes: [],
                })) - 1;
              (targetFolder.nodes as any)._indexes[parts[i]] = index;
              targetFolder = targetFolder.nodes[index];
              (targetFolder.nodes as any)._indexes = {};
            } else {
              let index = (targetFolder.nodes as any)._indexes[parts[i]];
              targetFolder = targetFolder.nodes[index];
            }
          }

          targetFolder.addChildNode( 
            new FileBrowserNode({
              name: newfile.trim(),
              type: 'resource',
              data: { path: files[i] },
              nodes: [],
            })
          );

          /*targetFolder.nodeList.sort( (a, b) => {
            return a.type == 'group' ? 0 : 1;
          });*/
        }

        folder.nodes.sort((a: any, b: any) => {
          let compareType =
            a.type == 'group' && b.type != 'group' ? -1 : 1;
          let compareName = a.name.localeCompare(b.name);

          return compareType || compareName;
        });

        console.log('Compile Structure: ', folder_name, 'END');

        resolve(folder);
      }).catch( (err: any) => {
        resolve(folder)
      }); 
    });
	}

}
