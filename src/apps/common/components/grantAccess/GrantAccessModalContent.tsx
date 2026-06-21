import React from "react";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import GrantAccessInfo from "@/apps/common/components/grantAccess/GrantAccessInfo";
import { NeedKotorCollapsibleSection } from "@/apps/common/components/needKotor/NeedKotorCollapsibleSection";

export interface GrantAccessModalContentProps {
  gameKey?: GameEngineType;
}

export const GrantAccessModalContent: React.FC<GrantAccessModalContentProps> = ({ gameKey }) => {
  return (
    <>
      <GrantAccessInfo />
      <NeedKotorCollapsibleSection gameKey={gameKey} />
    </>
  );
};

export default GrantAccessModalContent;
