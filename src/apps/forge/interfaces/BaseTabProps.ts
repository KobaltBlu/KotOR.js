import type React from "react";

import { TabState } from "@/apps/forge/states/tabs";

export interface BaseTabProps {
  tab: TabState;
  northContent?: React.ReactElement;
  southContent?: React.ReactElement;
  eastContent?: React.ReactElement;
  westContent?: React.ReactElement;
}