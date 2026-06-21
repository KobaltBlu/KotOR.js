import React, { useEffect, useState, useCallback } from "react";
import "@/apps/common/components/store/GOGWidget.scss";

export enum ContentType {
  GAME = 0,
  MOVIE = 1,
}

export interface GOGProduct {
  id: string;
  type: ContentType;
  title: string;
  isAvailableForSale: boolean;
  isPreorder: boolean;
  storeUri: string;
  priceUri: string;
  currency: string;
  basePrice: number;
  finalPrice: number;
  supportedOs: string[];
  imageFormatterTemplate: string;
  backgroundFormatterTemplate: string;
  getImage?: (formatter?: string) => string;
  getBackground?: (formatter?: string) => string;
}

export interface GOGPriceData {
  basePrice: number;
  finalPrice: number;
  currency: string;
  discount?: number;
}

export interface GOGWidgetProps {
  productId: string;
  onError?: (error: Error) => void;
  onProductLoaded?: (product: GOGProduct) => void;
  className?: string;
  showPrice?: boolean;
  showDiscount?: boolean;
  imageFormatter?: string;
  backgroundFormatter?: string;
  compact?: boolean;
  embedded?: boolean;
}

const CURRENCY_EXCEPTIONS_FORMATTING = ["RUB", "CNY"];

const formatPrice = (price: number, currency: string): string => {
  const priceInDollars = price / 100;

  if (CURRENCY_EXCEPTIONS_FORMATTING.includes(currency)) {
    return priceInDollars.toString();
  }
  return priceInDollars.toFixed(2);
};

const calculateDiscountPercent = (basePrice: number, finalPrice: number): number => {
  return 100 - Math.ceil(100 * finalPrice / basePrice);
};

const isPriceDiscounted = (basePrice: number, finalPrice: number): boolean => {
  return basePrice > finalPrice;
};

const generateImageUrl = (template: string, formatter?: string): string => {
  if (!template) return "";
  return template.replace("_{formatter}", formatter ? "_" + formatter : "");
};

const generateBackgroundUrl = (template: string, formatter?: string): string => {
  if (!template) return "";
  const extension = template.match(/.jpg|.png/);
  if (!extension) return template;
  return template.replace(extension[0], formatter ? "_" + formatter + extension[0] : extension[0]);
};

