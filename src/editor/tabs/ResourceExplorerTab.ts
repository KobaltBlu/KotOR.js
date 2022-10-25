import { BIFManager } from "../../managers/BIFManager";
import { BIFObject } from "../../resource/BIFObject";
import { EditorTab } from "./";

import * as path from "path";
import { AsyncLoop } from "../../utility/AsyncLoop";
import { KEYManager } from "../../managers/KEYManager";
import { ResourceTypes } from "../../resource/ResourceTypes";
import { FileTypeManager } from "../FileTypeManager";
import { EditorFile } from "../EditorFile";
import { RIMManager } from "../../managers/RIMManager";
import { RIMObject } from "../../resource/RIMObject";
import { ERFManager } from "../../managers/ERFManager";
import { ERFObject } from "../../resource/ERFObject";
import { GameFileSystem } from "../../utility/GameFileSystem";

export class ResourceExplorerTab extends EditorTab {
	$scrollContainer: JQuery<HTMLElement>;
	$treeView: JQuery<HTMLElement>;
	treeIndex: number;
	nodeList: any[];
	constructor() {
		super({ closeable: false });

		this.$tabName.text('Game');

		this.$scrollContainer = $(
			`<div class="scroll-container" style="width:100%; overflow: auto;" />`
		);
		this.$treeView = $('<ul class="tree css-treeview js" />');

		this.$scrollContainer.append(this.$treeView);
		this.$tabContent.append(this.$scrollContainer);
	}

	initialize(onComplete?: Function) {
		this.treeIndex = 0;
    this.nodeList = [];

    this.loadBifs(onComplete);
	}

	loadBifs(onComplete?: Function) {
		let bifs: BIFObject[] = [];
		BIFManager.bifs.forEach( (bif: BIFObject) => {
			bifs.push(bif);
		})

		const bifList: any = {
      name: 'BIFs',
      type: 'group',
      nodeList: [],
			canOrphan: false,
    };
    this.nodeList.push(bifList);

		let bifLoader = new AsyncLoop({
			array: bifs,
			onLoop: (bif: BIFObject, asyncLoop: AsyncLoop) => {
				let name = bif.file.split(path.sep).pop().split('.')[0];
				let subTypes: any = {};

				let node: any = {
					name: name,
					type: 'group',
					nodeList: [],
					canOrphan: false,
				};

				bifList.nodeList.push(node);

				for (let i = 0; i < bif.resources.length; i++) {
					let resource = bif.resources[i];
					let resref = KEYManager.Key.GetFileLabel(resource.ID);

					if (subTypes[resource.ResType] == undefined) {
						subTypes[resource.ResType] = {
							name: ResourceTypes.getKeyByValue(resource.ResType),
							type: 'group',
							nodeList: [],
						};
						node.nodeList.push(subTypes[resource.ResType]);
					}

					subTypes[resource.ResType].nodeList.push({
						name:
							resref +
							'.' +
							ResourceTypes.getKeyByValue(resource.ResType),
						type: 'resource',
						data: {
							path:
								bif.file +
								'?' +
								resref +
								'.' +
								ResourceTypes.getKeyByValue(resource.ResType),
						},
						nodeList: [],
					});
				}

				asyncLoop.next();
			},
		});
		bifLoader.iterate(() => {
      this.loadRims(() => {
				this.loadModules(() => {
					this.loadTextures(() => {
						this.loadFolderForFileBrowser('StreamWaves', () => {
							this.loadFolderForFileBrowser('StreamSounds', () => {
								this.loadFolderForFileBrowser('StreamMusic', () => {
									this.loadFolderForFileBrowser('StreamVoice', () => {
										this.$treeView.html(
											this.buildNodeList(this.nodeList, false)
										);

										$('li.link', this.$treeView).on('click', (e: any) => {
											e.preventDefault();

											let resref = e.target.dataset.resref;
											let reskey = parseInt(e.target.dataset.resid);
											let type = e.target.dataset.type;
											let archive = e.target.dataset.archive;

											FileTypeManager.onOpenResource(
												new EditorFile({
													path: e.target.dataset.path,
												})
											);
										});

										if (typeof onComplete === 'function') onComplete();
									});
								});
							});
						});
					});
				});
      });
		});
  }

