import { SceneGraphNode } from "../SceneGraphNode";

export class SceneGraphTreeViewManager {

  parentNodes: SceneGraphNode[] = [];
  sceneNode: SceneGraphNode = new SceneGraphNode({name: 'Scene'});
  lightingNode: SceneGraphNode = new SceneGraphNode({name: 'Lights'});
  objectsNode: SceneGraphNode = new SceneGraphNode({name: 'Objects'});

  constructor(){
    this.sceneNode.addChildNode(this.lightingNode);
    this.sceneNode.addChildNode(this.objectsNode);
    this.parentNodes.push(this.sceneNode);
  }

}
