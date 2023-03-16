import { OdysseyModelNodeType } from "../KotOR";
import { SceneGraphNode } from "../SceneGraphNode";
import { UI3DRenderer } from "../UI3DRenderer";

export class SceneGraphTreeViewManager {

  context: UI3DRenderer;

  parentNodes: SceneGraphNode[] = [];
  sceneNode: SceneGraphNode = new SceneGraphNode({name: 'Scene'});
  camerasNode: SceneGraphNode = new SceneGraphNode({name: 'Cameras'});
  lightingNode: SceneGraphNode = new SceneGraphNode({name: 'Lights'});
  objectsNode: SceneGraphNode = new SceneGraphNode({name: 'Objects'});

  constructor(){
    this.sceneNode.addChildNode(this.camerasNode);
    this.sceneNode.addChildNode(this.lightingNode);
    this.sceneNode.addChildNode(this.objectsNode);
    this.parentNodes.push(this.sceneNode);
    this.sceneNode.expandNode();
  }

  attachUI3DRenderer(context: UI3DRenderer){
    this.context = context;
    this.rebuild();
  }

  rebuild(){

    this.camerasNode.setNodes([]);
    this.lightingNode.setNodes([]);
    this.objectsNode.setNodes([]);

    if(this.context){

      if(this.context.camera){
        this.camerasNode.addChildNode(
          new SceneGraphNode({
            uuid: this.context.camera.uuid,
            name: 'Fly Camera',
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
            onClick: (node) => {

            },
          })
        );
      }

      for(let i = 0; i < this.context.odysseyModels.length; i++){
        const model = this.context.odysseyModels[i];
        const modelNode = new SceneGraphNode({
          uuid: model.uuid,
          name: model.name,
          data: model,
          onClick: (node) => {

          },
        });

        model.nodes.forEach( (node) => {
          let icon = '';

          if ((node.odysseyModelNode.nodeType & OdysseyModelNodeType.Header) == OdysseyModelNodeType.Header){
            icon = 'fa-regular fa-square';
          }
    
          if ((node.odysseyModelNode.nodeType & OdysseyModelNodeType.Reference) == OdysseyModelNodeType.Reference) {
            icon = 'fa-solid fa-circle-nodes';
          }
    
          if ((node.odysseyModelNode.nodeType & OdysseyModelNodeType.Light) == OdysseyModelNodeType.Light) {
            icon = 'fa-solid fa-lightbulb';
          }
    
          if ((node.odysseyModelNode.nodeType & OdysseyModelNodeType.Mesh) == OdysseyModelNodeType.Mesh) {
            icon = 'fa-solid fa-vector-square';
          }
    
          if ((node.odysseyModelNode.nodeType & OdysseyModelNodeType.Skin) == OdysseyModelNodeType.Skin) {
            icon = 'fa-solid fa-shirt';
          }
    
          if ((node.odysseyModelNode.nodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB) {
            icon = 'fa-solid fa-person-walking-dashed-line-arrow-right';
          }
    
          if ((node.odysseyModelNode.nodeType & OdysseyModelNodeType.Dangly) == OdysseyModelNodeType.Dangly) {
            icon = 'fa-solid fa-flag';
          }
          if ((node.odysseyModelNode.nodeType & OdysseyModelNodeType.Saber) == OdysseyModelNodeType.Saber) {
            icon = 'fa-solid fa-wand-magic';
          }
    
          if ((node.odysseyModelNode.nodeType & OdysseyModelNodeType.Emitter) == OdysseyModelNodeType.Emitter) {
            icon = 'fa-solid fa-burst';
          }
          
          modelNode.addChildNode(
            new SceneGraphNode({
              uuid: node.uuid,
              name: node.name,
              icon: icon,
              data: node,
              onClick: (node) => {
                this.context.selectObject(node.data);
              },
            })
          )
        });

        this.objectsNode.addChildNode(modelNode);
      }

    }

  }

}
