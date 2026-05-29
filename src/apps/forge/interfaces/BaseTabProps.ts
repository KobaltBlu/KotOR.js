import { TabState } from '@/apps/forge/states/tabs';

export interface BaseTabProps {
  tab: TabState;
  northContent?: JSX.Element;
  southContent?: JSX.Element;
  eastContent?: JSX.Element;
  westContent?: JSX.Element;
}
