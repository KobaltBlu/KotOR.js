import React from "react";
import {
  KOTOR_STORE_PRODUCTS,
  KotORStoreProduct,
} from "@/apps/common/data/kotorStoreProducts";
import { GamePurchaseCard } from "@/apps/common/components/needKotor/GamePurchaseCard";
import "@/apps/common/components/needKotor/needKotorPanel.scss";

export interface NeedKotorPanelProps {
  variant?: "full" | "compact";
  products?: KotORStoreProduct[];
  showIntro?: boolean;
  showFootnote?: boolean;
}

export const NeedKotorPanel: React.FC<NeedKotorPanelProps> = ({
  variant = "full",
  products = KOTOR_STORE_PRODUCTS,
  showIntro = true,
  showFootnote = true,
}) => {
  const compact = variant === "compact";

  return (
    <div className={`need-kotor-panel ${compact ? "need-kotor-panel--compact" : "need-kotor-panel--full"}`}>
      {showIntro && (
        <p className="need-kotor-panel__intro">
          This project does not support piracy. To use this app, you will need to have obtained a legal copy of the
          supported games that you wish to play.
        </p>
      )}

      <div className="need-kotor-panel__cards">
        {products.map((product) => (
          <GamePurchaseCard key={product.key} product={product} compact={compact} />
        ))}
      </div>

      {showFootnote && (
        <p className="need-kotor-panel__footnote">
          KotOR.js requires a <strong>PC</strong> installation (Steam, GOG, or retail). Mobile store versions are not
          compatible.
        </p>
      )}
    </div>
  );
};

export default NeedKotorPanel;
