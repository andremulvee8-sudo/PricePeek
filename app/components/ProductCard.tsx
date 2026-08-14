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
  onStartTracking: () => void;
  isTracked: boolean;
};

export default function ProductCard({
  visible,
  product,
  onStartTracking,
  isTracked,
}: ProductCardProps) {
  if (!visible || !product) return null;

  return (
    <div className="mt-10 w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
      <div className="flex items-center gap-6">
        <img
          src={product.image || "https://placehold.co/300x300?text=No+Image"}
          alt={product.title}
          className="h-28 w-28 rounded-2xl object-cover"
        />

        <div className="flex-1">
          <h2 className="text-2xl font-bold">{product.title}</h2>

          <p className="mt-2 text-green-400 font-semibold">
            ⭐ {product.rating != null ? product.rating.toFixed(1) : "N/A"} • Great time to buy
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

          <button
            onClick={onStartTracking}
            className="mt-8 rounded-xl bg-green-500 px-6 py-3 font-bold transition hover:bg-green-400"
          >
            {isTracked ? "Tracking ✓" : "Start Tracking"}
          </button>
        </div>
      </div>
    </div>
  );
}