import { SceneGraphNode } from "../SceneGraphNode";
import { UI3DRenderer } from "../UI3DRenderer";

export class SceneGraphTreeViewManager {

  context: UI3DRenderer;

  parentNodes: SceneGraphNode[] = [];
  sceneNode: SceneGraphNode = new SceneGraphNode({name: 'Scene'});
  lightingNode: SceneGraphNode = new SceneGraphNode({name: 'Lights'});
  objectsNode: SceneGraphNode = new SceneGraphNode({name: 'Objects'});

  constructor(){
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

    this.lightingNode.setNodes([]);
    this.objectsNode.setNodes([]);

    if(this.context){

      if(this.context.globalLight){
        this.lightingNode.addChildNode(
          new SceneGraphNode({
            uuid: this.context.globalLight.uuid,
            name: 'Ambient Light',
          })
        );
      }

      for(let i = 0; i < this.context.odysseyModels.length; i++){
        const model = this.context.odysseyModels[i];
        const modelNode = new SceneGraphNode({
          uuid: model.uuid,
          name: model.name,
        });

        model.nodes.forEach( (node) => {
          modelNode.addChildNode(
            new SceneGraphNode({
              uuid: node.uuid,
              name: node.name,
            })
          )
        });

        this.objectsNode.addChildNode(modelNode);
      }

    }

  }

}
