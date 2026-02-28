import { EventListenerModel } from "@/apps/forge/EventListenerModel";

export interface SceneGraphNodeOptions {
  uuid?: string;
  name: string;
  icon?: string;
  nodes?: SceneGraphNode[];
  onClick?: (node: SceneGraphNode) => void;
  parent?: SceneGraphNode;
  data?: any;
  open?: boolean;
}

export type SceneGraphNodeEventListenerTypes =
  'onExpandStateChange'|'onNameChange'|'onNodesChange'|'onParentChanged'|'onSelectStateChange';

export interface SceneGraphNodeEventListeners {
  onExpandStateChange: Function[],
  onNameChange: Function[],
  onNodesChange: Function[],
  onParentChanged: Function[],
  onSelectStateChange: Function[],
}

export class SceneGraphNode extends EventListenerModel {
  static NODE_ID = 0;
  id: number = 0;
  uuid: string;
  name: string = '';
  icon: string = '';
  nodes: SceneGraphNode[] = [];
  onClick: (node: SceneGraphNode) => void;
  data: any = {};
  open: boolean = false;
  selected: boolean = false;
  parent: SceneGraphNode;

  constructor( props: SceneGraphNodeOptions){
    super();
    props = Object.assign({
      name: '',
      icon: '',
      nodes: [],
      onClick: undefined,
      parent: undefined,
      data: {},
      open: false,
    }, props);

    this.name = props.name;
    this.icon = props.icon as string;
    if(props.parent)  this.parent = props.parent;
    if(props.nodes)   this.nodes = props.nodes;
    if(props.onClick) this.onClick = props.onClick;
    if(props.data)    this.data = props.data;
    if(props.open)    this.open = props.open;
    this.id = SceneGraphNode.NODE_ID++;
  }

  setNodes(nodes: SceneGraphNode[] = []){
    // Clear existing nodes and remove parent references
    for(let i = 0; i < this.nodes.length; i++){
      this.nodes[i].parent = undefined;
    }
    this.nodes = [];
    // Add new nodes
    for(let i = 0; i < nodes.length; i++){
      this.addChildNode(nodes[i]);
    }
    // Fire onNodesChange event to notify listeners that nodes have changed
    this.processEventListener<SceneGraphNodeEventListenerTypes>('onNodesChange', [this]);
  }

  addChildNode(node: SceneGraphNode){
    node.parent = this;
    const idx = this.nodes.push(node);
    node.processEventListener<SceneGraphNodeEventListenerTypes>('onParentChanged', [node, this]);
    this.processEventListener<SceneGraphNodeEventListenerTypes>('onNodesChange', [node]);
    return idx;
  }

  setName(name: string = ''){
    this.name = name;
    this.processEventListener<SceneGraphNodeEventListenerTypes>('onNameChange', [this.name]);
  }

  expandNode(){
    this.open = true;
    this.processEventListener<SceneGraphNodeEventListenerTypes>('onExpandStateChange', [this.name]);
  }

  closeNode(){
    this.open = false;
    this.processEventListener<SceneGraphNodeEventListenerTypes>('onExpandStateChange', [this.name]);
  }

  select(){
    this.selected = true;
    this.processEventListener<SceneGraphNodeEventListenerTypes>('onSelectStateChange', [this.name]);
  }

  traverseAll(cb: Function){
    this.traverseChildren(cb);
    this.traverseAncestors(cb);
  }

  traverseChildren(cb: Function){
    if(typeof cb === 'function') cb(this);
    for(let i = 0; i < this.nodes.length; i++){
      this.nodes[i].traverseChildren(cb);
    }
  }

  traverseAncestors(cb: Function){
    if(this.parent){
      if(typeof cb === 'function') cb(this.parent);
      this.parent.traverseAncestors(cb);
      // for(let i = 0; i < this.nodes.length; i++){
      //   if(this.parent.nodes[i] != this){
      //     this.parent.nodes[i].traverseChildren(cb);
      //   }
      // }
    }
  }

  dispose(){

  }
}