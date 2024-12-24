import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

export const runtime = "edge";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  throw new Error("Missing GITHUB_TOKEN environment variable");
}

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

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

/**
 * Determines the user's commit rank based on their total number of contributions
 * These thresholds are approximations based on general GitHub activity patterns
 */
function getCommitRank(totalCommits: number): string {
  if (totalCommits >= 5000) return "Top 0.5%-1%";
  if (totalCommits >= 2000) return "Top 1%-3%";
  if (totalCommits >= 1000) return "Top 5%-10%";
  if (totalCommits >= 500) return "Top 10%-15%";
  if (totalCommits >= 200) return "Top 25%-30%";
  if (totalCommits >= 50) return "Median 50%";
  return "Bottom 30%";
}

// Constants for date formatting
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * GitHub Stats API endpoint
 * Fetches and processes a user's GitHub statistics including:
 * - Contribution data
 * - Commit patterns
 * - Repository stars
 * - Programming languages
 *
 * @param request - Incoming HTTP request with 'username' query parameter
 * @returns JSON response with processed GitHub statistics
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "Username parameter is required" },
        { status: 400 }
      );
    }

    // GraphQL query for main user data
    const query = `
      query($username: String!) {
        user(login: $username) {
          avatarUrl
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
          repositories(first: 100, orderBy: {field: STARGAZERS, direction: DESC}) {
            nodes {
              stargazerCount
              primaryLanguage {
                name
              }
            }
          }
        }
      }
    `;

    // Fetch main user data using GraphQL
    const graphqlResponse = (await octokit.graphql(query, { username })) as any;
    const userData = graphqlResponse.user;

    // Fetch followers and following using REST API
    const [followersResponse, followingResponse] = await Promise.all([
      octokit.rest.users.listFollowersForUser({ username, per_page: 3 }),
      octokit.rest.users.listFollowingForUser({ username, per_page: 3 })
    ]);

    // Fetch additional data for network users
    const networkUsers = [
      {
        login: username,
        avatarUrl: userData.avatarUrl,
        contributionsCollection: userData.contributionsCollection,
        repositories: userData.repositories,
      }
    ];

    // Process followers and following data
    const networkLogins = [...followersResponse.data, ...followingResponse.data]
      .map(user => user.login)
      .filter((login, index, self) => self.indexOf(login) === index); // Remove duplicates

    // Fetch data for each network user
    const networkUsersData = (await Promise.all(
      networkLogins.map(async (login) => {
        try {
          const userQuery = `
            query($login: String!) {
              user(login: $login) {
                avatarUrl
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
                repositories(first: 100, orderBy: {field: STARGAZERS, direction: DESC}) {
                  nodes {
                    stargazerCount
                  }
                }
              }
            }
          `;
          const response = (await octokit.graphql(userQuery, { login })) as any;
          return {
            login,
            avatarUrl: response.user.avatarUrl,
            contributionsCollection: response.user.contributionsCollection,
            repositories: response.user.repositories,
          };
        } catch (error) {
          console.error(`Error fetching data for user ${login}:`, error);
          return null;
        }
      })
    )).filter((data): data is NonNullable<typeof data> => data !== null);

    // Add valid network users data
    networkUsers.push(...networkUsersData);

    // Process contribution data and other stats as before
    const contributionDays =
      userData.contributionsCollection.contributionCalendar.weeks
        .flatMap((week: any) => week.contributionDays)
        .filter((day: any) => new Date(day.date) >= new Date("2024-01-01"));

    // Calculate monthly contribution statistics
    const monthlyCommits: Record<string, number> = {};
    contributionDays.forEach((day: ContributionDay) => {
      const month = new Date(day.date).getMonth() + 1;
      const monthKey = month.toString().padStart(2, "0");
      monthlyCommits[monthKey] =
        (monthlyCommits[monthKey] || 0) + day.contributionCount;
    });

    // Calculate daily contribution patterns
    const dailyCommits: Record<string, number> = {};
    contributionDays.forEach((day: ContributionDay) => {
      dailyCommits[day.weekday] =
        (dailyCommits[day.weekday] || 0) + day.contributionCount;
    });

    // Find peak activity periods
    const [mostActiveMonth] = Object.entries(monthlyCommits).sort(
      ([, a], [, b]) => b - a
    );

    const [mostActiveDay] = Object.entries(dailyCommits).sort(
      ([, a], [, b]) => b - a
    );

    // Calculate repository statistics
    const totalStars = userData.repositories.nodes.reduce(
      (acc: number, repo: any) => acc + repo.stargazerCount,
      0
    );

    // Process programming language statistics
    const languages = userData.repositories.nodes.reduce(
      (acc: Record<string, number>, repo: any) => {
        if (repo.primaryLanguage?.name) {
          acc[repo.primaryLanguage.name] =
            (acc[repo.primaryLanguage.name] || 0) + 1;
        }
        return acc;
      },
      {}
    );

    const topLanguages = Object.entries(languages)
      .sort(([, a], [, b]): number => (b as number) - (a as number))
      .slice(0, 3)
      .map(([lang]) => lang);

    // Calculate contribution streaks
    let currentStreak = 0;
    let maxStreak = 0;
    for (const day of contributionDays) {
      if (day.contributionCount > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    const leaderboards = {
      commits: networkUsers
        .map((user) => ({
          username: user.login,
          value: user.contributionsCollection.contributionCalendar.totalContributions,
          avatarUrl: user.avatarUrl,
          rank: 0,
        }))
        .sort((a, b) => b.value - a.value)
        .map((entry, index) => ({ ...entry, rank: index + 1 })),

      streak: networkUsers
        .map((user) => {
          let maxStreak = 0;
          let currentStreak = 0;
          const days = user.contributionsCollection?.contributionCalendar?.weeks
            ?.flatMap((week: any) => week.contributionDays)
            ?.filter((day: any) => new Date(day.date) >= new Date("2024-01-01")) || [];

          days.forEach((day: any) => {
            if (day.contributionCount > 0) {
              currentStreak++;
              maxStreak = Math.max(maxStreak, currentStreak);
            } else {
              currentStreak = 0;
            }
          });

          return {
            username: user.login,
            value: maxStreak,
            avatarUrl: user.avatarUrl,
            rank: 0,
          };
        })
        .sort((a, b) => b.value - a.value)
        .map((entry, index) => ({ ...entry, rank: index + 1 })),

      stars: networkUsers
        .map((user) => ({
          username: user.login,
          value: user.repositories.nodes.reduce(
            (acc: number, repo: any) => acc + (repo.stargazerCount || 0),
            0
          ),
          avatarUrl: user.avatarUrl,
          rank: 0,
        }))
        .sort((a, b) => b.value - a.value)
        .map((entry, index) => ({ ...entry, rank: index + 1 })),
    };

    // Prepare and return the final statistics
    const stats: GitHubStats = {
      longestStreak: maxStreak,
      totalCommits: userData.contributionsCollection.contributionCalendar.totalContributions,
      commitRank: getCommitRank(userData.contributionsCollection.contributionCalendar.totalContributions),
      calendarData: contributionDays,
      mostActiveDay: {
        name: WEEKDAY_NAMES[parseInt(mostActiveDay[0])],
        commits: Math.round(mostActiveDay[1] / (contributionDays.length / 7)),
      },
      mostActiveMonth: {
        name: MONTH_NAMES[parseInt(mostActiveMonth[0]) - 1],
        commits: mostActiveMonth[1],
      },
      starsEarned: totalStars,
      topLanguages,
      leaderboards,
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("Error fetching GitHub stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch GitHub statistics" },
      { status: 500 }
    );
  }
} 