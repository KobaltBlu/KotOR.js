/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The AudioLoader class is used for finding and loading audio files by name and filetype.
 */

class AudioLoader {

  constructor (  ) {



  }

  static toArrayBuffer(buffer) {
    let ab = new ArrayBuffer(buffer.length);
    let view = new Uint8Array(ab);
    for (let i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

  static LoadSound (ResRef = null, onLoad = null, onError = null){

    if(AudioLoader.cache.hasOwnProperty(ResRef)){
      if(onLoad != null)
        onLoad(AudioLoader.cache[ResRef]);
    }else{

      let visKey = Global.kotorKEY.GetFileKey(ResRef, ResourceTypes['wav']);
      if(visKey != null){
        Global.kotorKEY.GetFileData(visKey, (buffer) => {
          //console.log(buffer);
          new AudioFile(buffer, (af)=> {
            //console.log(af, buffer)
            af.GetPlayableByteStream( (data) => {

              if(data.byteLength){
                //AudioLoader.cache[ResRef] = data;
                if(onLoad != null)
                  onLoad(data);
              }else{
                //AudioLoader.cache[ResRef] = buffer;
                if(onLoad != null)
                  onLoad(buffer);
              }
              
            });
          });
        }, () => {
          //console.log('LoadStreamSound', ResRef)
          this.LoadStreamSound( ResRef, onLoad, onError);
        });
      }else{
        //console.log('LoadStreamSound', ResRef)
        this.LoadStreamSound( ResRef, onLoad, onError);
      }

    }

  }

  static LoadStreamSound (ResRef = null, onLoad = null, onError = null) {

    let file = path.join(app_profile.directory, 'streamsounds', ResRef+'.wav');

    //console.log('LoadStreamSound', ResRef, file);

    fs.readFile(file, (err, buffer) => {
      if (err) {
        //console.log('AudioLoader.LoadStreamSound : read', err);
        if(onError != null)
          onError(err);
      }else{
        new AudioFile(buffer, (af)=> {
          //console.log(af, buffer)
          af.GetPlayableByteStream( (data) => {
            if(onLoad != null)
              onLoad(data);
          });
        });
      }

    });

  }

  static LoadStreamWave (ResRef = null, onLoad = null, onError = null) {

    //let file = path.join(app_profile.directory, 'streamwaves', ResRef+'.wav');

    let snd = ResourceLoader.getResource(ResourceTypes['wav'], ResRef);
    if(snd){
      //console.log('LoadStreamSound', ResRef, snd);

      fs.readFile(snd.file, (err, buffer) => {
        if (err) {
          console.log('AudioLoader.LoadStreamWave : read', err);
          if(onError != null)
            onError(err);
        }else{
          new AudioFile(buffer, (af)=> {
            //console.log(af, buffer)
            af.GetPlayableByteStream( (data) => {
              if(onLoad != null)
                onLoad(data);
            });
          });
        }

      });
    }else{
      if(typeof onError === 'function')
        onError();
    }

  }

  static LoadMusic (ResRef = null, onLoad = null, onError = null){
    AudioLoader.LoadAmbientSound(ResRef, onLoad, onError);
  }

  static LoadAmbientSound (ResRef = null, onLoad = null, onError = null) {

    let file = path.join(app_profile.directory, 'streammusic', ResRef+'.wav');
    fs.readFile(file, (err, buffer) => {
      if (err) {
        console.log('AudioLoader.LoadAmbientSound : read', err);
        if(onError != null)
          onError(err);
      }else{
        new AudioFile(buffer, (af)=> {
          //console.log(af, buffer)
          af.GetPlayableByteStream( (data) => {
            if(onLoad != null)
              onLoad(data);
          });
        });
      }

    });

  }

}

AudioLoader.cache = {};

module.exports = AudioLoader;
