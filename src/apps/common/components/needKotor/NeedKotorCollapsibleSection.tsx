import React, { useState } from "react";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import {
  getKotorStoreProductByGameKey,
  KotORStoreProduct,
} from "@/apps/common/data/kotorStoreProducts";
import { NeedKotorPanel } from "@/apps/common/components/needKotor/NeedKotorPanel";

export interface NeedKotorCollapsibleSectionProps {
  gameKey?: GameEngineType;
  products?: KotORStoreProduct[];
  heading?: string;
  defaultExpanded?: boolean;
}

export const NeedKotorCollapsibleSection: React.FC<NeedKotorCollapsibleSectionProps> = ({
  gameKey,
  products,
  heading = "Don't have the game yet?",
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const resolvedProducts =
    products ??
    (gameKey ? [getKotorStoreProductByGameKey(gameKey)].filter(Boolean) as KotORStoreProduct[] : undefined);

  if (!resolvedProducts?.length) {
    return null;
  }

  return (
    <div className="need-kotor-collapsible">
      <button
        type="button"
        className="need-kotor-collapsible__toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="need-kotor-collapsible__toggle-label">{heading}</span>
        <span className="need-kotor-collapsible__toggle-icon" aria-hidden="true">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded && (
        <div className="need-kotor-collapsible__content">
          <NeedKotorPanel
            variant="compact"
            products={resolvedProducts}
            showIntro={false}
            showFootnote={true}
          />
        </div>
      )}
    </div>
  );
};

export default NeedKotorCollapsibleSection;
