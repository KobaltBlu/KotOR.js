import React from "react";
import { KotORStoreProduct } from "@/apps/common/data/kotorStoreProducts";
import { GOGWidget } from "@/apps/common/components/store/GOGWidget";
import { SteamStoreEmbed } from "@/apps/common/components/needKotor/SteamStoreEmbed";

export interface GamePurchaseCardProps {
  product: KotORStoreProduct;
  compact?: boolean;
}

export const GamePurchaseCard: React.FC<GamePurchaseCardProps> = ({ product, compact = false }) => {
  return (
    <article className={`game-purchase-card ${compact ? "game-purchase-card--compact" : ""}`}>
      <header className="game-purchase-card__header">
        <img className="game-purchase-card__logo" src={product.logoUrl} alt="" />
        <h3 className="game-purchase-card__title">{product.title}</h3>
      </header>

      <div className="game-purchase-card__section">
        <h4 className="game-purchase-card__section-heading">GOG Store</h4>
        <GOGWidget productId={product.gogProductId} compact={compact} embedded />
      </div>

      <div className="game-purchase-card__section">
        <SteamStoreEmbed
          appId={product.steamAppId}
          title={product.title}
          lazyMode={compact ? "click-only" : "observer"}
        />
      </div>
    </article>
  );
};

export default GamePurchaseCard;
