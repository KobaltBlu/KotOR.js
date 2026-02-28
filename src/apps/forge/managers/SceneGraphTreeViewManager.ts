import type { EventListenerCallback } from "@/apps/forge/EventListenerModel";
import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import { OdysseyModelNodeType, OdysseyObject3D } from "@/apps/forge/KotOR";
import { ForgeEncounter } from "@/apps/forge/module-editor/ForgeEncounter";
import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";
import { ForgeRoom } from "@/apps/forge/module-editor/ForgeRoom";
import { ForgeTrigger } from "@/apps/forge/module-editor/ForgeTrigger";
import { SceneGraphNode } from "@/apps/forge/SceneGraphNode";
import { GroupType, type UI3DRenderer } from "@/apps/forge/UI3DRenderer";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export interface IModuleGroupNode {
  key: GroupType;
  name: string;
  icon: string;
  objects: ForgeGameObject[];
}

export class SceneGraphTreeViewManager extends EventListenerModel {

  context: UI3DRenderer;

  parentNodes: SceneGraphNode[] = [];
  sceneNode: SceneGraphNode = new SceneGraphNode({name: 'Scene'});
  camerasNode: SceneGraphNode = new SceneGraphNode({name: 'Cameras'});
  lightingNode: SceneGraphNode = new SceneGraphNode({name: 'Lights'});
  objectsNode: SceneGraphNode = new SceneGraphNode({name: 'Objects'});

  groupNodes: Map<GroupType, SceneGraphNode> = new Map();

  constructor(){
    super();
    this.sceneNode.addChildNode(this.camerasNode);
    this.sceneNode.addChildNode(this.lightingNode);
    this.sceneNode.addChildNode(this.objectsNode);
    this.parentNodes.push(this.sceneNode);
    this.sceneNode.expandNode();
  }

  attachUI3DRenderer(context: UI3DRenderer){
    this.context = context;
    this.context.addEventListener('onModuleSet', this.rebuild.bind(this));
    this.rebuild();
  }

  rebuild(){

    this.camerasNode.setNodes([]);
    this.lightingNode.setNodes([]);
    this.objectsNode.setNodes([]);

    if(!this.context){
      return;
    }

    if(this.context.module){
      this.buildModuleSceneGraph();
      return;
    }
    
    this.buildGenericSceneGraph();
  }

  buildModuleSceneGraph(){
    this.sceneNode.name = 'Module: ' + this.context.module.entryArea;
    const groups: IModuleGroupNode[] = [
      {
        key: GroupType.ROOMS,
        name: 'Rooms',
        icon: 'fa-solid fa-dungeon',
        objects: this.context.module.area.rooms,
      },
      {
        key: GroupType.CAMERA,
        name: 'Cameras',
        icon: 'fa-solid fa-video',
        objects: this.context.module.area.cameras,
      },
      {
        key: GroupType.CREATURE,
        name: 'Creatures',
        icon: 'fa-solid fa-person',
        objects: this.context.module.area.creatures,
      },
      {
        key: GroupType.DOOR,
        name: 'Doors',
        icon: 'fa-solid fa-door-open',
        objects: this.context.module.area.doors,
      },
      {
        key: GroupType.ENCOUNTER,
        name: 'Encounters',
        icon: 'fa-solid fa-paw',
        objects: this.context.module.area.encounters,
      },
      {
        key: GroupType.ITEM,
        name: 'Items',
        icon: 'fa-solid fa-wand-sparkles',
        objects: this.context.module.area.items,
      },
      {
        key: GroupType.PLACEABLE,
        name: 'Placeables',
        icon: 'fa-solid fa-toolbox',
        objects: this.context.module.area.placeables,
      },
      {
        key: GroupType.SOUND,
        name: 'Sounds',
        icon: 'fa-solid fa-music',
        objects: this.context.module.area.sounds,
      },
      {
        key: GroupType.STORE,
        name: 'Stores',
        icon: 'fa-solid fa-store',
        objects: this.context.module.area.stores,
      },
      {
        key: GroupType.TRIGGER,
        name: 'Triggers',
        icon: 'fa-solid fa-triangle-exclamation',
        objects: this.context.module.area.triggers,
      },
      {
        key: GroupType.WAYPOINT,
        name: 'Waypoints',
        icon: 'fa-solid fa-location-pin',
        objects: this.context.module.area.waypoints,
      }
    ];

    for(let i = 0; i < groups.length; i++){
      const group = groups[i];

      let groupNode = this.groupNodes.get(group.key);
      if(!groupNode){
        groupNode = new SceneGraphNode({
          uuid: group.key,
          name: group.name,
          data: undefined,
          icon: group.icon,
          nodes: [],
          onClick: (_node) => {

          },
        });
        this.sceneNode.addChildNode(groupNode);
        this.groupNodes.set(group.key, groupNode);
      }
      else
      {
        // Use setNodes() instead of direct assignment to fire onNodesChange event
        groupNode.setNodes([]);
      }

      for(let j = 0; j < group.objects.length; j++){
        const child = group.objects[j];
        if(!child){
          continue;
        }

        const nodeNode =  new SceneGraphNode({
          uuid: child.uuid,
          name: child.getEditorName(),
          icon: group.icon,
          data: child,
          onClick: (node) => {
            this.context.selectObject(node.data.container);
          },
        });

        if(group.key == GroupType.ROOMS){
          const room = child as ForgeRoom;
          if(room.walkmesh){
            const walkmeshNode =  new SceneGraphNode({
              uuid: room.walkmesh.uuid,
              name: 'Walkmesh',
              icon: 'fa-solid fa-person-walking-dashed-line-arrow-right',
              data: room.walkmesh,
              onClick: (node) => {
                this.context.selectObject(node.data);
              },
            });
            nodeNode.addChildNode(walkmeshNode);
          }
        }

        if(group.key == GroupType.TRIGGER || group.key == GroupType.ENCOUNTER){
          const trigger = child as ForgeTrigger | ForgeEncounter;
          for(let k = 0; k < trigger.vertices.length; k++){
            const vertex = trigger.vertices[k];
            const vertexNode =  new SceneGraphNode({
              uuid: `vertex-${k}`,
              name: 'Vertex',
              icon: 'fa-solid fa-circle',
              data: vertex,
              onClick: (_node) => {
                // this.context.selectObject(node.data);
              },
            });
            nodeNode.addChildNode(vertexNode);
          }
        }

        groupNode.addChildNode(nodeNode);
      }
    }
    this.processEventListener('onBuild', [this.parentNodes]);
  }

