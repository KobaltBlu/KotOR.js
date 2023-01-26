import { EditorFile } from "../EditorFile";

export default interface BaseTabStateOptions {
  editorFile?: EditorFile;
  enableLayoutContainers?: boolean;
  closeable?: boolean;
  singleInstance?: boolean;
}