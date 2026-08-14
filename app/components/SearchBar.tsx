"use client";

import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";

type ProductData = {
  title: string;
  currentPrice: number | null;
  lowestPrice: number | null;
  rating: number | null;
  image: string | null;
  url: string;
};

export default function SearchBar() {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [showProductCard, setShowProductCard] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trackedProducts, setTrackedProducts] = useState<ProductData[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedProducts = window.localStorage.getItem("tracked-products");
      if (savedProducts) {
        setTrackedProducts(JSON.parse(savedProducts));
      }
    } catch {
      setTrackedProducts([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem("tracked-products", JSON.stringify(trackedProducts));
  }, [trackedProducts]);

  async function handleTrack() {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setMessage("❌ Please enter a valid Amazon product URL.");
      setShowProductCard(false);
      setProduct(null);
      return;
    }

    const valid =
      trimmedUrl.includes("amazon.") &&
      (trimmedUrl.includes("/dp/") || trimmedUrl.includes("/gp/"));

    if (!valid) {
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "API error");
      }

      const data = await response.json();
      setProduct({
        ...data.product,
        url: trimmedUrl,
      });
      setMessage("✅ Product found!");
      setShowProductCard(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "API error");
      setShowProductCard(false);
      setProduct(null);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSaveProduct() {
    if (!product) return;

    setTrackedProducts((current) => {
      const alreadyTracked = current.some((item) => item.url === product.url);

      if (alreadyTracked) {
        setMessage("✨ This product is already being tracked.");
        return current;
      }

      setMessage("⭐ Product saved to tracked products.");
      return [...current, product];
    });
  }

  function handleRemoveTrackedProduct(url: string) {
    setTrackedProducts((current) => current.filter((item) => item.url !== url));
  }

  return (
    <div className="mt-12 w-full max-w-3xl">
      <div className="flex rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
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
          product && trackedProducts.some((item) => item.url === product.url)
        )}
      />

      <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Tracked Products</h3>
          <span className="text-sm text-slate-400">
            {trackedProducts.length} saved
          </span>
        </div>

        {trackedProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center text-slate-400">
            <p className="text-lg font-medium text-slate-300">No tracked products yet.</p>
            <p className="mt-2 text-sm">Save a product to keep it handy here.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {trackedProducts.map((item) => (
              <div
                key={item.url || `${item.title}-${item.image}`}
                className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <img
                  src={item.image || "https://placehold.co/300x300?text=No+Image"}
                  alt={item.title}
                  className="h-20 w-20 rounded-xl object-cover"
                />

                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-white">{item.title}</h4>
                  <p className="mt-2 text-sm text-slate-400">
                    ⭐ {item.rating != null ? item.rating.toFixed(1) : "N/A"}
                  </p>
                  <p className="mt-2 text-lg font-bold text-green-400">
                    €{item.currentPrice != null ? item.currentPrice : "N/A"}
                  </p>
                  <button
                    onClick={() => handleRemoveTrackedProduct(item.url)}
                    className="mt-3 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-red-400 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}