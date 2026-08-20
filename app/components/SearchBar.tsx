"use client";

import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import PriceHistoryChart from "./PriceHistoryChart";

type ProductData = {
  title: string;
  currentPrice: number | null;
  lowestPrice: number | null;
  rating: number | null;
  image: string | null;
  url: string;
  targetPrice?: number;
  databaseId?: string;
};

export default function SearchBar() {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [showProductCard, setShowProductCard] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trackedProducts, setTrackedProducts] = useState<ProductData[]>([]);

  useEffect(() => {
    async function loadTrackedProducts() {
      const deviceId = window.localStorage.getItem(
        "pricepeek-device-id"
      );

      if (!deviceId) {
        try {
          const savedProducts =
            window.localStorage.getItem("tracked-products");

          if (savedProducts) {
            setTrackedProducts(JSON.parse(savedProducts));
          }
        } catch {
          setTrackedProducts([]);
        }

        return;
      }

      try {
        const response = await fetch(
          `/api/tracked-products?deviceId=${encodeURIComponent(
            deviceId
          )}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Could not load tracked products"
          );
        }

        setTrackedProducts(data.products);
      } catch {
        try {
          const savedProducts =
            window.localStorage.getItem("tracked-products");

          if (savedProducts) {
            setTrackedProducts(JSON.parse(savedProducts));
          }
        } catch {
          setTrackedProducts([]);
        }
      }
    }

    loadTrackedProducts();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "tracked-products",
      JSON.stringify(trackedProducts)
    );
  }, [trackedProducts]);

  async function handleTrack() {
    const trimmedUrl = url.trim();

    if (
      !trimmedUrl ||
      !trimmedUrl.includes("amazon.") ||
      (!trimmedUrl.includes("/dp/") &&
        !trimmedUrl.includes("/gp/"))
    ) {
      setMessage("❌ Please enter a valid Amazon product URL.");
      setShowProductCard(false);
      setProduct(null);
      return;
    }

    setIsLoading(true);
    setMessage("⏳ Checking product...");
    setShowProductCard(false);
    setProduct(null);

    try {
      const response = await fetch("/api/product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "API error");
      }

      setProduct({
        ...data.product,
        url: trimmedUrl,
      });

      setMessage("✅ Product found!");
      setShowProductCard(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "API error"
      );
      setShowProductCard(false);
      setProduct(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveProduct(targetPrice: number) {
    if (!product) return;

    const alreadyTracked = trackedProducts.some(
      (item) => item.url === product.url
    );

    if (alreadyTracked) {
      setMessage("✨ This product is already being tracked.");
      return;
    }

    const deviceId = window.localStorage.getItem(
      "pricepeek-device-id"
    );

    if (!deviceId) {
      setMessage(
        "🔔 Enable price-drop alerts before tracking a product."
      );
      return;
    }

    setMessage("⏳ Saving price alert...");

    try {
      const response = await fetch("/api/tracked-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceId,
          product,
          targetPrice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not save price alert"
        );
      }

      setTrackedProducts((current) => [
        ...current,
        {
          ...product,
          targetPrice,
          databaseId: data.id,
        },
      ]);

      setMessage(`✅ Alert set for €${targetPrice.toFixed(2)}!`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save price alert"
      );
    }
  }

  async function handleRemoveTrackedProduct(item: ProductData) {
    const deviceId = window.localStorage.getItem(
      "pricepeek-device-id"
    );

    if (deviceId && item.databaseId) {
      try {
        const response = await fetch("/api/tracked-products", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            deviceId,
            id: item.databaseId,
          }),
        });

        if (!response.ok) {
          const data = await response.json();

          throw new Error(
            data.error || "Could not remove price alert"
          );
        }
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not remove price alert"
        );
        return;
      }
    }

    setTrackedProducts((current) =>
      current.filter(
        (productItem) => productItem.url !== item.url
      )
    );

    setMessage("Price alert removed.");
  }

  return (
    <div className="mt-12 w-full max-w-3xl">
      <div className="flex rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl">
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleTrack();
            }
          }}
          disabled={isLoading}
          className="flex-1 bg-transparent px-5 py-4 text-white placeholder:text-slate-500 outline-none disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="https://www.amazon.com/..."
        />

        <button
          onClick={handleTrack}
          disabled={isLoading}
          className="flex min-w-[140px] items-center justify-center rounded-xl bg-green-500 px-8 font-semibold transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Checking...
            </>
          ) : (
            "Track Price"
          )}
        </button>
      </div>

      {message && (
        <p className="mt-4 text-center text-slate-300">
          {message}
        </p>
      )}

      <ProductCard
        visible={showProductCard}
        product={product}
        onStartTracking={handleSaveProduct}
        isTracked={Boolean(
          product &&
            trackedProducts.some(
              (item) => item.url === product.url
            )
        )}
      />

      <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">
            Tracked Products
          </h3>

          <span className="text-sm text-slate-400">
            {trackedProducts.length} saved
          </span>
        </div>

        {trackedProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center text-slate-400">
            <p className="text-lg font-medium text-slate-300">
              No tracked products yet.
            </p>
            <p className="mt-2 text-sm">
              Save a product to keep it handy here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {trackedProducts.map((item) => (
              <div
                key={item.databaseId || item.url}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={
                      item.image ||
                      "https://placehold.co/300x300?text=No+Image"
                    }
                    alt={item.title}
                    className="h-20 w-20 rounded-xl object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-white">
                      {item.title}
                    </h4>

                    <p className="mt-2 text-lg font-bold text-green-400">
                      €
                      {item.currentPrice != null
                        ? item.currentPrice
                        : "N/A"}
                    </p>

                    {item.targetPrice != null && (
                      <p className="mt-1 text-sm text-slate-400">
                        Alert at €{item.targetPrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {item.databaseId && (
                  <PriceHistoryChart
                    productId={item.databaseId}
                  />
                )}

                <button
                  onClick={() =>
                    handleRemoveTrackedProduct(item)
                  }
                  className="mt-4 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-red-400 hover:text-red-400"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}