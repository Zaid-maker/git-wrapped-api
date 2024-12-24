'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface Repository {
  name: string;
  stars: number;
  languages: string[];
  isPrivate: boolean;
  description: string;
  url: string;
  updatedAt: string;
}

interface ApiResponse {
  repositories?: Repository[];
  hasMore?: boolean;
  nextPage?: number;
  error?: string;
}

export default function RepositoriesPage() {
  const [username, setUsername] = useState('');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [allLanguages, setAllLanguages] = useState<Set<string>>(new Set());

  // Handle URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const usernameParam = searchParams.get('username');
    if (usernameParam) {
      setUsername(usernameParam);
      loadRepositories(usernameParam);
    }
  }, []);

  const loadRepositories = async (searchUsername: string, page: number = 1) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/stats?username=${searchUsername}&loadType=repositories&page=${page}`);
      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch repositories');
      }

      const newRepos = data.repositories || [];
      
      // Update all languages set
      newRepos.forEach(repo => {
        repo.languages.forEach(lang => {
          setAllLanguages(prev => new Set(Array.from(prev).concat(lang)));
        });
      });

      if (page === 1) {
        setRepositories(newRepos);
      } else {
        setRepositories(prev => [...prev, ...newRepos]);
      }
      
      setHasMore(!!data.hasMore);
      setCurrentPage(data.nextPage || page + 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepositories([]);
    setCurrentPage(1);
    setHasMore(true);
    setAllLanguages(new Set());
    await loadRepositories(username);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadRepositories(username, currentPage);
    }
  };

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    if (!repositories.length) return;

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
  }, [repositories, hasMore, loading]);

  // Filter repositories by language
  const filteredRepositories = languageFilter
    ? repositories.filter(repo => repo.languages.includes(languageFilter))
    : repositories;

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
              <h1 className="text-2xl font-bold">Repositories</h1>
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
                  'View Repositories'
                )}
              </button>
            </form>
          </div>

          {/* Language Filter */}
          {repositories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setLanguageFilter('')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  !languageFilter
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
              >
                All
              </button>
              {Array.from(allLanguages).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguageFilter(lang)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    languageFilter === lang
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* Repository Grid */}
          {filteredRepositories.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRepositories.map((repo, index) => (
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={repo.name + index}
                  className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                      {repo.name}
                      {repo.isPrivate && (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
                          Private
                        </span>
                      )}
                    </h4>
                    <div className="text-sm text-gray-400">
                      ⭐ {repo.stars}
                    </div>
                  </div>
                  {repo.description && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                      {repo.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {repo.languages.map((lang) => (
                      <span
                        key={lang}
                        className="px-2 py-1 text-xs rounded-full bg-purple-500/10 text-purple-200"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Updated {new Date(repo.updatedAt).toLocaleDateString()}
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Loading More Trigger */}
          {repositories.length > 0 && (
            <div
              id="load-more-trigger"
              className="h-10 flex items-center justify-center"
            >
              {loading && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
              )}
            </div>
          )}

          {/* Empty State */}
          {!loading && !repositories.length && !error && (
            <div className="bg-gray-900/50 rounded-lg p-12 backdrop-blur-sm border border-gray-700/50 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-medium text-gray-200">No Repositories Found</h2>
                <p className="text-gray-400">
                  Enter a GitHub username to view their repositories and filter by programming language.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 