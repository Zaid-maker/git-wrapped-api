'use client'

interface LeaderboardEntry {
  username: string;
  value: number;
  rank: number;
  avatarUrl: string;
}

interface LeaderboardProps {
  title: string;
  entries: LeaderboardEntry[];
  metric: string;
  loading?: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ 
  title, 
  entries, 
  metric,
  loading = false 
}) => {
  const getRankBadge = (rank: number) => {
    const badges = {
      1: '🥇',
      2: '🥈',
      3: '🥉',
    };
    return badges[rank as keyof typeof badges] || `#${rank}`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-32 bg-gray-700/50 rounded animate-pulse"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gray-700/50 animate-pulse"></div>
            <div className="flex-1 h-8 bg-gray-700/50 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      {entries.map((entry) => (
        <div
          key={entry.username}
          className="flex items-center gap-3 bg-gray-900/30 rounded-lg p-2 backdrop-blur-sm border border-gray-700/30 hover:border-gray-700/50 transition-colors group"
        >
          <div className="w-8 h-8 flex items-center justify-center text-lg">
            {getRankBadge(entry.rank)}
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img
              src={entry.avatarUrl}
              alt={`${entry.username}'s avatar`}
              className="w-8 h-8 rounded-full border border-gray-700/50"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-gray-200 truncate">
                  {entry.username}
                </div>
                <div className="text-sm text-gray-400 whitespace-nowrap">
                  {entry.value} {metric}
                </div>
              </div>
              <div className="w-full bg-gray-800/50 rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all group-hover:from-purple-400 group-hover:to-pink-400"
                  style={{
                    width: `${Math.min(100, (entry.value / entries[0].value) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Leaderboard; 