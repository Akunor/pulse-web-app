import React from 'react';
import Leaderboard from './Leaderboard';

export default function LeaderboardPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Leaderboards</h1>
        <Leaderboard />
      </div>
    </div>
  );
} 