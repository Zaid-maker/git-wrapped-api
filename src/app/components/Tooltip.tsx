'use client'

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'below';
  showArrow?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top',
  showArrow = true 
}) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    below: 'top-full left-0 right-0 mt-1',
  };

  const arrowClasses = {
    top: 'border-t-gray-900 -bottom-2',
    bottom: 'border-b-gray-900 -top-2 rotate-180',
    left: 'border-l-gray-900 -right-2 rotate-90',
    right: 'border-r-gray-900 -left-2 -rotate-90',
    below: 'hidden',
  };

  const tooltipClasses = position === 'below' 
    ? 'bg-gray-900/95 backdrop-blur-sm text-gray-400 text-xs py-1.5 px-2 rounded-md shadow-lg border border-gray-700/50 w-full'
    : 'bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-lg py-2 px-3 max-w-xs shadow-xl border border-gray-700/50';

  return (
    <div className="group relative inline-block">
      {children}
      <div
        className={`absolute ${positionClasses[position]} hidden group-hover:block z-50 animate-fade-in`}
      >
        <div className={tooltipClasses}>
          {content}
        </div>
        {showArrow && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 border-8 border-transparent ${arrowClasses[position]}`}
          ></div>
        )}
      </div>
    </div>
  );
};

export default Tooltip; 