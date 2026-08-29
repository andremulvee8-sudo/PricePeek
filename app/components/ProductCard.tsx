"use client";

import Image from "next/image";
import { useState } from "react";
import { formatCurrency } from "../lib/amazonProduct";
import type { ProductData } from "../lib/productTypes";

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
  const [targetPrice, setTargetPrice] = useState(() =>
    product?.currentPrice != null
      ? (product.currentPrice * 0.9).toFixed(2)
      : ""
  );

  if (!visible || !product) return null;

  const parsedTargetPrice = Number(targetPrice);
  const validTargetPrice =
    Number.isFinite(parsedTargetPrice) && parsedTargetPrice > 0;
  const dealStatusColor =
    product.dealStatus.kind === "historical-low"
      ? "text-green-400"
      : product.dealStatus.kind === "above-low"
        ? "text-amber-300"
        : "text-slate-400";

  return (
    <div className="mt-10 w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
      <div className="flex flex-col gap-6 sm:flex-row">
        <Image
          src={product.image || "https://placehold.co/300x300?text=No+Image"}
          alt={product.title}
          width={112}
          height={112}
          unoptimized
          className="h-28 w-28 rounded-2xl object-cover"
        />

        <div className="flex-1">
          <h2 className="text-2xl font-bold">{product.title}</h2>

          <p className={`mt-2 font-semibold ${dealStatusColor}`}>
            {product.dealStatus.label}
          </p>

          {product.rating != null && (
            <p className="mt-1 text-sm text-slate-400">
              Rating: {product.rating.toFixed(1)} / 5
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-400">Current Price</p>
              <p className="text-2xl font-bold">
                {product.currentPrice != null
                  ? formatCurrency(product.currentPrice, product.currency)
                  : "N/A"}
              </p>
            </div>

            <div>
              <p className="text-slate-400">Lowest Price</p>
              <p className="text-2xl font-bold">
                {product.lowestPrice != null
                  ? formatCurrency(product.lowestPrice, product.currency)
                  : "Not enough history"}
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
              <span className="text-slate-400">{product.currency}</span>
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
