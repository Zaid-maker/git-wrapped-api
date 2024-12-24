'use client'

import Image from "next/image";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import ContributionGraph from "./components/ContributionGraph";
import LoadingSkeleton from "./components/LoadingSkeleton";
import Tooltip from "./components/Tooltip";
import StatBadge from "./components/StatBadge";
import Leaderboard from "./components/Leaderboard";
import Link from 'next/link';

const ReactJson = dynamic(() => import("react-json-view"), { ssr: false });

interface ContributionDay {
  contributionCount: number;
  date: string;
  weekday: number;
}

interface LeaderboardEntry {
  username: string;
  value: number;
  rank: number;
  avatarUrl: string;
}

interface NetworkStats {
  username: string;
  avatarUrl: string;
  followers: number;
  following: number;
  rank?: number;
  totalCommits?: number;
  longestStreak?: number;
  starsEarned?: number;
  commitRank?: string;
}

interface Stats {
  username: string;
  avatarUrl: string;
  name: string;
  followers: number;
  following: number;
  totalCommits: number;
  longestStreak: number;
  starsEarned: number;
  commitRank: string;
  mostActiveDay: {
    name: string;
    commits: number;
  };
  mostActiveMonth: {
    name: string;
    commits: number;
  };
  calendarData?: ContributionDay[];
  networkStats?: NetworkStats;
}

interface ApiResponse {
  stats?: Partial<Stats>;
  calendarData?: ContributionDay[];
  networkStats?: NetworkStats;
  hasMore?: boolean;
  nextPage?: number;
  error?: string;
}

