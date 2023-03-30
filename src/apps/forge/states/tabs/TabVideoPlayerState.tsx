import React from "react";
import { TabState } from "./";
import { TabVideoPlayer } from "../../components/tabs/TabVideoPlayer";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { EditorFile } from "../../EditorFile";
import * as muxjs from "mux.js";
import { Observable, Subscriber } from "rxjs";
// import { FFmpeg } from "../../../../worker/ffmpeg";
const FFmpeg = require('../../../../worker/ffmpeg.min');

// console.log(FFmpeg);

export interface VideoBufferContext {
  started: boolean;
  decoding: boolean;
  sourceBuf: SourceBuffer;
  mediaSource: MediaSource;
  bufferQueue: Uint8Array[];
  segmentLength: number;
  worker?: Worker;
}

export class TabVideoPlayerState extends TabState {

  tabName: string = `Video Player`;
  bikBuffer: Buffer;

  bufferContext: VideoBufferContext;
  ffmpeg: any;

  createBufferContext(){
    this.bufferContext = {
      started: false,
      decoding: false,
      sourceBuf: undefined as any,
      mediaSource: new MediaSource(),
      bufferQueue: [],
      worker: undefined,//new Worker(('worker-ffmpeg.js')),
      segmentLength: 5,
    };
  }

  createSourceBuffer(buffer: Uint8Array): SourceBuffer {
    const context = this.bufferContext;
    if(context.mediaSource){
      // create a buffer using the correct mime type
      const mime = `video/mp4; codecs="${muxjs.mp4.probe
        .tracks(buffer)
        .map( (t: any) => t.codec)
        .join(",")}"`;
      context.sourceBuf = context.mediaSource.addSourceBuffer(mime);
      
      context.sourceBuf.addEventListener('updateend', function() {
        console.log('updateend', context.sourceBuf.updating, context.mediaSource.readyState, context.sourceBuf);
        if(context.bufferQueue.length){
          const buffer = context.bufferQueue.shift();
          if(buffer){
            context.mediaSource.duration += context.segmentLength;
            context.sourceBuf.timestampOffset += context.segmentLength;
            context.sourceBuf.appendBuffer(buffer);
          }
        }else{
          if(!context.decoding){
            context.mediaSource.endOfStream();
          }
        }
      });
    }
    return context.sourceBuf;
  }

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    // this.singleInstance = true;
    this.isClosable = true;

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.setContentView(<TabVideoPlayer tab={this}></TabVideoPlayer>);
    this.createBufferContext();
    this.openFile();
  }

  openFile(file?: EditorFile){
    return new Promise<Buffer>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        file.readFile().then( (response) => {
          this.bikBuffer = response.buffer;
          resolve(this.bikBuffer);
          this.processEventListener('onEditorFileLoad');
        });
      }
    });

  }

  decode( segmentLength: number = 5 ): Promise<Uint8Array>{
    return new Promise<Uint8Array>( async (resolve, reject) => {
      if(this.bikBuffer){
        const context = this.bufferContext;
        context.segmentLength = segmentLength;
        await this.initFFmpeg();

        this.bufferStream(this.ffmpeg, this.bikBuffer, context.segmentLength).subscribe({
          next: (buffer: Uint8Array) => {
            try{
              this.onDecodeMessage({
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
              this.onDecodeMessage({
                type: 'decode',
                status: 'eos',
              });
            }catch(e){
              console.error(e);
            }
          }
        });

        // const worker = context.worker;
        // if(worker){
        //   worker.addEventListener('message', (e) => {
        //     const message = e.data;
        //     console.log(message);
        //     if(message.type == 'decode'){
        //       this.onDecodeMessage(message);
        //     }else if(message.type == 'load'){
        //       this.onLoadMessage(message);
        //     }
        //   }, false);

        //   //send a load message to the worker
        //   worker.postMessage({
        //     type: 'load',
        //     data: {
        //       instance_count: 1,
        //     }
        //   });
        // }
      }
    });
  }

  onLoadMessage(data: any){
    console.log('onLoadMessage', data);
    const context = this.bufferContext;
    const worker = context.worker;
    if(worker){
      //send a decode message to the worker
      worker.postMessage({
        type: 'decode',
        data: {
          segment_length: context.segmentLength,
          buffer: this.bikBuffer,
        }
      }, [this.bikBuffer.buffer]);
    }
  }

  onDecodeMessage(data: any){
    console.log('onDecodeMessage', data);
    const context = this.bufferContext;
    switch(data.status){
      case 'eos':
        context.decoding = false;
      break;
      case 'buffering':context.decoding = true;
        if(!context.started){
          context.started = true;
          console.log('begin stream')
          context.sourceBuf = this.createSourceBuffer(data.buffer);

          // append the buffer
          context.mediaSource.duration = context.segmentLength;
          context.sourceBuf.timestampOffset = 0;
          context.sourceBuf.appendBuffer(data.buffer);
        }else{
          try{
            context.mediaSource.duration += context.segmentLength;
            context.sourceBuf.timestampOffset += context.segmentLength;
            context.sourceBuf.appendBuffer(data.buffer);
          }catch(e){
            context.bufferQueue.push(data.buffer);
            console.error(e);
          }
        }
      break;
    }
  }

  async initFFmpeg(){
    this.ffmpeg = FFmpeg.createFFmpeg({
      // corePath: window.origin+"/thirdparty/ffmpeg-core.js",
      corePath: '../thirdparty/ffmpeg/ffmpeg-core.js',
      log: true
    });
    await this.ffmpeg.load();
  }
  
  bufferStream(ffmpeg: any, sourceBuffer: Buffer, segment_length: number = 5) {
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

      const args = [
        "-i", "input.mp4",
        "-g", "6",
        // "-vf", "scale=1920:-1",
        // Encode for MediaStream
        "-segment_format_options", "movflags=frag_keyframe+empty_moov+default_base_moof",
        // encode 5 second segments
        "-segment_time", `${segment_length}`,
        // write to files by index
        "-f", "segment", "%d.mp4"
      ];

      let checkInterval: NodeJS.Timer;

      ffmpeg
      .run( ...args )
      .then(() => {
        clearInterval(checkInterval);
        // send out the remaining files
        console.log('checking for remainging files...')
        while (fileExists(`${index}.mp4`)) {
          console.log('reading:', `${index}.mp4`);
          subscriber.next(readFile(`${index}.mp4`));
          index++;
        }
        try{ ffmpeg.exit(); } catch(e){console.error(e)}
        subscriber.complete();
      });

      checkInterval = setInterval(() => {
        // periodically check for files that have been written
        if (fileExists(`${index + 1}.mp4`)) {
          console.log('reading:', `${index}.mp4`);
          subscriber.next(readFile(`${index}.mp4`));
          index++;
        }
      }, 200);
    });
  }

}