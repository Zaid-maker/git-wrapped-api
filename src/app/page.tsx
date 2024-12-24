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

interface GitHubStats {
  longestStreak: number;
  totalCommits: number;
  commitRank: string;
  calendarData: ContributionDay[];
  mostActiveDay: {
    name: string;
    commits: number;
  };
  mostActiveMonth: {
    name: string;
    commits: number;
  };
  starsEarned: number;
  topLanguages: string[];
  leaderboards: {
    commits: LeaderboardEntry[];
    streak: LeaderboardEntry[];
    stars: LeaderboardEntry[];
  };
}

export default function Home() {
  const [username, setUsername] = useState("");
  const [basicStats, setBasicStats] = useState<any>(null);
  const [contributions, setContributions] = useState<any>(null);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [networkStats, setNetworkStats] = useState<any>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({
    initial: false,
    contributions: false,
    repositories: false,
    network: false,
  });
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadData = async (type: string, page: number = 1) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    setError("");

    try {
      const response = await fetch(`/api/stats?username=${username}&loadType=${type}&page=${page}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch stats");
      }

      switch (type) {
        case 'initial':
          setBasicStats(data);
          // After loading basic stats, load other data types
          loadData('contributions');
          loadData('repositories');
          loadData('network');
          break;
        case 'contributions':
          setContributions(data.calendarData);
          break;
        case 'repositories':
          if (page === 1) {
            setRepositories(data.repositories);
          } else {
            setRepositories(prev => [...prev, ...data.repositories]);
          }
          setHasMore(data.hasMore);
          setCurrentPage(data.nextPage);
          break;
        case 'network':
          setNetworkStats(data.networkStats);
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
    setBasicStats(null);
    setContributions(null);
    setRepositories([]);
    setNetworkStats(null);
    setCurrentPage(1);
    setHasMore(true);
    await loadData('initial');
  };

  const loadMoreRepositories = () => {
    if (!loading.repositories && hasMore) {
      loadData('repositories', currentPage);
    }
  };

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    if (!repositories.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading.repositories) {
          loadMoreRepositories();
        }
      },
      { threshold: 0.5 }
    );

    const loadMoreTrigger = document.getElementById('load-more-trigger');
    if (loadMoreTrigger) {
      observer.observe(loadMoreTrigger);
    }

    return () => observer.disconnect();
  }, [repositories, hasMore, loading.repositories]);

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
              
              {basicStats && (
                <div className="space-y-6">
                  {/* Basic Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Tooltip content="Total number of commits made in the current year across all repositories" position="below" showArrow={false}>
                      <div className="bg-gray-900/50 rounded-lg p-4 backdrop-blur-sm cursor-help">
                        <div className="text-sm text-gray-400">Total Commits</div>
                        <div className="text-2xl font-bold text-white">{basicStats.totalCommits}</div>
                      </div>
                    </Tooltip>

                    <Tooltip content="Longest consecutive streak of days with at least one contribution" position="below" showArrow={false}>
                      <div className="bg-gray-900/50 rounded-lg p-4 backdrop-blur-sm cursor-help">
                        <div className="text-sm text-gray-400">Longest Streak</div>
                        <div className="text-2xl font-bold text-white">{basicStats.longestStreak} days</div>
                      </div>
                    </Tooltip>

                    <Tooltip content="Total number of stars received across all public repositories" position="below" showArrow={false}>
                      <div className="bg-gray-900/50 rounded-lg p-4 backdrop-blur-sm cursor-help">
                        <div className="text-sm text-gray-400">Stars Earned</div>
                        <div className="text-2xl font-bold text-white">{basicStats.starsEarned}</div>
                      </div>
                    </Tooltip>

                    <Tooltip content="Your contribution rank compared to all GitHub users based on total commits" position="below" showArrow={false}>
                      <div className="bg-gray-900/50 rounded-lg p-4 backdrop-blur-sm cursor-help">
                        <div className="text-sm text-gray-400">Commit Rank</div>
                        <div className="text-2xl font-bold text-white">{basicStats.commitRank}</div>
                      </div>
                    </Tooltip>
                  </div>

                  {/* Contribution Graph */}
                  {contributions && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Tooltip content="Your daily contribution activity over time, including commits, pull requests, and issues" position="below" showArrow={false}>
                          <h3 className="text-sm font-medium text-gray-300 cursor-help">
                            Contribution Activity
                          </h3>
                        </Tooltip>
                        <Tooltip content="The day of the week when you're most productive, based on average contributions" position="below" showArrow={false}>
                          <div className="text-xs text-gray-400 cursor-help">
                            Most active: {basicStats.mostActiveDay.name} ({basicStats.mostActiveDay.commits} commits/day)
                          </div>
                        </Tooltip>
                      </div>
                      <ContributionGraph data={contributions} />
                    </div>
                  )}

                  {/* Repository List */}
                  {repositories.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Repositories</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {repositories.map((repo, index) => (
                          <div
                            key={repo.name + index}
                            className="bg-gray-800/50 rounded-lg p-4"
                          >
                            <h4 className="font-medium">{repo.name}</h4>
                            <div className="text-sm text-gray-400">
                              ⭐ {repo.stars} stars
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {repo.languages.map((lang: string) => (
                                <span
                                  key={lang}
                                  className="px-2 py-1 text-xs rounded-full bg-purple-500/10 text-purple-200"
                                >
                                  {lang}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Infinite Scroll Trigger */}
                      <div
                        id="load-more-trigger"
                        className="h-10 flex items-center justify-center"
                      >
                        {loading.repositories && (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Network Stats */}
                  {networkStats && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Tooltip content="Your network stats" position="below" showArrow={false}>
                          <h3 className="text-sm font-medium text-gray-300 cursor-help">
                            Network Stats
                          </h3>
                        </Tooltip>
                        <Tooltip content="Your network rank compared to all GitHub users based on total commits" position="below" showArrow={false}>
                          <div className="text-xs text-gray-400 cursor-help">
                            Network Rank: {networkStats.rank}
                          </div>
                        </Tooltip>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatBadge
                          label="Total Commits"
                          value={networkStats.totalCommits}
                          color="purple"
                        />
                        <StatBadge
                          label="Commit Streak"
                          value={`${networkStats.longestStreak} days`}
                          color="green"
                        />
                        <StatBadge
                          label="GitHub Stars"
                          value={networkStats.starsEarned}
                          color="orange"
                        />
                        <StatBadge
                          label="Commit Rank"
                          value={networkStats.commitRank}
                          color="blue"
                        />
                      </div>
                    </div>
                  )}
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