export default function Stats() {
  return (
    <div className="mt-12 flex flex-wrap justify-center gap-12">
      <div className="text-center">
        <p className="text-4xl font-bold text-green-400">25K+</p>
        <p className="text-slate-400">Products Tracked</p>
      </div>

      <div className="text-center">
        <p className="text-4xl font-bold text-green-400">8.5K+</p>
        <p className="text-slate-400">Active Users</p>
      </div>

      <div className="text-center">
        <p className="text-4xl font-bold text-green-400">$250K+</p>
        <p className="text-slate-400">Potential Savings</p>
      </div>
    </div>
  );
}