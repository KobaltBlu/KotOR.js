
export interface ParsedPath {
  root:string, 
  dir: string, 
  base: string, 
  ext: string, 
  name: string
}

export const pathParse = (filepath: string): ParsedPath => {
  let parsed: ParsedPath = { root: '', dir: '', base: '', ext: '', name: '' };
  let sep = '/'; //window.navigator.platform.toLocaleLowerCase() == 'win32' ? '\\' : '/';
  let parts = filepath.split(sep);
  let filename = parts.pop() || '';
  let filename_parts = filename.split('.');
  let name = filename_parts[0];
  let ext = '';
  if(filename_parts.length > 1){
    ext = '.'+filename_parts[1];
  }
  parsed.dir = parts.join(sep);
  parsed.base = filename;
  parsed.ext = ext;
  parsed.name = name;
  return parsed;
}
