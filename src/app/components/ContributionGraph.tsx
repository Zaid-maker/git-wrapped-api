'use client'

import { useMemo } from 'react';

interface ContributionDay {
  contributionCount: number;
  date: string;
  weekday: number;
}

interface ContributionGraphProps {
  data: ContributionDay[];
}

const ContributionGraph: React.FC<ContributionGraphProps> = ({ data }) => {
  const { weeks, monthLabels } = useMemo(() => {
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const weeks: ContributionDay[][] = [];
    let currentWeek: ContributionDay[] = [];
    const months = new Set<string>();

    sortedData.forEach((day) => {
      if (currentWeek.length === 0 || new Date(day.date).getDay() > new Date(currentWeek[currentWeek.length - 1].date).getDay()) {
        currentWeek.push(day);
      } else {
        weeks.push(currentWeek);
        currentWeek = [day];
      }

      // Track month labels
      const date = new Date(day.date);
      if (date.getDate() <= 7) { // Only add month label if it's in the first week
        months.add(date.toLocaleString('default', { month: 'short' }));
      }
    });

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return {
      weeks,
      monthLabels: Array.from(months)
    };
  }, [data]);

  const getContributionColor = (count: number): string => {
    if (count === 0) return 'bg-gray-800 dark:bg-gray-800';
    if (count <= 3) return 'bg-emerald-900/90 dark:bg-emerald-900/90';
    if (count <= 6) return 'bg-emerald-700/90 dark:bg-emerald-700/90';
    if (count <= 9) return 'bg-emerald-500/90 dark:bg-emerald-500/90';
    return 'bg-emerald-300/90 dark:bg-emerald-300/90';
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('default', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="w-full overflow-x-auto bg-gray-900/50 rounded-lg p-4">
      {/* Month Labels */}
      <div className="flex gap-1 mb-2 pl-8">
        {monthLabels.map((month) => (
          <div key={month} className="text-xs text-gray-400 font-medium">
            {month}
          </div>
        ))}
      </div>

      <div className="inline-flex gap-1">
        {/* Week day labels */}
        <div className="flex flex-col gap-1 pr-2 text-xs text-gray-400">
          {weekDays.map((day, index) => (
            <div key={day} className="h-3 flex items-center">
              {index % 2 === 0 && <span className="text-[10px] font-medium">{day}</span>}
            </div>
          ))}
        </div>

        {/* Contribution grid */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {weekDays.map((_, dayIndex) => {
              const day = week.find(d => new Date(d.date).getDay() === dayIndex);
              return (
                <div
                  key={dayIndex}
                  className={`h-3 w-3 rounded-sm ${
                    day ? getContributionColor(day.contributionCount) : 'bg-gray-800/50'
                  } transition-all duration-200 hover:ring-2 hover:ring-white/30 hover:scale-150 group relative`}
                >
                  {day && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                      <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl border border-gray-700/50 backdrop-blur-sm">
                        <div className="font-medium mb-1">
                          {day.contributionCount} contribution{day.contributionCount !== 1 ? 's' : ''}
                        </div>
                        <div className="text-gray-400 text-[10px]">
                          {formatDate(day.date)}
                        </div>
                      </div>
                      <div className="border-8 border-transparent border-t-gray-900 w-0 h-0 absolute left-1/2 -translate-x-1/2 -bottom-3"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
        <span>Less</span>
        {[0, 3, 6, 9, 12].map((count) => (
          <div
            key={count}
            className={`h-3 w-3 rounded-sm ${getContributionColor(count)}`}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

export default ContributionGraph; 