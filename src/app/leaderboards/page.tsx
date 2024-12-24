'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Leaderboard from '../components/Leaderboard';
import Tooltip from '../components/Tooltip';

interface LeaderboardData {
  commits: LeaderboardEntry[];
  streak: LeaderboardEntry[];
  stars: LeaderboardEntry[];
}

interface LeaderboardEntry {
  username: string;
  value: number;
  rank: number;
  avatarUrl: string;
}

interface NetworkUser {
  username: string;
  avatarUrl: string;
  totalCommits: number;
  longestStreak: number;
  starsEarned: number;
  rank: number;
  followers: number;
  following: number;
  commitRank: string;
  connectionType: number;
}

interface NetworkStats {
  totalUsers: number;
  averageCommits: number;
  averageStreak: number;
  averageStars: number;
  topLanguages: string[];
  currentUser: NetworkUser;
}

export default function LeaderboardsPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [networkUsers, setNetworkUsers] = useState<NetworkUser[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const USERS_PER_PAGE = 10;

  // Handle URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const usernameParam = searchParams.get('username');
    if (usernameParam) {
      setUsername(usernameParam);
      handleSearch(usernameParam);
    }
  }, []);

  const loadNetworkUsers = async (searchUsername: string, page: number = 1) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/stats?username=${searchUsername}&loadType=network&page=${page}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      if (data.networkUsers && Array.isArray(data.networkUsers)) {
        if (page === 1) {
          setNetworkUsers(data.networkUsers);
        } else {
          setNetworkUsers(prev => [...prev, ...data.networkUsers]);
        }
        setHasMore(data.hasMore);
        
        // Set network stats on first load
        if (page === 1 && data.networkStats) {
          setNetworkStats({
            totalUsers: data.totalUsers || data.networkUsers.length,
            averageCommits: data.averageCommits || 0,
            averageStreak: data.averageStreak || 0,
            averageStars: data.averageStars || 0,
            topLanguages: data.topLanguages || [],
            currentUser: data.networkStats
          });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchUsername: string) => {
    setCurrentPage(1);
    setNetworkUsers([]);
    setNetworkStats(null);
    setHasMore(true);
    await loadNetworkUsers(searchUsername, 1);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadNetworkUsers(username, currentPage + 1);
      setCurrentPage(prev => prev + 1);
    }
  };

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    if (!networkUsers.length || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    const loadMoreTrigger = document.getElementById('load-more-trigger');
    if (loadMoreTrigger) {
      observer.observe(loadMoreTrigger);
    }

    return () => observer.disconnect();
  }, [networkUsers, hasMore, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(username);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-700/50 backdrop-blur-sm bg-gray-900/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="https://ph-files.imgix.net/8f799c72-b5f2-48c5-a134-143281cc0502.vnd.microsoft.icon"
                alt="Git Wrapped Logo"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <h1 className="text-2xl font-bold">Git Wrapped Leaderboards</h1>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Search Form */}
          <div className="bg-gray-900/50 rounded-lg p-6 backdrop-blur-sm border border-gray-700/50">
            <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="username" className="text-sm font-medium text-gray-300">
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
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
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
                  'View Network Rankings'
                )}
              </button>
            </form>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* Leaderboards */}
          {networkUsers.length > 0 && (
            <div className="space-y-6">
              {/* Network Overview */}
              <div className="bg-gray-900/50 rounded-lg p-6 backdrop-blur-sm border border-gray-700/50">
                <div className="flex items-center justify-between mb-6">
                  <Tooltip content="Your GitHub network overview" position="below" showArrow={false}>
                    <h2 className="text-xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200 cursor-help">
                      Network Overview for @{username}
                    </h2>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Network Size</div>
                    <div className="text-2xl font-bold text-white">
                      {networkUsers[0].followers + networkUsers[0].following}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {networkUsers[0].followers} followers • {networkUsers[0].following} following
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Commit Rank</div>
                    <div className="text-2xl font-bold text-white">
                      {networkUsers[0].commitRank}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Based on total contributions
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Network Position</div>
                    <div className="text-2xl font-bold text-white">
                      #{networkUsers[0].rank}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Among your network
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Total Impact</div>
                    <div className="text-2xl font-bold text-white">
                      {networkUsers[0].totalCommits + networkUsers[0].starsEarned}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Commits + Stars earned
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Rankings */}
              <div className="bg-gray-900/50 rounded-lg p-6 backdrop-blur-sm border border-gray-700/50">
                <div className="flex items-center justify-between mb-6">
                  <Tooltip content="Compare stats with your followers and following" position="below" showArrow={false}>
                    <h2 className="text-xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200 cursor-help">
                      Detailed Rankings
                    </h2>
                  </Tooltip>
                  {networkStats && (
                    <div className="text-sm text-gray-400">
                      Showing {networkUsers.length} of {networkStats.totalUsers} users
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Leaderboard
                    title="Total Commits"
                    entries={networkUsers.map(user => ({
                      username: user.username,
                      value: user.totalCommits,
                      rank: user.rank,
                      avatarUrl: user.avatarUrl,
                      connectionType: user.connectionType
                    }))}
                    metric="commits"
                  />
                  <Leaderboard
                    title="Longest Streak"
                    entries={networkUsers.map(user => ({
                      username: user.username,
                      value: user.longestStreak,
                      rank: user.rank,
                      avatarUrl: user.avatarUrl,
                      connectionType: user.connectionType
                    }))}
                    metric="days"
                  />
                  <Leaderboard
                    title="GitHub Stars"
                    entries={networkUsers.map(user => ({
                      username: user.username,
                      value: user.starsEarned,
                      rank: user.rank,
                      avatarUrl: user.avatarUrl,
                      connectionType: user.connectionType
                    }))}
                    metric="stars"
                  />
                </div>
                {/* Load More Trigger */}
                {hasMore && (
                  <div
                    id="load-more-trigger"
                    className="h-10 flex items-center justify-center mt-6"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
                    ) : (
                      <button
                        onClick={loadMore}
                        className="px-4 py-2 bg-gray-800/50 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors"
                      >
                        Load More
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Network Averages */}
              {networkStats && (
                <div className="bg-gray-900/50 rounded-lg p-6 backdrop-blur-sm border border-gray-700/50">
                  <div className="flex items-center justify-between mb-6">
                    <Tooltip content="Average statistics across your network" position="below" showArrow={false}>
                      <h2 className="text-xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200 cursor-help">
                        Network Averages
                      </h2>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Average Commits</div>
                      <div className="text-2xl font-bold text-white">
                        {Math.round(networkStats.averageCommits)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        You: {networkStats.currentUser.totalCommits > networkStats.averageCommits ? '+' : ''}
                        {Math.round(networkStats.currentUser.totalCommits - networkStats.averageCommits)}
                      </div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Average Streak</div>
                      <div className="text-2xl font-bold text-white">
                        {Math.round(networkStats.averageStreak)} days
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        You: {networkStats.currentUser.longestStreak > networkStats.averageStreak ? '+' : ''}
                        {Math.round(networkStats.currentUser.longestStreak - networkStats.averageStreak)} days
                      </div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Average Stars</div>
                      <div className="text-2xl font-bold text-white">
                        {Math.round(networkStats.averageStars)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        You: {networkStats.currentUser.starsEarned > networkStats.averageStars ? '+' : ''}
                        {Math.round(networkStats.currentUser.starsEarned - networkStats.averageStars)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!loading && !networkUsers.length && !error && (
            <div className="bg-gray-900/50 rounded-lg p-12 backdrop-blur-sm border border-gray-700/50 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-medium text-gray-200">No Rankings Found</h2>
                <p className="text-gray-400">
                  Enter a GitHub username to view network rankings and compare stats with followers and following.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 