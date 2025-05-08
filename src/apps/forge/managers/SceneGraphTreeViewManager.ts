import { OdysseyModelNode, OdysseyModelNodeType, OdysseyObject3D } from "../KotOR";
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
            onClick: (node) => {

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
          onClick: (node) => {

          },
        });

        processNode(model.children[0] as OdysseyObject3D, modelNode);

        this.objectsNode.addChildNode(modelNode);
      }

    }

  }

}
