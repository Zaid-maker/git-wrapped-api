'use client'

const LoadingSkeleton = () => {
  return (
    <div className="w-full h-full bg-gray-800/30 border border-purple-500/20 rounded-lg backdrop-blur-sm animate-fade-in">
      {/* Header Skeleton */}
      <div className="p-4 border-b border-purple-500/20">
        <div className="h-6 w-48 bg-gray-700/50 rounded animate-pulse"></div>
      </div>

      <div className="p-4 space-y-8">
        {/* Quick Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-900/50 rounded-lg p-4 backdrop-blur-sm">
              <div className="h-4 w-24 bg-gray-700/50 rounded animate-pulse mb-2"></div>
              <div className="h-8 w-16 bg-gray-700/50 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Contribution Graph Skeleton */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 bg-gray-700/50 rounded animate-pulse"></div>
            <div className="h-4 w-48 bg-gray-700/50 rounded animate-pulse"></div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            {/* Month Labels */}
            <div className="flex gap-1 mb-2 pl-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-3 w-8 bg-gray-700/50 rounded animate-pulse"></div>
              ))}
            </div>
            
            {/* Contribution Grid */}
            <div className="flex gap-1">
              {/* Week Labels */}
              <div className="flex flex-col gap-1 pr-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-3 w-6 bg-gray-700/50 rounded animate-pulse"></div>
                ))}
              </div>
              
              {/* Grid */}
              <div className="flex gap-1">
                {[...Array(20)].map((_, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {[...Array(7)].map((_, dayIndex) => (
                      <div
                        key={dayIndex}
                        className="h-3 w-3 bg-gray-700/50 rounded-sm animate-pulse"
                      ></div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Languages Skeleton */}
        <div className="bg-gray-900/50 rounded-lg p-4 backdrop-blur-sm">
          <div className="h-4 w-24 bg-gray-700/50 rounded animate-pulse mb-3"></div>
          <div className="flex flex-wrap gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-6 w-20 bg-gray-700/50 rounded-full animate-pulse"
              ></div>
            ))}
          </div>
        </div>

        {/* Raw Data Skeleton */}
        <div className="overflow-hidden rounded-lg bg-gray-900/50 backdrop-blur-sm">
          <div className="p-4 border-b border-gray-700/50">
            <div className="h-4 w-16 bg-gray-700/50 rounded animate-pulse"></div>
          </div>
          <div className="p-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-4 bg-gray-700/50 rounded animate-pulse mb-2 last:mb-0"
                style={{ width: `${Math.random() * 40 + 60}%` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSkeleton; 