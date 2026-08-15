"use client";

import { useEffect, useState } from "react";

type ProductData = {
  title: string;
  currentPrice: number | null;
  lowestPrice: number | null;
  rating: number | null;
  image: string | null;
  url: string;
};

type ProductCardProps = {
  visible: boolean;
  product: ProductData | null;
  onStartTracking: (targetPrice: number) => void;
  isTracked: boolean;
};

export default function ProductCard({
  visible,
  product,
  onStartTracking,
  isTracked,
}: ProductCardProps) {
  const [targetPrice, setTargetPrice] = useState("");

  useEffect(() => {
    if (product?.currentPrice != null) {
      setTargetPrice((product.currentPrice * 0.9).toFixed(2));
    } else {
      setTargetPrice("");
    }
  }, [product?.url, product?.currentPrice]);

  if (!visible || !product) return null;

  const parsedTargetPrice = Number(targetPrice);
  const validTargetPrice =
    Number.isFinite(parsedTargetPrice) && parsedTargetPrice > 0;

  return (
    <div className="mt-10 w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
      <div className="flex flex-col gap-6 sm:flex-row">
        <img
          src={product.image || "https://placehold.co/300x300?text=No+Image"}
          alt={product.title}
          className="h-28 w-28 rounded-2xl object-cover"
        />

        <div className="flex-1">
          <h2 className="text-2xl font-bold">{product.title}</h2>

          <p className="mt-2 font-semibold text-green-400">
            ⭐ {product.rating != null ? product.rating.toFixed(1) : "N/A"} •
            Great time to buy
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-400">Current Price</p>
              <p className="text-2xl font-bold">
                €{product.currentPrice != null ? product.currentPrice : "N/A"}
              </p>
            </div>

            <div>
              <p className="text-slate-400">Lowest Price</p>
              <p className="text-2xl font-bold">
                €{product.lowestPrice != null ? product.lowestPrice : "N/A"}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label
              htmlFor="target-price"
              className="block text-sm font-semibold text-slate-300"
            >
              Alert me when the price reaches
            </label>

            <div className="mt-2 flex items-center rounded-xl border border-slate-700 bg-slate-950 px-4">
              <span className="text-slate-400">€</span>
              <input
                id="target-price"
                type="number"
                min="0.01"
                step="0.01"
                value={targetPrice}
                onChange={(event) => setTargetPrice(event.target.value)}
                className="w-full bg-transparent px-3 py-3 text-white outline-none"
                placeholder="Target price"
              />
            </div>
          </div>

          <button
            onClick={() => onStartTracking(parsedTargetPrice)}
            disabled={isTracked || !validTargetPrice}
            className="mt-6 rounded-xl bg-green-500 px-6 py-3 font-bold transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isTracked ? "Tracking ✓" : "Start Tracking"}
          </button>
        </div>
      </div>
    </div>
  );
}