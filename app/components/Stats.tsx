export default function Stats() {
  return (
    <div className="mt-12 flex flex-wrap justify-center gap-12">
      <div className="text-center">
        <p className="text-2xl font-bold text-green-400">Daily</p>
        <p className="text-slate-400">Automatic Price Checks</p>
      </div>

      <div className="text-center">
        <p className="text-2xl font-bold text-green-400">Synced</p>
        <p className="text-slate-400">Across Signed-in Devices</p>
      </div>

      <div className="text-center">
        <p className="text-2xl font-bold text-green-400">Private</p>
        <p className="text-slate-400">Account-scoped Tracking</p>
      </div>
    </div>
  );
}