  loadRims(onComplete?: Function) {
    let rims: RIMObject[] = [];
		RIMManager.RIMs.forEach( (rim: RIMObject) => {
			if(rim.group == "RIMs"){
				rims.push(rim);
			}
		})

    const rimList: any = {
      name: 'RIMs',
      type: 'group',
      nodeList: [],
			canOrphan: false,
    };
    this.nodeList.push(rimList);

		let rimLoader = new AsyncLoop({
			array: rims,
			onLoop: (rim: RIMObject, asyncLoop: AsyncLoop) => {
        let name = rim.resource_path.split(path.sep).pop().split('.')[0];
				let subTypes: any = {};

				let node: any = {
					name: name,
					type: 'group',
					nodeList: [],
					canOrphan: false,
				};

				rimList.nodeList.push(node);

				for (let i = 0; i < rim.Resources.length; i++) {
					let resource = rim.Resources[i];
					let resref = resource.ResRef;

					if (subTypes[resource.ResType] == undefined) {
						subTypes[resource.ResType] = {
							name: ResourceTypes.getKeyByValue(resource.ResType),
							type: 'group',
							nodeList: [],
						};
						node.nodeList.push(subTypes[resource.ResType]);
					}

					subTypes[resource.ResType].nodeList.push({
						name:
							resref +
							'.' +
							ResourceTypes.getKeyByValue(resource.ResType),
						type: 'resource',
						data: {
							path:
								rim.resource_path +
								'?' +
								resref +
								'.' +
								ResourceTypes.getKeyByValue(resource.ResType),
						},
						nodeList: [],
					});
				}

				asyncLoop.next();
			},
		});
		rimLoader.iterate(() => {
      if(onComplete) {
				if (typeof onComplete === 'function') onComplete();
      }
    });
	}
	
  loadModules(onComplete?: Function) {
    let modules: any[] = [];

		RIMManager.RIMs.forEach( (rim: RIMObject) => {
			if(rim.group == "Module"){
				modules.push(rim);
			}
		});

		ERFManager.ERFs.forEach( (erf: ERFObject) => {
			if(erf.group == "Module"){
				modules.push(erf);
			}
		});
		
		//Sort the array by filename
		modules = modules.sort( (a: ERFObject|RIMObject, b: ERFObject|RIMObject) => {
			let nameA = a.resource_path.split(path.sep).pop();
			let nameB = b.resource_path.split(path.sep).pop();
			
			if (nameA < nameB) { return -1; }
			if (nameA > nameB) { return 1; }
			return 0;
		});

    const rimList: any = {
      name: 'Modules',
      type: 'group',
      nodeList: [],
			canOrphan: false,
    };
    this.nodeList.push(rimList);

		let rimLoader = new AsyncLoop({
			array: modules,
			onLoop: (rim: RIMObject|ERFObject, asyncLoop: AsyncLoop) => {
        let name = rim.resource_path.split(path.sep).pop();
				let subTypes: any = {};

				let node: any = {
					name: name,
					type: 'group',
					nodeList: [],
					canOrphan: false,
				};

				rimList.nodeList.push(node);

				let files = rim instanceof RIMObject ? rim.Resources : rim.KeyList;

				for (let i = 0; i < files.length; i++) {
					let resource = files[i];
					let resref = resource.ResRef;

					if (subTypes[resource.ResType] == undefined) {
						subTypes[resource.ResType] = {
							name: ResourceTypes.getKeyByValue(resource.ResType),
							type: 'group',
							nodeList: [],
						};
						node.nodeList.push(subTypes[resource.ResType]);
					}

					subTypes[resource.ResType].nodeList.push({
						name:
							resref +
							'.' +
							ResourceTypes.getKeyByValue(resource.ResType),
						type: 'resource',
						data: {
							path:
								rim.resource_path +
								'?' +
								resref +
								'.' +
								ResourceTypes.getKeyByValue(resource.ResType),
						},
						nodeList: [],
					});
				}

				asyncLoop.next();
			},
		});
		rimLoader.iterate(() => {
      if(onComplete) {
				if (typeof onComplete === 'function') onComplete();
      }
    });
  }
	
