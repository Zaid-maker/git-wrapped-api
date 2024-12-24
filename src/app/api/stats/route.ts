import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

interface ContributionData {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number;
        weeks: {
          contributionDays: {
            contributionCount: number;
            date: string;
            weekday: number;
          }[];
        }[];
      };
    };
  };
}

interface NetworkUser {
  login: string;
  avatar_url: string;
  followers: number;
  following: number;
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const PER_PAGE = 30; // Number of items per page

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const page = parseInt(searchParams.get('page') || '1');
    const loadType = searchParams.get('loadType') || 'initial';

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Initial data load (basic user info and summary stats)
    if (loadType === 'initial') {
      const [user, repos] = await Promise.all([
        octokit.users.getByUsername({ username }),
        octokit.repos.listForUser({
          username,
          per_page: 100,
          sort: 'updated',
        })
      ]);

      // Calculate total stars
      const totalStars = repos.data.reduce((acc, repo) => acc + (repo.stargazers_count ?? 0), 0);

      // Calculate commit rank (approximation)
      const getCommitRank = (followers: number) => {
        if (followers >= 1000) return "Top 1%";
        if (followers >= 500) return "Top 5%";
        if (followers >= 100) return "Top 10%";
        if (followers >= 50) return "Top 25%";
        return "Top 50%";
      };

      const stats = {
        username: user.data.login,
        avatarUrl: user.data.avatar_url,
        name: user.data.name || user.data.login,
        followers: user.data.followers,
        following: user.data.following,
        totalCommits: 0, // Will be updated by contributions load
        longestStreak: 0, // Will be updated by contributions load
        starsEarned: totalStars,
        commitRank: getCommitRank(user.data.followers),
        mostActiveDay: {
          name: "Loading...",
          commits: 0
        },
        mostActiveMonth: {
          name: "Loading...",
          commits: 0
        }
      };
      return NextResponse.json(stats);
    }

    // Contribution data load
    if (loadType === 'contributions') {
      const query = `
        query($username: String!) {
          user(login: $username) {
            contributionsCollection {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    contributionCount
                    date
                    weekday
                  }
                }
              }
            }
          }
        }
      `;

      const contributionData = await octokit.graphql<ContributionData>(query, { username });
      const calendar = contributionData.user.contributionsCollection.contributionCalendar;
      
      // Process contribution data
      const contributionDays = calendar.weeks.flatMap(week => week.contributionDays);
      
      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      for (const day of contributionDays) {
        if (day.contributionCount > 0) {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }

      // Calculate daily and monthly patterns
      const dailyCommits: Record<number, number> = {};
      const monthlyCommits: Record<number, number> = {};

      contributionDays.forEach(day => {
        const date = new Date(day.date);
        dailyCommits[day.weekday] = (dailyCommits[day.weekday] || 0) + day.contributionCount;
        monthlyCommits[date.getMonth()] = (monthlyCommits[date.getMonth()] || 0) + day.contributionCount;
      });

      // Find most active day and month
      const mostActiveDay = Object.entries(dailyCommits)
        .sort(([, a], [, b]) => b - a)[0];
      const mostActiveMonth = Object.entries(monthlyCommits)
        .sort(([, a], [, b]) => b - a)[0];

      return NextResponse.json({
        calendarData: contributionDays,
        stats: {
          totalCommits: calendar.totalContributions,
          longestStreak,
          mostActiveDay: {
            name: WEEKDAY_NAMES[parseInt(mostActiveDay[0])],
            commits: Math.round(mostActiveDay[1] / (contributionDays.length / 7))
          },
          mostActiveMonth: {
            name: MONTH_NAMES[parseInt(mostActiveMonth[0])],
            commits: mostActiveMonth[1]
          }
        }
      });
    }

    // Repository data load (paginated)
    if (loadType === 'repositories') {
      const repos = await octokit.repos.listForUser({
        username,
        per_page: PER_PAGE,
        page,
        sort: 'updated',
      });

      const repoStats = await Promise.all(
        repos.data.map(async (repo) => {
          const languages = await octokit.repos.listLanguages({
            owner: repo.owner.login,
            repo: repo.name,
          });

          return {
            name: repo.name,
            stars: repo.stargazers_count,
            languages: Object.keys(languages.data),
          };
        })
      );

      return NextResponse.json({
        repositories: repoStats,
        hasMore: repos.data.length === PER_PAGE,
        nextPage: page + 1,
      });
    }

    // Network rankings load
    if (loadType === 'network') {
      const [followers, following] = await Promise.all([
        octokit.users.listFollowersForUser({ username, per_page: PER_PAGE, page }),
        octokit.users.listFollowingForUser({ username, per_page: PER_PAGE, page }),
      ]);

      const networkUserLogins = Array.from(
        new Set([
          ...followers.data.map(user => user.login),
          ...following.data.map(user => user.login)
        ])
      );

      const networkStats = await Promise.all(
        networkUserLogins.slice(0, PER_PAGE).map(async (networkUsername) => {
          const userData = await octokit.users.getByUsername({ username: networkUsername });
          return {
            username: userData.data.login,
            avatarUrl: userData.data.avatar_url,
            followers: userData.data.followers,
            following: userData.data.following,
          };
        })
      );

      return NextResponse.json({
        networkStats,
        hasMore: networkUserLogins.length > PER_PAGE,
        nextPage: page + 1,
      });
    }

    return NextResponse.json({ error: 'Invalid load type' }, { status: 400 });

  } catch (error: any) {
    console.error('Error fetching GitHub stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch GitHub stats' },
      { status: 500 }
    );
  }
} 