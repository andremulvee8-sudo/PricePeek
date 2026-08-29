"use client";

import { useState } from "react";
import type { ProductData } from "../lib/productTypes";

type TrackingChanges = {
  targetPrice?: number;
  isActive?: boolean;
  rearmAlert?: true;
};

type TrackedProductControlsProps = {
  product: ProductData;
  onUpdate: (
    product: ProductData,
    changes: TrackingChanges,
    successMessage: string
  ) => Promise<boolean>;
};

export default function TrackedProductControls({
  product,
  onUpdate,
}: TrackedProductControlsProps) {
  const [targetPrice, setTargetPrice] = useState(
    product.targetPrice?.toFixed(2) ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const parsedTargetPrice = Number(targetPrice);
  const validTargetPrice =
    Number.isFinite(parsedTargetPrice) && parsedTargetPrice > 0;

  async function runUpdate(
    changes: TrackingChanges,
    successMessage: string
  ) {
    setIsSaving(true);

    try {
      return await onUpdate(product, changes, successMessage);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
      <label className="block text-sm text-slate-400">
        Target price ({product.currency})
        <div className="mt-1 flex gap-2">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={targetPrice}
            onChange={(event) => setTargetPrice(event.target.value)}
            disabled={isSaving}
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-green-400"
          />
          <button
            type="button"
            disabled={!validTargetPrice || isSaving}
            onClick={() =>
              void runUpdate(
                { targetPrice: parsedTargetPrice },
                "Target price updated and alert re-armed."
              )
            }
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-green-400 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={() =>
            void runUpdate(
              { isActive: !product.isActive },
              product.isActive ? "Tracking paused." : "Tracking resumed."
            )
          }
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-green-400 hover:text-white disabled:opacity-50"
        >
          {product.isActive ? "Pause tracking" : "Resume tracking"}
        </button>

        <button
          type="button"
          disabled={isSaving || !product.notificationSent}
          onClick={() =>
            void runUpdate(
              { rearmAlert: true },
              "Price alert re-armed."
            )
          }
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-green-400 hover:text-white disabled:opacity-50"
        >
          {product.notificationSent ? "Re-arm alert" : "Alert is armed"}
        </button>
      </div>
    </div>
  );
}