export default function Home() {
  const [username, setUsername] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({
    initial: false,
    contributions: false,
    network: false,
  });
  const [error, setError] = useState("");

  const loadData = async (type: string) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    setError("");

    try {
      const response = await fetch(`/api/stats?username=${username}&loadType=${type}`);
      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch stats");
      }

      switch (type) {
        case 'initial':
          if ('username' in data) {
            setStats(data as Stats);
            // After loading basic stats, load other data types
            loadData('contributions');
            loadData('network');
          }
          break;
        case 'contributions':
          setStats((prev: Stats | null) => prev && ({
            ...prev,
            ...data.stats,
            calendarData: data.calendarData,
          }));
          break;
        case 'network':
          if (data.networkStats) {
            setStats((prev: Stats | null) => prev && ({
              ...prev,
              networkStats: data.networkStats,
            }));
          }
          break;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStats(null);
    await loadData('initial');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100">
      <style jsx global>{`
        /* Modern scrollbar styling */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.1);
          border-radius: 8px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(
            to bottom,
            rgba(214, 188, 250, 0.5),
            rgba(245, 208, 254, 0.5)
          );
          border-radius: 8px;
          border: 2px solid rgba(15, 23, 42, 0.1);
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            to bottom,
            rgba(214, 188, 250, 0.8),
            rgba(245, 208, 254, 0.8)
          );
        }

        /* Firefox */
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(214, 188, 250, 0.5) rgba(15, 23, 42, 0.1);
        }
      `}</style>

      {/* Subtle Pattern Overlay */}
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>

      {/* Header */}
      <header className="border-b border-gray-700/50 backdrop-blur-sm bg-gray-900/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Image
            src="https://ph-files.imgix.net/8f799c72-b5f2-48c5-a134-143281cc0502.vnd.microsoft.icon"
            alt="Git Wrapped Logo"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <h1 className="text-2xl font-bold">Git Wrapped API</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8">
            {/* Left Column - Input Form */}
            <div className="md:col-span-2 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="username"
                    className="text-sm font-medium text-gray-300"
                  >
                    GitHub Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder-gray-500 backdrop-blur-sm"
                      placeholder="Enter GitHub username"
                      required
                    />
                    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-lg blur opacity-20"></div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading.initial}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading.initial ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    "Get Stats"
                  )}
                </button>
              </form>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg backdrop-blur-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Right Column - Results */}
            <div className="md:col-span-3 relative min-h-[400px]">
              {Object.values(loading).some(Boolean) && <LoadingSkeleton />}
              
              {stats && (
                <div className="space-y-6">
                  {/* Basic Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Tooltip content="Total number of commits made in the current year across all repositories" position="below" showArrow={false}>
                      <div className="bg-gray-900/50 rounded-lg p-4 backdrop-blur-sm cursor-help">
                        <div className="text-sm text-gray-400">Total Commits</div>
                        <div className="text-2xl font-bold text-white">{stats.totalCommits}</div>
                      </div>
                    </Tooltip>

                    <Tooltip content="Longest consecutive streak of days with at least one contribution" position="below" showArrow={false}>
                      <div className="bg-gray-900/50 rounded-lg p-4 backdrop-blur-sm cursor-help">
                        <div className="text-sm text-gray-400">Longest Streak</div>
                        <div className="text-2xl font-bold text-white">{stats.longestStreak} days</div>
                      </div>
                    </Tooltip>

                    <Tooltip content="Total number of stars received across all public repositories" position="below" showArrow={false}>
                      <div className="bg-gray-900/50 rounded-lg p-4 backdrop-blur-sm cursor-help">
                        <div className="text-sm text-gray-400">Stars Earned</div>
                        <div className="text-2xl font-bold text-white">{stats.starsEarned}</div>
                      </div>
                    </Tooltip>

                    <Tooltip content="Your contribution rank compared to all GitHub users based on total commits" position="below" showArrow={false}>
                      <div className="bg-gray-900/50 rounded-lg p-4 backdrop-blur-sm cursor-help">
                        <div className="text-sm text-gray-400">Commit Rank</div>
                        <div className="text-2xl font-bold text-white">{stats.commitRank}</div>
                      </div>
                    </Tooltip>
                  </div>

                  {/* Contribution Graph */}
                  {stats.calendarData && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Tooltip content="Your daily contribution activity over time, including commits, pull requests, and issues" position="below" showArrow={false}>
                          <h3 className="text-sm font-medium text-gray-300 cursor-help">
                            Contribution Activity
                          </h3>
                        </Tooltip>
                        <Tooltip content="The day of the week when you're most productive, based on average contributions" position="below" showArrow={false}>
                          <div className="text-xs text-gray-400 cursor-help">
                            Most active: {stats.mostActiveDay.name} ({stats.mostActiveDay.commits} commits/day)
                          </div>
                        </Tooltip>
                      </div>
                      <ContributionGraph data={stats.calendarData} />
                    </div>
                  )}

                  {/* Repositories Link */}
                  <Link
                    href={`/repositories?username=${username}`}
                    className="block bg-gray-900/50 rounded-lg p-4 backdrop-blur-sm border border-gray-700/50 hover:border-purple-500/20 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-300 group-hover:text-white">View All Repositories</h3>
                          <p className="text-xs text-gray-400">Browse and filter repositories by language</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>

                  {/* Network Stats */}
                  {stats.networkStats && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Tooltip content="Your network stats" position="below" showArrow={false}>
                          <h3 className="text-sm font-medium text-gray-300 cursor-help">
                            Network Stats
                          </h3>
                        </Tooltip>
                        <Tooltip content="Your network rank compared to all GitHub users based on total commits" position="below" showArrow={false}>
                          <div className="text-xs text-gray-400 cursor-help">
                            Network Rank: {stats.networkStats.rank || 'N/A'}
                          </div>
                        </Tooltip>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatBadge
                          label="Total Commits"
                          value={stats.networkStats.totalCommits || 0}
                          color="purple"
                        />
                        <StatBadge
                          label="Commit Streak"
                          value={`${stats.networkStats.longestStreak || 0} days`}
                          color="green"
                        />
                        <StatBadge
                          label="GitHub Stars"
                          value={stats.networkStats.starsEarned || 0}
                          color="orange"
                        />
                        <StatBadge
                          label="Commit Rank"
                          value={stats.networkStats.commitRank || 'N/A'}
                          color="blue"
                        />
                      </div>
                    </div>
                  )}

                  {/* Network Rankings Link */}
                  <Link
                    href={`/leaderboards?username=${username}`}
                    className="block bg-gray-900/50 rounded-lg p-4 backdrop-blur-sm border border-gray-700/50 hover:border-purple-500/20 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-300 group-hover:text-white">View Network Rankings</h3>
                          <p className="text-xs text-gray-400">Compare stats with followers and following</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>

                  {/* Stats JSON View */}
                  <div className="overflow-hidden rounded-lg bg-gray-900/50 backdrop-blur-sm">
                    <Tooltip content="Complete data response from the API in JSON format" position="below" showArrow={false}>
                      <div className="p-4 border-b border-gray-700/50 cursor-help">
                        <h3 className="text-sm font-medium text-gray-300">Raw Data</h3>
                      </div>
                    </Tooltip>
                    <div className="p-4">
                      <ReactJson
                        src={stats}
                        theme="tomorrow"
                        style={{
                          backgroundColor: "transparent",
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                          fontSize: "0.875rem",
                        }}
                        enableClipboard={false}
                        displayDataTypes={false}
                        displayObjectSize={false}
                        collapsed={1}
                        name={false}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 