import React from "react";
import { TabState } from "./TabState";
import { TabResourceExplorer } from "../../components/tabs/TabResourceExplorer";
import * as path from "path";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { AsyncLoop } from "../../../../utility/AsyncLoop";
import * as KotOR from "../../KotOR";
import { EditorFileProtocol } from "../../enum/EditorFileProtocol";

export class FileBrowserNode {
  static NODE_ID = 0;
  id: number = 0;
  name: string = '';
  canOrphan: boolean = true;
  nodes: FileBrowserNode[] = [];
  type: 'group'|'resource' = 'group';
  data: any = {};
  open: boolean = false;
  parent: FileBrowserNode;

  constructor(options: any = {}){
    options = Object.assign({
      name: '',
      canOrphan: true,
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
    node.parent = this;
    return this.nodes.push(node);
  }

  searchFor(query: string, results: FileBrowserNode[] = []){
    if(this.type == 'resource'){
      if(this.name.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) >= 0){
        return [...results, this];
      }
    }else{
      for(let i = 0; i < this.nodes.length; i++){
        results = this.nodes[i].searchFor(query, results);
      }
    }
    return results;
  }

  sort(){
    if(this.nodes.length){
      this.nodes.sort( (a: FileBrowserNode, b :FileBrowserNode) => {
        return (a?.name && b?.name) ? a.name.localeCompare(b.name) : 0;
      });
      this.nodes.map( (node: FileBrowserNode) => node.sort() );
    }
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

    this.setContentView(
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
    const waves     = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamWaves');   //KOTOR
    KotOR.LoadingScreen.main.Show('Loading [StreamSounds]...');
    const sounds    = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamSounds');  //KOTOR & TSL
    KotOR.LoadingScreen.main.Show('Loading [StreamMusic]...');
    const music     = await TabResourceExplorerState.LoadFolderForFileBrowser('StreamMusic');   //KOTOR & TSL
    KotOR.LoadingScreen.main.Show('Loading [StreamVoice]...');
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

    TabResourceExplorerState.Resources.push( 
      ...[
        bifs, rims, modules, lips, textures, waves, sounds, music, voice
      ].filter((node: FileBrowserNode) => (node instanceof FileBrowserNode && node.nodes.length)) 
    );
    state.reload();
    KotOR.LoadingScreen.main.Hide();
    return TabResourceExplorerState.Resources;
  }

  static LoadBifs() {
    return new Promise<FileBrowserNode>( (resolve, reject) => {
      let bifs: KotOR.BIFObject[] = [];
      KotOR.BIFManager.bifs.forEach( (bif: KotOR.BIFObject) => {
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
        onLoop: (bif: KotOR.BIFObject, asyncLoop: AsyncLoop) => {
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
            let resref = KotOR.KEYManager.Key.getFileLabel(resource.Id);

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
                  path: `${ EditorFileProtocol.BIF }//${bif.file}?resref=${resref}&restype=${KotOR.ResourceTypes.getKeyByValue(resource.resType)}`
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
		return new Promise<FileBrowserNode>( (resolve, reject) => {
      let rims: KotOR.RIMObject[] = [];
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

      let rimLoader = new AsyncLoop({
        array: rims,
        onLoop: (rim: KotOR.RIMObject, asyncLoop: AsyncLoop) => {
          let name = rim.resource_path.split(path.sep).pop()?.split('.')[0];
          let subTypes: {[key: string]: FileBrowserNode} = {};

          let node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          rimList.addChildNode(node);

          for (let i = 0; i < rim.resources.length; i++) {
            let resource = rim.resources[i];
            let resref = resource.resRef;

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
		return new Promise<FileBrowserNode>( (resolve, reject) => {
      let modules: any[] = [];

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
        onLoop: (rim: KotOR.RIMObject|KotOR.ERFObject, asyncLoop: AsyncLoop) => {
          let name = rim.resource_path.split(path.sep).pop();
          let subTypes: {[key: string]: FileBrowserNode} = {};

          let node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          rimList.addChildNode(node);

          let files = ((rim as any)?.keyList ? (rim as any).keyList : rim.resources as any);

          for (let i = 0; i < files.length; i++) {
            let resource = files[i];
            let resref = resource.resRef;

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
		return new Promise<FileBrowserNode>( (resolve, reject) => {
			let modules: any[] = [];

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
				let nameA = a.resource_path.split(path.sep).pop() || '';
				let nameB = b.resource_path.split(path.sep).pop() || '';
				
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

			let rimLoader = new AsyncLoop({
				array: modules,
				onLoop: (rim: KotOR.RIMObject|KotOR.ERFObject, asyncLoop: AsyncLoop) => {
					let name = rim.resource_path.split(path.sep).pop();
					let subTypes: {[key: string]: FileBrowserNode} = {};

					let node: FileBrowserNode = new FileBrowserNode({
						name: name,
						type: 'group',
						nodes: [],
						canOrphan: false,
					});

					rimList.addChildNode(node);

					let files = ((rim as any)?.keyList ? (rim as any).keyList : rim.resources as any);

					for (let i = 0; i < files.length; i++) {
						let resource = files[i];
						let resRef = resource.resRef;

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
    return new Promise<FileBrowserNode>( (resolve, reject) => {
      let texture_packs: any[] = [];

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

      let erfLoader = new AsyncLoop({
        array: texture_packs,
        onLoop: (erf: KotOR.ERFObject, asyncLoop: AsyncLoop) => {
          let name = erf.resource_path.split(path.sep).pop();
          let subTypes: {[key: string]: FileBrowserNode} = {};

          let node: FileBrowserNode = new FileBrowserNode({
            name: name,
            type: 'group',
            nodes: [],
            canOrphan: false,
          });

          erfList.addChildNode(node);

          let files = erf.keyList;

          for (let i = 0; i < files.length; i++) {
            let resource = files[i];
            let resref = resource.resRef;
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

	static LoadFolderForFileBrowser(folder_name = '') {
    return new Promise<FileBrowserNode>( (resolve, reject) => {
      //Load StreamWaves
      let folder: FileBrowserNode =  new FileBrowserNode({ 
        name: folder_name, 
        type: 'group', 
        nodes: [] 
      });
      KotOR.GameFileSystem.readdir( folder_name, { recursive: true } ).then( (files: string[]) => {
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
              data: { path: `${EditorFileProtocol.FILE}//game.dir/${files[i]}` },
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

        resolve(folder);
      }).catch( (err: any) => {
        console.error(err);
        resolve(folder)
      }); 
    });
	}

}
