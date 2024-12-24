'use client'

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface LeaderboardEntry {
  username: string;
  value: number;
  rank: number;
  avatarUrl: string;
  connectionType?: number;
}

interface LeaderboardProps {
  title: string;
  entries: LeaderboardEntry[];
  metric: string;
}

const getConnectionLabel = (connectionType: number) => {
  switch (connectionType) {
    case 3:
      return 'Mutual';
    case 2:
      return 'Follower';
    case 1:
      return 'Following';
    default:
      return '';
  }
};

const getConnectionColor = (connectionType: number) => {
  switch (connectionType) {
    case 3:
      return 'bg-purple-500/20 text-purple-300';
    case 2:
      return 'bg-blue-500/20 text-blue-300';
    case 1:
      return 'bg-green-500/20 text-green-300';
    default:
      return '';
  }
};

export default function Leaderboard({ title, entries, metric }: LeaderboardProps) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.username}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex items-center gap-3 p-2 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors"
          >
            <div className="w-8 h-8 relative">
              <Image
                src={entry.avatarUrl}
                alt={entry.username}
                width={32}
                height={32}
                className="rounded-full"
              />
              {entry.rank <= 3 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold">
                  {entry.rank === 1 && '🥇'}
                  {entry.rank === 2 && '🥈'}
                  {entry.rank === 3 && '🥉'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`https://github.com/${entry.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:text-purple-300 transition-colors truncate block"
              >
                @{entry.username}
              </Link>
              {entry.connectionType !== undefined && entry.connectionType > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${getConnectionColor(entry.connectionType)}`}>
                  {getConnectionLabel(entry.connectionType)}
                </span>
              )}
            </div>
            <div className="text-sm font-medium">
              {entry.value.toLocaleString()} {metric}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 