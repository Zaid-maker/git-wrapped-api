'use client'

import { useState } from 'react';

interface StatBadgeProps {
  label: string;
  value: string | number;
  color?: string;
  showCopy?: boolean;
}

const StatBadge: React.FC<StatBadgeProps> = ({ 
  label, 
  value, 
  color = 'purple',
  showCopy = true 
}) => {
  const [copied, setCopied] = useState(false);

  const colorClasses = {
    purple: 'from-purple-500 to-pink-500',
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-emerald-500 to-teal-500',
    orange: 'from-orange-500 to-amber-500',
  };

  const badgeUrl = `https://img.shields.io/badge/${label}-${value}-${color}?style=for-the-badge&logo=github`;

  const markdownCode = `![${label}](${badgeUrl})`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="group relative">
      <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg p-2 backdrop-blur-sm border border-gray-700/50">
        <div className="flex items-center rounded-md overflow-hidden">
          <div className="bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300">
            {label}
          </div>
          <div className={`bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} px-3 py-1 text-xs font-medium text-white`}>
            {value}
          </div>
        </div>
        {showCopy && (
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-gray-800/50 transition-colors"
            title="Copy markdown"
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default StatBadge; 