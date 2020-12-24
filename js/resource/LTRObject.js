

//Some helpful info can be found at
//http://web.archive.org/web/20160801205623/https://forum.bioware.com/topic/134653-ltr-file-format/#entry3901817

class LTRObject {

  constructor( data = null, onLoad = null, onError = null){

    this.data = undefined;
    this.file = undefined;

    if(typeof data === 'string'){
      this.file = data;
    }else{
      this.data = data;
    }

    if(this.file){
      this.openFile(this.file, onLoad, onError);
    }else{
      this.readData(this.data, onLoad, onError);
    }

  }

  openFile(file = null, onLoad = null, onError = null){

  }

  readData(data = null, onLoad = null, onError = null){

    //273168

    //28 * 4 = 112

    //2439

    if(data instanceof Buffer){
      let br = new BinaryReader(data);

      let header_len = 9;

      this.fileType = br.ReadChars(4);
      this.fileVersion = br.ReadChars(4);
      this.charCount = br.ReadByte();

      this.singleArray = [
        [], [], []
      ];
      this.doubleArray = [];
      this.tripleArray = [];

      //Single Array
      for(let i = 0; i < this.charCount; i++){
        this.singleArray[0][i] = br.ReadSingle();
      }

      for(let i = 0; i < this.charCount; i++){
        this.singleArray[1][i] = br.ReadSingle();
      }

      for(let i = 0; i < this.charCount; i++){
        this.singleArray[2][i] = br.ReadSingle();
      }

      //Double Array
      for(let i = 0; i < this.charCount; i++){
        this.doubleArray[i] = [
          [], [], []
        ];

        for(let j = 0; j < this.charCount; j++){
          this.doubleArray[i][0][j] = br.ReadSingle();
        }
  
        for(let j = 0; j < this.charCount; j++){
          this.doubleArray[i][1][j] = br.ReadSingle();
        }
  
        for(let j = 0; j < this.charCount; j++){
          this.doubleArray[i][2][j] = br.ReadSingle();
        }

      }

      //Tripple Array
      for(let i = 0; i < this.charCount; i++){
        this.tripleArray[i] = [];
        for(let j = 0; j < this.charCount; j++){
          this.tripleArray[i][j] = [
            [], [], []
          ];

          for(let k = 0; k < this.charCount; k++){
            this.tripleArray[i][j][0][k] = br.ReadSingle();
          }
    
          for(let k = 0; k < this.charCount; k++){
            this.tripleArray[i][j][1][k] = br.ReadSingle();
          }
    
          for(let k = 0; k < this.charCount; k++){
            this.tripleArray[i][j][2][k] = br.ReadSingle();
          }
        }
      }

      this.data = undefined;
      br = undefined;

    }

  }

}

LTRObject.CharacterArrays = {
  26: 'abcdefghijklmnopqrstuvwxyz',
  28: 'abcdefghijklmnopqrstuvwxyz\'-'
};

module.exports = LTRObject;