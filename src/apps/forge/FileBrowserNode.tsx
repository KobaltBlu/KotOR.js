

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

  async searchFor(query: string, results: FileBrowserNode[] = [], chunkSize: number = 100): Promise<FileBrowserNode[]>{
    if(this.type == 'resource'){
      if(this.matchesPattern(this.name, query)){
        return [...results, this];
      }
    }else{
      // Optimize chunk size based on query complexity
      const optimizedChunkSize = this.getOptimizedChunkSize(query, chunkSize);
      
      // Process nodes in chunks to avoid blocking the main thread
      for(let i = 0; i < this.nodes.length; i += optimizedChunkSize){
        const chunk = this.nodes.slice(i, i + optimizedChunkSize);
        
        // Process chunk
        for(const node of chunk){
          results = await node.searchFor(query, results, optimizedChunkSize);
        }
        
        // Yield control back to the main thread every chunk
        if(i + optimizedChunkSize < this.nodes.length){
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }
    return results;
  }

  private getOptimizedChunkSize(query: string, defaultChunkSize: number): number {
    // For simple queries (no wildcards), use larger chunks
    if(!query.includes('*') && !query.includes('?')){
      return Math.min(defaultChunkSize * 2, 200);
    }
    
    // For complex wildcard queries, use smaller chunks
    return Math.max(defaultChunkSize / 2, 25);
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    const lowerFilename = filename.toLowerCase();
    const lowerPattern = pattern.toLowerCase();
    
    // First check if it's a wildcard pattern (contains * or ?)
    if (pattern.includes('*') || pattern.includes('?')) {
      // Convert wildcard pattern to regex
      const regexPattern = this.wildcardToRegex(pattern);
      const regex = new RegExp(regexPattern, 'i'); // Case insensitive
      return regex.test(filename);
    }
    
    // If no wildcards, check for prefix match (starts with pattern)
    if (lowerFilename.startsWith(lowerPattern)) {
      return true;
    }
    
    // Also check for substring match (contains pattern anywhere)
    return lowerFilename.includes(lowerPattern);
  }

  private wildcardToRegex(pattern: string): string {
    // Escape special regex characters except * and ?
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      .replace(/\*/g, '.*') // * matches any characters
      .replace(/\?/g, '.'); // ? matches single character
    
    // If pattern doesn't start with ^, add it to match from beginning
    if (!regexPattern.startsWith('^')) {
      regexPattern = '^' + regexPattern;
    }
    
    // If pattern doesn't end with $, add it to match to end
    if (!regexPattern.endsWith('$')) {
      regexPattern = regexPattern + '$';
    }
    
    return regexPattern;
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