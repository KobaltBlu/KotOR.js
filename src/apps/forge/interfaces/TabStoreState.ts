import { EditorFile } from "../EditorFile";

export interface TabStoreState {
  type: string;
  file: EditorFile;
}
