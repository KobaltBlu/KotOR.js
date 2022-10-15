import * as fs from "fs";

export const recursive = function(resource_path: string = '', files: any[] = []) {
  return new Promise<string[]>( (resolve, reject) => {
    fs.stat(resource_path, (err, stats: fs.Stats) => {
      if(err){
        reject(err);
        return;
      }
      if(!stats.isDirectory()){
        files.push(resource_path);
        resolve(files);
        return;
      }else{
        fs.readdir(resource_path, async (err, files: string[]) => {
          if(err){
            reject(err);
            return;
          }
          let file: string;
          for(let i = 0, len = files.length; i < len; i++){
            file = files[i];
            try{
              await recursive(file, files);
            }catch(e){
              reject(err);
            }
          }
        });
      }

    });
  });
}