import { Octokit } from "@octokit/rest";
import type { components } from "@octokit/openapi-types";

interface UserStats {
  username: string;
  avatarUrl: string;
  totalCommits: number;
  longestStreak: number;
  starsEarned: number;
  followers: number;
  following: number;
}

interface ContributionData {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number;
        weeks: {
          contributionDays: Array<{
            contributionCount: number;
            date: string;
          }>;
        }[];
      };
    };
  };
}

type Repository = components["schemas"]["minimal-repository"];

const USERS_PER_PAGE = 10;

// Helper function to fetch user stats
async function fetchUserStats(octokit: Octokit, username: string): Promise<UserStats | null> {
  try {
    const [userData, contributionsData] = await Promise.all([
      octokit.rest.users.getByUsername({ username }),
      octokit.graphql<ContributionData>(`
        query($username: String!) {
          user(login: $username) {
            contributionsCollection {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    contributionCount
                    date
                  }
                }
              }
            }
          }
        }
      `, { username })
    ]);

    // Calculate streak
    const days = contributionsData.user.contributionsCollection.contributionCalendar.weeks
      .flatMap(week => week.contributionDays);
    
    let currentStreak = 0;
    let longestStreak = 0;
    for (const day of days) {
      if (day.contributionCount > 0) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // Get user's repositories to calculate stars
    const { data: repos } = await octokit.rest.repos.listForUser({
      username,
      per_page: 100,
      type: 'owner',
    });

    const starsEarned = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);

    return {
      username: userData.data.login,
      avatarUrl: userData.data.avatar_url,
      totalCommits: contributionsData.user.contributionsCollection.contributionCalendar.totalContributions,
      longestStreak,
      starsEarned,
      followers: userData.data.followers,
      following: userData.data.following,
    };
  } catch (error) {
    console.error(`Error fetching stats for ${username}:`, error);
    return null;
  }
}

// Helper function to calculate user rank
function calculateUserRank(userStats: UserStats | null, allUsers: UserStats[]): number {
  const userTotalContributions = userStats?.totalCommits || 0;
  return allUsers.findIndex(user => (user.totalCommits || 0) <= userTotalContributions) + 1;
}

// Helper function to calculate commit rank
function calculateCommitRank(totalCommits: number): string {
  if (totalCommits >= 10000) return 'Diamond';
  if (totalCommits >= 5000) return 'Platinum';
  if (totalCommits >= 1000) return 'Gold';
  if (totalCommits >= 500) return 'Silver';
  return 'Bronze';
}

