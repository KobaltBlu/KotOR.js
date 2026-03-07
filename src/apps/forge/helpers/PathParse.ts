
export interface ParsedPath {
  root:string, 
  dir: string, 
  base: string, 
  ext: string, 
  name: string,
  isWin32Path: boolean,
  originalPath: string,
  protocol: string,
  hasProtocol: boolean
}

export const pathParse = (filepath: string): ParsedPath => {
  // Detect protocol patterns (file://, ftp://, http://, etc.)
  const protocolMatch = filepath.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
  const hasProtocol = !!protocolMatch;
  const protocol = hasProtocol ? protocolMatch![1] : '';
  
  // Remove protocol from path for processing
  const pathWithoutProtocol = hasProtocol ? filepath.substring(protocol.length + 3) : filepath;
  
  // Detect if this is a Windows path (contains backslashes or drive letter)
  const isWin32Path = pathWithoutProtocol.includes('\\') || /^[A-Za-z]:/.test(pathWithoutProtocol);
  
  // Normalize the path to use forward slashes
  const normalizedPath = pathWithoutProtocol.replace(/\\/g, '/');
  
  let parsed: ParsedPath = { 
    root: '', 
    dir: '', 
    base: '', 
    ext: '', 
    name: '',
    isWin32Path: isWin32Path,
    originalPath: filepath,
    protocol: protocol,
    hasProtocol: hasProtocol
  };
  
  // Handle empty or root paths
  if (!normalizedPath || normalizedPath === '/') {
    parsed.root = isWin32Path ? '' : '/';
    parsed.dir = isWin32Path ? '' : '/';
    return parsed;
  }
  
  // Extract root (drive letter for Windows, / for Unix)
  let root = '';
  if (isWin32Path && /^[A-Za-z]:/.test(normalizedPath)) {
    root = normalizedPath.substring(0, 2); // C: or D: etc.
  } else if (normalizedPath.startsWith('/')) {
    root = '/';
  }
  parsed.root = root;
  
  // Split path into parts
  const parts = normalizedPath.split('/').filter(part => part !== '');
  
  // Handle case where path ends with a slash (directory path)
  const endsWithSlash = normalizedPath.endsWith('/');
  
  let filename = '';
  let dirParts: string[] = [];
  
  if (endsWithSlash || parts.length === 0) {
    // This is a directory path, no filename
    dirParts = parts;
  } else {
    // Extract filename and directory parts
    filename = parts[parts.length - 1];
    dirParts = parts.slice(0, -1);
  }
  
  // Build directory path
  let dir = '';
  if (hasProtocol) {
    // For protocol URLs, reconstruct the full path
    if (isWin32Path && root) {
      // Windows with protocol: file:///C:/path/to/dir
      dir = root + (dirParts.length > 0 ? '/' + dirParts.join('/') : '');
    } else if (root === '/') {
      // Unix with protocol: file:///path/to/dir
      dir = root + dirParts.join('/');
    } else {
      // Protocol with relative path: file://path/to/dir
      dir = dirParts.join('/');
    }
  } else {
    // No protocol, standard path handling
    if (isWin32Path && root) {
      // Windows: C:/path/to/dir
      dir = root + (dirParts.length > 0 ? '/' + dirParts.join('/') : '');
    } else if (root === '/') {
      // Unix: /path/to/dir
      dir = root + dirParts.join('/');
    } else {
      // Relative path: path/to/dir
      dir = dirParts.join('/');
    }
  }
  
  // Ensure directory path ends with slash for consistency
  if (dir && !dir.endsWith('/') && (dirParts.length > 0 || root === '/')) {
    dir += '/';
  }
  
  parsed.dir = dir;
  
  // Parse filename if present
  if (filename) {
    const filenameParts = filename.split('.');
    const name = filenameParts[0];
    let ext = '';
    if (filenameParts.length > 1) {
      ext = filenameParts.slice(1).join('.');
    }
    parsed.base = filename;
    parsed.ext = ext;
    parsed.name = name;
  }
  
  return parsed;
}
