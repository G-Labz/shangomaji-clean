export default function Loading() {
  return (
    <div className="min-h-screen pt-16 animate-pulse">
      {/* Hero skeleton */}
      <div className="w-full h-[70vh] min-h-[500px] skeleton" />

      {/* Row skeletons */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 pt-10 space-y-10">
        {[1, 2, 3].map((r) => (
          <div key={r}>
            <div className="h-5 w-40 skeleton rounded-lg mb-4" />
            <div className="flex gap-3 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 skeleton rounded-xl"
                  style={{
                    width: "clamp(130px, 14vw, 180px)",
                    aspectRatio: "2/3",
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
