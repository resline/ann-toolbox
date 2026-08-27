import React from 'react';
import { ChevronRight } from 'lucide-react';

interface CategorySectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onViewAll?: () => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  description,
  children,
  onViewAll,
}) => {
  return (
    <section className="mb-8 last:mb-0">
      <div className="flex items-end justify-between mb-4 px-1">
        <div>
          <h2 className="text-xl font-bold text-warmgray-900 dark:text-warmgray-50 tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-warmgray-500 dark:text-warmgray-400 mt-1">
              {description}
            </p>
          )}
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded px-2 py-1 min-h-[44px]"
            aria-label={`View all ${title}`}
          >
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {children}
      </div>
    </section>
  );
};