// Helper function to calculate connection priority
function calculateConnectionPriority(username: string, followers: string[], following: string[]): number {
  if (followers.includes(username) && following.includes(username)) return 3; // Mutual connection
  if (followers.includes(username)) return 2; // Follower
  if (following.includes(username)) return 1; // Following
  return 0; // No direct connection
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const loadType = searchParams.get('loadType') || 'initial';
    const page = parseInt(searchParams.get('page') || '1');

    if (!username) {
      return new Response(JSON.stringify({ error: 'Username is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Initial data load (basic user info and summary stats)
    if (loadType === 'initial') {
      const [user, repos] = await Promise.all([
        octokit.rest.users.getByUsername({ username }),
        octokit.rest.repos.listForUser({
          username,
          per_page: 100,
          type: 'owner',
        })
      ]);

      // Calculate total stars
      const totalStars = repos.data.reduce((acc, repo) => acc + (repo.stargazers_count ?? 0), 0);

      // Get contribution data
      const contributionData = await octokit.graphql<ContributionData>(`
        query($username: String!) {
          user(login: $username) {
            contributionsCollection {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    contributionCount
                    date
                  }
                }
              }
            }
          }
        }
      `, { username });

      // Calculate streak
      const days = contributionData.user.contributionsCollection.contributionCalendar.weeks
        .flatMap(week => week.contributionDays);
      
      let currentStreak = 0;
      let longestStreak = 0;
      for (const day of days) {
        if (day.contributionCount > 0) {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }

      const stats = {
        username: user.data.login,
        avatarUrl: user.data.avatar_url,
        name: user.data.name || user.data.login,
        followers: user.data.followers,
        following: user.data.following,
        totalCommits: contributionData.user.contributionsCollection.contributionCalendar.totalContributions,
        longestStreak,
        starsEarned: totalStars,
        commitRank: calculateCommitRank(contributionData.user.contributionsCollection.contributionCalendar.totalContributions),
      };

      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Contribution data load
    if (loadType === 'contributions') {
      const contributionData = await octokit.graphql<ContributionData>(`
        query($username: String!) {
          user(login: $username) {
            contributionsCollection {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    contributionCount
                    date
                  }
                }
              }
            }
          }
        }
      `, { username });

      const calendar = contributionData.user.contributionsCollection.contributionCalendar;
      const contributionDays = calendar.weeks.flatMap(week => week.contributionDays);

      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let currentStreakStart = null;
      let longestStreakStart = null;
      let longestStreakEnd = null;

      // Process days in reverse to get current streak
      const reversedDays = [...contributionDays].reverse();
      for (const day of reversedDays) {
        if (day.contributionCount > 0) {
          if (currentStreak === 0) {
            currentStreakStart = day.date;
          }
          currentStreak++;
        } else {
          break;
        }
      }

      // Process days normally to get longest streak
      for (const day of contributionDays) {
        if (day.contributionCount > 0) {
          if (longestStreak === 0) {
            longestStreakStart = day.date;
          }
          longestStreak = Math.max(longestStreak, currentStreak);
          if (longestStreak === currentStreak) {
            longestStreakEnd = day.date;
          }
          currentStreak++;
        } else {
          currentStreak = 0;
        }
      }

      // Calculate daily and monthly patterns
      const dailyCommits: Record<string, number> = {};
      const monthlyCommits: Record<string, number> = {};

      contributionDays.forEach(day => {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const monthName = date.toLocaleDateString('en-US', { month: 'long' });
        
        dailyCommits[dayName] = (dailyCommits[dayName] || 0) + day.contributionCount;
        monthlyCommits[monthName] = (monthlyCommits[monthName] || 0) + day.contributionCount;
      });

      // Find most active day and month
      const mostActiveDay = Object.entries(dailyCommits)
        .sort(([, a], [, b]) => b - a)[0];
      const mostActiveMonth = Object.entries(monthlyCommits)
        .sort(([, a], [, b]) => b - a)[0];

      return new Response(
        JSON.stringify({
          calendarData: contributionDays,
          stats: {
            totalCommits: calendar.totalContributions,
            currentStreak,
            longestStreak,
            streakInfo: {
              currentStreakStart,
              longestStreakStart,
              longestStreakEnd,
            },
            mostActiveDay: {
              name: mostActiveDay[0],
              commits: Math.round(mostActiveDay[1] / (contributionDays.length / 7))
            },
            mostActiveMonth: {
              name: mostActiveMonth[0],
              commits: mostActiveMonth[1]
            }
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Network rankings load
    if (loadType === 'network') {
      // Fetch all followers and following
      const [followers, following] = await Promise.all([
        octokit.paginate(octokit.rest.users.listFollowersForUser, {
          username,
          per_page: 100,
        }),
        octokit.paginate(octokit.rest.users.listFollowingForUser, {
          username,
          per_page: 100,
        }),
      ]);

      const followerLogins = followers.map(user => user.login);
      const followingLogins = following.map(user => user.login);

      // Combine and deduplicate network users
      const networkUsers = Array.from(new Set([username, ...followerLogins, ...followingLogins]));
      
      // Get current user's data
      const userData = await octokit.rest.users.getByUsername({ username });
      const currentUser = userData.data;

      // Get current user's stats
      const currentUserStats = await fetchUserStats(octokit, username);

      // Calculate start and end indices for pagination
      const startIdx = (page - 1) * USERS_PER_PAGE;
      const endIdx = startIdx + USERS_PER_PAGE;
      const pageUsers = networkUsers.slice(startIdx, endIdx);

      // Fetch stats for page users
      const userStatsPromises = pageUsers.map(user => fetchUserStats(octokit, user));
      const userStats = await Promise.all(userStatsPromises);

      // Sort users by priority and total contributions
      const sortedUsers = userStats
        .filter((stats): stats is UserStats => stats !== null)
        .sort((a, b) => {
          // Calculate connection priority
          const priorityA = calculateConnectionPriority(a.username, followerLogins, followingLogins);
          const priorityB = calculateConnectionPriority(b.username, followerLogins, followingLogins);

          // If priorities are different, sort by priority
          if (priorityB !== priorityA) {
            return priorityB - priorityA;
          }

          // If priorities are the same, sort by total commits
          return (b.totalCommits || 0) - (a.totalCommits || 0);
        });

      // Calculate network statistics
      const totalCommits = sortedUsers.reduce((sum, user) => sum + (user.totalCommits || 0), 0);
      const totalStreak = sortedUsers.reduce((sum, user) => sum + (user.longestStreak || 0), 0);
      const totalStars = sortedUsers.reduce((sum, user) => sum + (user.starsEarned || 0), 0);

      return new Response(
        JSON.stringify({
          networkUsers: sortedUsers.map((user, index) => ({
            username: user.username,
            avatarUrl: user.avatarUrl,
            totalCommits: user.totalCommits || 0,
            longestStreak: user.longestStreak || 0,
            starsEarned: user.starsEarned || 0,
            rank: startIdx + index + 1,
            followers: user.followers || 0,
            following: user.following || 0,
            commitRank: calculateCommitRank(user.totalCommits || 0),
            connectionType: calculateConnectionPriority(user.username, followerLogins, followingLogins),
          })),
          networkStats: {
            username: currentUser.login,
            avatarUrl: currentUser.avatar_url,
            totalCommits: currentUserStats?.totalCommits || 0,
            longestStreak: currentUserStats?.longestStreak || 0,
            starsEarned: currentUserStats?.starsEarned || 0,
            rank: calculateUserRank(currentUserStats, sortedUsers),
            followers: currentUser.followers || 0,
            following: currentUser.following || 0,
            commitRank: calculateCommitRank(currentUserStats?.totalCommits || 0),
          },
          totalUsers: networkUsers.length,
          averageCommits: Math.round(totalCommits / sortedUsers.length),
          averageStreak: Math.round(totalStreak / sortedUsers.length),
          averageStars: Math.round(totalStars / sortedUsers.length),
          hasMore: endIdx < networkUsers.length,
          currentPage: page,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle other load types...
    return new Response(JSON.stringify({ error: 'Invalid load type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while fetching stats',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 