  loadTextures(onComplete?: Function) {
    let texture_packs: any[] = [];
		

		ERFManager.ERFs.forEach( (erf: ERFObject) => {
			if(erf.group == "Textures"){
				texture_packs.push(erf);
			}
		});

    const erfList: any = {
      name: 'Texture Packs',
      type: 'group',
      nodeList: [],
			canOrphan: false,
    };
    this.nodeList.push(erfList);

		let erfLoader = new AsyncLoop({
			array: texture_packs,
			onLoop: (erf: ERFObject, asyncLoop: AsyncLoop) => {
        let name = erf.resource_path.split(path.sep).pop();
				let subTypes: any = {};

				let node: any = {
					name: name,
					type: 'group',
					nodeList: [],
					canOrphan: false,
				};

				erfList.nodeList.push(node);

				let files = erf.KeyList;

				for (let i = 0; i < files.length; i++) {
					let resource = files[i];
					let resref = resource.ResRef;
					let letter = resref[0].toLowerCase();

					if (subTypes[letter] == undefined) {
						subTypes[letter] = {
							name: letter.toUpperCase(),
							type: 'group',
							nodeList: [],
						};
						node.nodeList.push(subTypes[letter]);
					}

					subTypes[letter].nodeList.push({
						name:
							resref +
							'.' +
							ResourceTypes.getKeyByValue(resource.ResType),
						type: 'resource',
						data: {
							path:
								erf.resource_path +
								'?' +
								resref +
								'.' +
								ResourceTypes.getKeyByValue(resource.ResType),
						},
						nodeList: [],
					});
				}

				asyncLoop.next();
			},
		});
		erfLoader.iterate(() => {
      if(onComplete) {
				if (typeof onComplete === 'function') onComplete();
      }
    });
  }

	buildNodeList(nodeList: any|any[] = [], canOrphan = false) {
		let str = '';
		if (nodeList instanceof Array) {
			for (let i = 0; i < nodeList.length; i++) {
				str += this.buildNodeList(nodeList[i], canOrphan);
			}
		} else {
			let node = nodeList;
			if (node.type == 'group') {
				if (node.nodeList.length == 1 && canOrphan) {
					for (let i = 0; i < node.nodeList.length; i++) {
						str += this.buildNodeList(node.nodeList[i], false);
					}
				} else {
					str +=
						'<li><input type="checkbox" checked id="list-' +
						this.treeIndex +
						'"><label for="list-' +
						this.treeIndex++ +
						'">' +
						node.name +
						'</label><span></span><ul>';
					for (let i = 0; i < node.nodeList.length; i++) {
						str += this.buildNodeList(node.nodeList[i], typeof node.canOrphan != 'undefined' ? node.canOrphan : true);
					}
					str += '</ul></li>';
				}
			} else {
				str +=
					'<li class="link" data-path="' +
					node.data.path +
					'">' +
					node.name +
					'</li>';
			}
		}

		return str;
	}

	loadFolderForFileBrowser(folder_name = '', onComplete?: Function) {
		//Load StreamWaves
		GameFileSystem.readdir( folder_name, { recursive: true } ).then( (files) => {
			let folder: any = { name: folder_name, type: 'group', nodeList: [] };
			folder.nodeList._indexes = {};

			for (let i = 0; i < files.length; i++) {
				let file = files[i];
				let parts = file.split(path.sep);

				let newfile = parts.pop();
				let targetFolder = folder;

				for (let i = 0; i < parts.length; i++) {
					if (
						typeof targetFolder.nodeList._indexes[parts[i]] ===
						'undefined'
					) {
						//Push the new folder and get the index
						let index =
							targetFolder.nodeList.push({
								name: parts[i].trim(),
								type: 'group',
								nodeList: [],
							}) - 1;
						targetFolder.nodeList._indexes[parts[i]] = index;
						targetFolder = targetFolder.nodeList[index];
						targetFolder.nodeList._indexes = {};
					} else {
						let index = targetFolder.nodeList._indexes[parts[i]];
						targetFolder = targetFolder.nodeList[index];
					}
				}

				targetFolder.nodeList.push({
					name: newfile.trim(),
					type: 'resource',
					data: { path: files[i] },
					nodeList: [],
				});

				/*targetFolder.nodeList.sort( (a, b) => {
					return a.type == 'group' ? 0 : 1;
				});*/
			}

			folder.nodeList.sort((a: any, b: any) => {
				let compareType =
					a.type == 'group' && b.type != 'group' ? -1 : 1;
				let compareName = a.name.localeCompare(b.name);

				return compareType || compareName;
			});

			this.nodeList.push(folder);

			if (typeof onComplete === 'function') onComplete();
		}).catch( (err) => {
			if (typeof onComplete === 'function') onComplete();
		}); 
	}
}
