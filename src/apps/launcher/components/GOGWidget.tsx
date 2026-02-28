import React, { useEffect, useState, useCallback } from 'react';

import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Default);
import "@/apps/launcher/styles/GOGWidget.scss";

// Types and Interfaces
export enum ContentType {
  GAME = 0,
  MOVIE = 1
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
}

// Utility functions
const CURRENCY_EXCEPTIONS_FORMATTING = ["RUB", "CNY"];

const formatPrice = (price: number, currency: string): string => {
  // GOG API returns prices in cents, so we need to convert to dollars
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
  if (!template) return '';
  return template.replace("_{formatter}", formatter ? "_" + formatter : "");
};

const generateBackgroundUrl = (template: string, formatter?: string): string => {
  if (!template) return '';
  const extension = template.match(/.jpg|.png/);
  if (!extension) return template;
  return template.replace(extension[0], formatter ? "_" + formatter + extension[0] : extension[0]);
};

// API functions
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

// Main GOGWidget Component
export const GOGWidget: React.FC<GOGWidgetProps> = ({
  productId,
  onError,
  onProductLoaded,
  className = '',
  showPrice = true,
  showDiscount = true,
  imageFormatter = '',
  backgroundFormatter = ''
}) => {
  const [product, setProduct] = useState<GOGProduct | null>(null);
  const [priceData, setPriceData] = useState<GOGPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load product data
  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const productResponse = await fetchProductData(productId);

      if (!productResponse || !productResponse._embedded || !productResponse._embedded.product) {
        throw new Error('Invalid product data received');
      }

      const productData = productResponse._embedded.product;
      const newProduct: GOGProduct = {
        id: productId,
        type: ContentType.GAME, // Default to GAME, could be determined from API
        title: productData.title || 'Unknown Product',
        isAvailableForSale: productData.isAvailableForSale || false,
        isPreorder: productData.isPreorder || false,
        storeUri: productResponse._links?.store?.href || '',
        priceUri: productData._links?.prices?.href || '',
        currency: '',
        basePrice: 0,
        finalPrice: 0,
        supportedOs: productResponse._embedded?.supportedOperatingSystems?.map((os: any) => 
          os.operatingSystem?.name || 'Unknown'
        ) || [],
        imageFormatterTemplate: productData._links?.image?.href || '',
        backgroundFormatterTemplate: productResponse._links?.backgroundImage?.href || '',
        getImage: (formatter?: string) => generateImageUrl(productData._links?.image?.href || '', formatter),
        getBackground: (formatter?: string) => generateBackgroundUrl(productResponse._links?.backgroundImage?.href || '', formatter)
      };

      setProduct(newProduct);

      // Load price data
      try {
        const priceResponse = await fetchPriceData(`52756712356612660`, productId);

        if (priceResponse && priceResponse._embedded && priceResponse._embedded.prices && priceResponse._embedded.prices.length > 0) {
          const price = priceResponse._embedded.prices[0];
          const basePrice = parseInt(price.basePrice) || 0;
          const finalPrice = parseInt(price.finalPrice) || 0;
          const currency = price.currency?.code || 'USD';

          setPriceData({
            basePrice,
            finalPrice,
            currency,
            discount: isPriceDiscounted(basePrice, finalPrice) ? calculateDiscountPercent(basePrice, finalPrice) : undefined
          });

          // Update product with price info
          setProduct(prev => prev ? {
            ...prev,
            basePrice,
            finalPrice,
            currency
          } : null);
        } else {
          log.warn('No price data found in response:', priceResponse);
        }
      } catch (priceError) {
        log.warn('Failed to load price data:', priceError);
        // Don't fail the entire widget if price loading fails
      }

      onProductLoaded?.(newProduct);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [productId, onError, onProductLoaded]);

  // Load product on mount
  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Handle store link click
  const handleStoreClick = () => {
    if (product?.storeUri) {
      window.open(product.storeUri, '_blank');
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className={`gog-widget ${className}`}>
        <div className="gog-widget__loading">
          <div className="gog-widget__spinner"></div>
          <span>Loading product information...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error || !product) {
    return (
      <div className={`gog-widget ${className}`}>
        <div className="gog-widget__error">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error || 'Failed to load product information'}</span>
        </div>
      </div>
    );
  }

  // Render product information
  return (
    <div className={`gog-widget ${className}`}>
      <div className="gog-widget__container">
        {/* Product Image */}
        {product.imageFormatterTemplate && (
          <div className="gog-widget__image">
            <img
              src={product.getImage ? product.getImage(imageFormatter) : product.imageFormatterTemplate}
              alt={product.title}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Product Info */}
        <div className="gog-widget__content">
          <h3 className="gog-widget__title">{product.title}</h3>

          {/* Operating Systems */}
          {product.supportedOs.length > 0 && (
            <div className="gog-widget__os">
              <span className="gog-widget__os-label">Platforms:</span>
              <span className="gog-widget__os-list">
                {product.supportedOs.map((os: string) => (
                  <>
                    <span className={`fa-brands fa-${os.toLowerCase()}`}></span>
                  </>
                ))}
              </span>
            </div>
          )}

          {/* Availability Status */}
          {/* <div className="gog-widget__status">
            {product.isPreorder ? (
              <span className="gog-widget__preorder">Pre-order Available</span>
            ) : product.isAvailableForSale ? (
              <span className="gog-widget__available">Available Now</span>
            ) : (
              <span className="gog-widget__unavailable">Currently Unavailable</span>
            )}
          </div> */}

          {/* Price Information */}
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
                        <span className="gog-widget__discount">
                          -{priceData.discount}%
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="gog-widget__price-final">
                    <span className="gog-widget__price">
                      {priceData.basePrice === 0 ? 'Free' : `${formatPrice(priceData.finalPrice, priceData.currency)} ${priceData.currency}`}
                    </span>
                  </div>
                )
              ) : (
                <div className="gog-widget__price-final">
                  <span className="gog-widget__price gog-widget__price--unavailable">
                    Price not available
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Store Link */}
          {product.storeUri && (
            <button
              className="gog-widget__store-button"
              onClick={handleStoreClick}
              disabled={!product.isAvailableForSale && !product.isPreorder}
            >
              {product.isPreorder ? 'Pre-order on GOG' : 'View on GOG'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GOGWidget;
