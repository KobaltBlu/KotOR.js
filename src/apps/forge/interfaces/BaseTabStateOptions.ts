import { EditorFile } from "../EditorFile";
import { TabState } from "../states/tabs";

export default interface BaseTabStateOptions {
  editorFile?: EditorFile;
  enableLayoutContainers?: boolean;
  closeable?: boolean;
  singleInstance?: boolean;
  parentTab?: TabState
}