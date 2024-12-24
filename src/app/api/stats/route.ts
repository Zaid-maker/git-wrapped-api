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
      const user = await octokit.users.getByUsername({ username });
      const stats = {
        username: user.data.login,
        avatarUrl: user.data.avatar_url,
        name: user.data.name,
        followers: user.data.followers,
        following: user.data.following,
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
      return NextResponse.json({
        calendarData: contributionData.user.contributionsCollection.contributionCalendar,
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