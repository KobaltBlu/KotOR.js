import { Observable, Subscriber } from "rxjs";
// import  * as FFmpeg   from "./ffmpeg.min";
import { WorkerMessage } from "../interface/worker/ffmpeg/WorkerMessage";
import { DecodeMessageData } from "../interface/worker/ffmpeg/DecodeMessageData";
import { LoadMessageData } from "../interface/worker/ffmpeg/LoadMessageData";

// const FFmpeg = require('./ffmpeg.min');
import { FFmpeg } from "./ffmpeg";

let checkInterval: NodeJS.Timer;

const instances: any[] = [];

console.log(FFmpeg);

const bufferStream = (ffmpeg: any, sourceBuffer: Buffer, segment_length: number = 5) => {
  //@ts-expect-error
  return new Observable(async (subscriber: Subscriber<Uint8Array>) => {
    const fileExists = (file: string) => ffmpeg.FS("readdir", "/").includes(file) as boolean;
    const readFile = (file: string) => ffmpeg.FS("readFile", file) as Uint8Array;
    
    ffmpeg.FS(
      "writeFile",
      "input.mp4",
      new Uint8Array(sourceBuffer, 0, sourceBuffer.byteLength)
    );

    let index = 0;

    console.log('decode started');

    const args = [
      "-i", "input.mp4",
      "-g", "1",
      // "-vf", "scale=1920:-1",
      // Encode for MediaStream
      "-segment_format_options", "movflags=frag_keyframe+empty_moov+default_base_moof",
      // encode 5 second segments
      "-segment_time", `${segment_length}`,
      // write to files by index
      "-f", "segment", "%d.mp4"
    ];

    // const args = [
    //   '-i', 'input.mp4', 
    //   '-g', '1', 
    //   '-ss', '00:00:00', 
    //   '-t', '00:00:05', 
    //   '-c:v', 'libx264', '-preset', 'veryfast', 
    //   '-c:a', 'aac', 
    //   // '-movflags', '+frag_keyframe+empty_moov+default_base_moof', 
    //   '0.mp4',
    // ];

    ffmpeg
    .run( ...args )
    .then(() => {
      console.log('decode complete');
      // clearInterval(checkInterval);
      // send out the remaining files
      console.log('checking for remainging files...')
      while (fileExists(`${index}.mp4`)) {
        console.log('reading:', `${index}.mp4`);
        subscriber.next(readFile(`${index}.mp4`));
        index++;
      }
      try{ ffmpeg.exit(); } catch(e){console.error(e)}
      subscriber.complete();
      console.log('subscriber complete')
    });

    checkInterval = setInterval(() => {
      console.log('setInterval...');
      // periodically check for files that have been written
      if (fileExists(`${index + 1}.mp4`)) {
        console.log('reading:', `${index}.mp4`);
        subscriber.next(readFile(`${index}.mp4`));
        index++;
      }
    }, 200);
  });
}

const onDecode = (message: WorkerMessage<DecodeMessageData>) => {
  if(message && message.data.buffer){
    const movie_buffer = Buffer.from(message.data.buffer);
    try{
      bufferStream(instances[0], movie_buffer, message?.data.segment_length).subscribe({
        next: (buffer: Uint8Array) => {
          try{
            postMessage({
              type: 'decode',
              status: 'buffering',
              buffer: buffer,
              //@ts-expect-error
            }, [buffer.buffer]);
          }catch(e){
            console.error(e);
          }
        },
        complete: () => {
          try{
            postMessage({
              type: 'decode',
              status: 'eos',
            });
          }catch(e){
            console.error(e);
          }
        }
      });
    }catch(e){
      console.error(e);
    }
  }
};

const onLoad = async (message: WorkerMessage<LoadMessageData>) => {
  if(!message.data.instance_count) message.data.instance_count = 1;
  if(message.data.instance_count < 0) message.data.instance_count = 1;
  if(message.data.instance_count > 2) message.data.instance_count = 2;

  for(let i = 0; i < message.data.instance_count; i++){
    const ffmpeg = new FFmpeg({
      // corePath: window.origin+"/thirdparty/ffmpeg-core.js",
      corePath: '../thirdparty/ffmpeg/ffmpeg-core.js',
      // wasmPath: '../thirdparty/ffmpeg-core.wasm',
      // workerPath: '../thirdparty/ffmpeg-core.worker.js',
      log: true
    });
    await ffmpeg.load();
    instances[i] = ffmpeg;
  }

  postMessage({
    type: 'load',
    status: 'completed',
    instance_count: message.data.instance_count
  });

};

self.onmessage = (e: MessageEvent<WorkerMessage<any>>) => {

  const message = e.data;
  console.log(message);
  switch(message.type){
    case 'load':
      onLoad(message);
    break;
    case 'decode':
      onDecode(message);
    break;
  }

};