  buildGenericSceneGraph(){
    this.sceneNode.name = 'Scene';
    if(this.context.camera){
      this.camerasNode.addChildNode(
        new SceneGraphNode({
          uuid: this.context.camera.uuid,
          name: 'Perspective Camera',
          data: this.context.camera,
          onClick: (node) => {
            this.context.currentCamera = node.data;
          },
        })
      );
    }

    for(let i = 0; i < this.context.cameras.length; i++){
      const camera = this.context.cameras[i];
      this.camerasNode.addChildNode(
        new SceneGraphNode({
          uuid: camera.uuid,
          name: camera.name,
          data: camera,
          onClick: (node) => {
            this.context.currentCamera = node.data;
          },
        })
      );
    }

    if(this.context.globalLight){
      this.lightingNode.addChildNode(
        new SceneGraphNode({
          uuid: this.context.globalLight.uuid,
          name: 'Ambient Light',
          data: this.context.globalLight,
          onClick: (_node) => {

          },
        })
      );
    }

    for(let i = 0; i < this.context.odysseyModels.length; i++){
      const model = this.context.odysseyModels[i];

      const processNode = (node: OdysseyObject3D, parentNode: SceneGraphNode) => {

        let icon = '';

        const odysseyNode = node.odysseyModelNode || (node as any).odysseyNode;
        if(!odysseyNode){
          return;
        }

        if ((odysseyNode.nodeType & OdysseyModelNodeType.Header) == OdysseyModelNodeType.Header){
          icon = 'fa-regular fa-square';
        }

        if ((odysseyNode.nodeType & OdysseyModelNodeType.Reference) == OdysseyModelNodeType.Reference) {
          icon = 'fa-solid fa-circle-nodes';
        }

        if ((odysseyNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
          icon = 'fa-solid fa-lightbulb';
        }

        if ((odysseyNode.nodeType & OdysseyModelNodeType.Mesh) == OdysseyModelNodeType.Mesh) {
          icon = 'fa-solid fa-vector-square';
        }

        if ((odysseyNode.nodeType & OdysseyModelNodeType.Skin) == OdysseyModelNodeType.Skin) {
          icon = 'fa-solid fa-shirt';
        }

        if ((odysseyNode.nodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB) {
          icon = 'fa-solid fa-person-walking-dashed-line-arrow-right';
        }

        if ((odysseyNode.nodeType & OdysseyModelNodeType.Dangly) == OdysseyModelNodeType.Dangly) {
          icon = 'fa-solid fa-flag';
        }
        if ((odysseyNode.nodeType & OdysseyModelNodeType.Saber) == OdysseyModelNodeType.Saber) {
          icon = 'fa-solid fa-wand-magic';
        }

        if ((odysseyNode.nodeType & OdysseyModelNodeType.Emitter) == OdysseyModelNodeType.Emitter) {
          icon = 'fa-solid fa-burst';
        }

        const nodeNode =  new SceneGraphNode({
          uuid: node.uuid,
          name: node.name,
          icon: icon,
          data: node,
          onClick: (node) => {
            this.context.selectObject(node.data);
          },
        });

        if(node.children){
          for(let i = 0; i < node.children.length; i++){
            const child = node.children[i];
            if(child instanceof OdysseyObject3D){
              processNode(child, nodeNode);
            }
          }
        }

        parentNode.addChildNode(nodeNode);

        return nodeNode;
      }

      const modelNode = new SceneGraphNode({
        uuid: model.uuid,
        name: model.name,
        data: model,
        onClick: (_node) => {

        },
      });

      processNode(model.children[0] as OdysseyObject3D, modelNode);

      this.objectsNode.addChildNode(modelNode);
    }

    this.processEventListener('onBuild', [this.parentNodes]);
  }

}
