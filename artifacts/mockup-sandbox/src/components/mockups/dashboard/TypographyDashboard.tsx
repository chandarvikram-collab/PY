import React from 'react';
import './typography-dashboard.css';

const weekDays = [
  { day: 'S', date: 10, status: 'completed' },
  { day: 'M', date: 11, status: 'completed' },
  { day: 'T', date: 12, status: 'missed' },
  { day: 'W', date: 13, status: 'today' },
  { day: 'T', date: 14, status: 'upcoming' },
  { day: 'F', date: 15, status: 'upcoming' },
  { day: 'S', date: 16, status: 'upcoming' },
];

const macros = [
  { label: 'Protein', value: 120, color: '#DFFF00' },
  { label: 'Carbs', value: 180, color: '#FF3366' },
  { label: 'Fat', value: 45, color: '#00E5FF' },
];

const leaderboard = [
  { rank: 1, name: 'You', points: 2500, color: '#DFFF00' },
  { rank: 2, name: 'Alex M.', points: 2400, color: '#fff' },
  { rank: 3, name: 'Sam K.', points: 2100, color: '#fff' },
];

export default function TypographyDashboard() {
  return (
    <div className="typo-theme min-h-[100dvh] w-full flex justify-center bg-[#050505] text-white">
      <div className="w-full max-w-[400px] bg-[#050505] min-h-full px-8 pb-24 overflow-x-hidden">
        
        {/* Header */}
        <div className="pt-16 pb-12">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">Today</div>
          <h1 className="typo-display text-4xl font-semibold tracking-tight">Wed, Oct 13</h1>
        </div>

        {/* This Week */}
        <div className="py-10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-8">This Week</div>
          <div className="flex justify-between">
            {weekDays.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-4">
                <span className="text-[10px] text-white/30 uppercase">{d.day}</span>
                <span className={`typo-display text-2xl font-medium ${
                  d.status === 'today' ? 'text-[#DFFF00]' : 
                  d.status === 'completed' ? 'text-white' : 
                  d.status === 'missed' ? 'text-[#FF3366] line-through decoration-[1.5px] opacity-80' : 
                  'text-white/20'
                }`}>
                  {d.date}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fuel */}
        <div className="py-10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Fuel / kcal</div>
          <div className="flex items-baseline gap-2 mb-10">
            <div className="typo-display text-[5.5rem] font-bold tracking-tighter leading-[0.85]">1,850</div>
            <div className="typo-display text-3xl text-white/20 font-medium tracking-tight">/2500</div>
          </div>
          <div className="flex justify-between text-xs uppercase tracking-[0.1em]">
            {macros.map((m, i) => (
              <div key={i}>
                <span className="text-white/40 block mb-2">{m.label}</span>
                <span className="text-base" style={{ color: m.color }}>{m.value}g</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="py-10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">Activity</div>
          <div className="flex items-baseline gap-4 mb-6">
            <div className="typo-display text-[5.5rem] font-bold tracking-tighter leading-[0.85]">4</div>
            <div className="typo-display text-3xl text-white/20 font-medium tracking-tight">Workouts</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#FF3366]" />
            <span className="text-white/60 text-[10px] uppercase tracking-[0.2em]">3 Day Streak</span>
          </div>
        </div>

        {/* Challenge */}
        <div className="py-10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#DFFF00] mb-6">Active Challenge</div>
          <div className="typo-display text-5xl font-semibold tracking-tight uppercase leading-[0.9] mb-8">
            Summer<br/>Shred
          </div>
          <div className="flex justify-between text-[10px] tracking-[0.1em] uppercase">
            <span className="text-white">60% Completed</span>
            <span className="text-white/40">4 Days Left</span>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="py-10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-10">Leaderboard / Top 3</div>
          <div className="space-y-8">
            {leaderboard.map((user, i) => (
              <div key={i} className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-6">
                  <span className="text-white/20 text-xs">0{user.rank}</span>
                  <span className={`typo-display text-3xl font-medium tracking-tight ${user.rank === 1 ? 'text-[#DFFF00]' : 'text-white'}`}>
                    {user.name}
                  </span>
                </div>
                <span className="text-sm tracking-widest">{user.points}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
