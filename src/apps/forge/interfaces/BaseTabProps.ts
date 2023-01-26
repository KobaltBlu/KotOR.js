import { TabState } from "../states/tabs/TabState";

export interface BaseTabProps {
  tab: TabState;
  northContent?: JSX.Element;
  southContent?: JSX.Element;
  eastContent?: JSX.Element;
  westContent?: JSX.Element;
}