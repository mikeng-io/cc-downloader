"use client";

import { Card } from "actify";
import { motion } from "framer-motion";

interface StatsCardProps {
  label: string;
  value: number;
  icon: string;
  color?: "primary" | "success" | "warning" | "error";
  loading?: boolean;
}

/**
 * StatCard Component
 *
 * Displays a single statistic card with Material 3 styling
 *
 * Features:
 * - Animated number count-up
 * - Material icon support
 * - Color variants for different stat types
 * - Loading skeleton state
 * - Responsive layout
 *
 * @param label - Descriptive label for the statistic
 * @param value - Numeric value to display
 * @param icon - Material symbol icon name
 * @param color - Color variant (primary, success, warning, error)
 * @param loading - Whether to show loading skeleton
 */
export function StatsCard({
  label,
  value,
  icon,
  color = "primary",
  loading = false,
}: StatsCardProps) {
  const colorClasses = {
    primary: "text-primary",
    success: "text-green-600 dark:text-green-400",
    warning: "text-orange-600 dark:text-orange-400",
    error: "text-red-600 dark:text-red-400",
  };

  if (loading) {
    return (
      <Card variant="elevated" elevation={1} className="p-6">
        <div className="flex items-center gap-4">
          <div className="skeleton h-12 w-12 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="skeleton h-8 w-20 rounded"></div>
            <div className="skeleton h-4 w-24 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        variant="elevated"
        elevation={1}
        className="card-hover p-6 transition-all duration-normal"
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 ${colorClasses[color]}`}
          >
            <span className="material-symbols-outlined text-3xl">{icon}</span>
          </div>

          {/* Value and Label */}
          <div className="flex-1">
            <motion.div
              key={value}
              initial={{ opacity: 0.7, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className={`text-3xl font-bold ${colorClasses[color]}`}
            >
              {value.toLocaleString()}
            </motion.div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