const fetchProductData = async (productId: string): Promise<any> => {
  const response = await fetch(`https://api.gog.com/v1/games/${productId}?locale=en-US`);
  if (!response.ok) {
    throw new Error(`Failed to fetch product data: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

const fetchPriceData = async (distributorId: string, productId: string): Promise<any> => {
  const response = await fetch(`https://api.gog.com/widget/${distributorId}/${productId}/prices`);
  if (!response.ok) {
    throw new Error(`Failed to fetch price data: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const GOGWidget: React.FC<GOGWidgetProps> = ({
  productId,
  onError,
  onProductLoaded,
  className = "",
  showPrice = true,
  showDiscount = true,
  imageFormatter = "",
  backgroundFormatter = "",
  compact = false,
  embedded = true,
}) => {
  const [product, setProduct] = useState<GOGProduct | null>(null);
  const [priceData, setPriceData] = useState<GOGPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const productResponse = await fetchProductData(productId);

      if (!productResponse || !productResponse._embedded || !productResponse._embedded.product) {
        throw new Error("Invalid product data received");
      }

      const productData = productResponse._embedded.product;
      const newProduct: GOGProduct = {
        id: productId,
        type: ContentType.GAME,
        title: productData.title || "Unknown Product",
        isAvailableForSale: productData.isAvailableForSale || false,
        isPreorder: productData.isPreorder || false,
        storeUri: productResponse._links?.store?.href || "",
        priceUri: productData._links?.prices?.href || "",
        currency: "",
        basePrice: 0,
        finalPrice: 0,
        supportedOs:
          productResponse._embedded?.supportedOperatingSystems?.map(
            (os: any) => os.operatingSystem?.name || "Unknown"
          ) || [],
        imageFormatterTemplate: productData._links?.image?.href || "",
        backgroundFormatterTemplate: productResponse._links?.backgroundImage?.href || "",
        getImage: (formatter?: string) => generateImageUrl(productData._links?.image?.href || "", formatter),
        getBackground: (formatter?: string) =>
          generateBackgroundUrl(productResponse._links?.backgroundImage?.href || "", formatter),
      };

      setProduct(newProduct);

      try {
        const priceResponse = await fetchPriceData(`52756712356612660`, productId);

        if (
          priceResponse &&
          priceResponse._embedded &&
          priceResponse._embedded.prices &&
          priceResponse._embedded.prices.length > 0
        ) {
          const price = priceResponse._embedded.prices[0];
          const basePrice = parseInt(price.basePrice) || 0;
          const finalPrice = parseInt(price.finalPrice) || 0;
          const currency = price.currency?.code || "USD";

          setPriceData({
            basePrice,
            finalPrice,
            currency,
            discount: isPriceDiscounted(basePrice, finalPrice)
              ? calculateDiscountPercent(basePrice, finalPrice)
              : undefined,
          });

          setProduct((prev) =>
            prev
              ? {
                  ...prev,
                  basePrice,
                  finalPrice,
                  currency,
                }
              : null
          );
        }
      } catch (priceError) {
        console.warn("Failed to load price data:", priceError);
      }

      onProductLoaded?.(newProduct);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [productId, onError, onProductLoaded]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleStoreClick = () => {
    if (product?.storeUri) {
      window.open(product.storeUri, "_blank");
    }
  };

  const widgetClassName = [
    "gog-widget",
    embedded ? "gog-widget--embedded" : "",
    compact ? "gog-widget--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (loading) {
    return (
      <div className={widgetClassName}>
        <div className="gog-widget__loading">
          <div className="gog-widget__spinner"></div>
          <span>Loading product information...</span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={widgetClassName}>
        <div className="gog-widget__error">
          <span className="gog-widget__error-icon" aria-hidden="true">!</span>
          <span>{error || "Failed to load product information"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={widgetClassName}>
      <div className="gog-widget__container">
        {product.imageFormatterTemplate && (
          <div className="gog-widget__image">
            <img
              src={product.getImage ? product.getImage(imageFormatter) : product.imageFormatterTemplate}
              alt={product.title}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}

        <div className="gog-widget__content">
          <h3 className="gog-widget__title">{product.title}</h3>

          {product.supportedOs.length > 0 && (
            <div className="gog-widget__os">
              <span className="gog-widget__os-label">Platforms:</span>
              <span className="gog-widget__os-list">
                {product.supportedOs.map((os: string) => (
                  <span key={os} className="gog-widget__os-item">{os}</span>
                ))}
              </span>
            </div>
          )}

          {showPrice && (
            <div className="gog-widget__pricing">
              {priceData ? (
                isPriceDiscounted(priceData.basePrice, priceData.finalPrice) ? (
                  <>
                    <div className="gog-widget__price-base">
                      <span className="gog-widget__price gog-widget__price--original">
                        {formatPrice(priceData.basePrice, priceData.currency)} {priceData.currency}
                      </span>
                    </div>
                    <div className="gog-widget__price-final">
                      <span className="gog-widget__price gog-widget__price--sale">
                        {formatPrice(priceData.finalPrice, priceData.currency)} {priceData.currency}
                      </span>
                      {showDiscount && priceData.discount && (
                        <span className="gog-widget__discount">-{priceData.discount}%</span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="gog-widget__price-final">
                    <span className="gog-widget__price">
                      {priceData.basePrice === 0
                        ? "Free"
                        : `${formatPrice(priceData.finalPrice, priceData.currency)} ${priceData.currency}`}
                    </span>
                  </div>
                )
              ) : (
                <div className="gog-widget__price-final">
                  <span className="gog-widget__price gog-widget__price--unavailable">Price not available</span>
                </div>
              )}
            </div>
          )}

          {product.storeUri && (
            <button
              type="button"
              className="gog-widget__store-button"
              onClick={handleStoreClick}
              disabled={!product.isAvailableForSale && !product.isPreorder}
            >
              {product.isPreorder ? "Pre-order on GOG" : "View on GOG"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GOGWidget;
