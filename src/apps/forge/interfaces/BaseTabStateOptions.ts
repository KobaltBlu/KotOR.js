import { EditorFile } from "@/apps/forge/EditorFile";
import { TabState } from "@/apps/forge/states/tabs";

export default interface BaseTabStateOptions {
  editorFile?: EditorFile;
  enableLayoutContainers?: boolean;
  closeable?: boolean;
  singleInstance?: boolean;
  parentTab?: TabState
}