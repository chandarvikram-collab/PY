import React from 'react';
import { Flame, Zap, Trophy, Target, ChevronRight, Activity, Plus } from 'lucide-react';
import './bento-dashboard.css';

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
  { label: 'Protein', value: 120, target: 150, color: '#DFFF00' },
  { label: 'Carbs', value: 180, target: 250, color: '#FF3366' },
  { label: 'Fat', value: 45, target: 70, color: '#00E5FF' },
];

const leaderboard = [
  { rank: 2, name: 'Alex M.', points: 2400, avatar: 'A', color: '#888' },
  { rank: 1, name: 'You', points: 2500, avatar: 'Y', color: '#DFFF00' },
  { rank: 3, name: 'Sam K.', points: 2100, avatar: 'S', color: '#888' },
];

export default function BentoDashboard() {
  return (
    <div className="bento-theme min-h-[100dvh] w-full flex justify-center bg-black">
      {/* Mobile constraint container */}
      <div className="w-full max-w-[400px] bg-[#050505] min-h-full shadow-2xl relative overflow-x-hidden">
        
        {/* Top Nav */}
        <div className="px-5 pt-10 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center text-[#DFFF00] bento-title font-bold text-lg">
              Y
            </div>
            <div>
              <p className="text-[#888] text-xs uppercase tracking-wider font-semibold">Today</p>
              <h1 className="bento-title text-xl font-bold text-white">Wed, Oct 13</h1>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full bg-[#DFFF00] text-black flex items-center justify-center shadow-[0_0_15px_rgba(223,255,0,0.3)]">
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Bento Grid */}
        <div className="bento-grid pb-10">
          
          {/* Card 1: The Week (Span 2) */}
          <div className="bento-card col-span-2 p-4">
            <div className="bento-glow" />
            <div className="flex justify-between items-center mb-4 relative z-10">
              <h2 className="bento-title text-lg font-bold flex items-center gap-2">
                <Activity size={18} className="text-[#DFFF00]" />
                This Week
              </h2>
              <span className="text-[#888] text-xs font-medium uppercase tracking-wider">Details</span>
            </div>
            
            <div className="flex justify-between items-center relative z-10">
              {weekDays.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] text-[#666] font-semibold">{d.day}</span>
                  <div 
                    className={`w-9 h-12 rounded-full flex flex-col items-center justify-center border transition-all ${
                      d.status === 'today' 
                        ? 'bg-[#DFFF00] border-[#DFFF00] text-black shadow-[0_0_10px_rgba(223,255,0,0.4)]' 
                        : d.status === 'completed'
                        ? 'bg-[#1A1A1A] border-[#DFFF00] text-white'
                        : d.status === 'missed'
                        ? 'bg-[#1A1A1A] border-[#FF3366] text-white'
                        : 'bg-[#111] border-[#222] text-[#555]'
                    }`}
                  >
                    <span className={`text-sm bento-title font-bold ${d.status === 'today' ? 'text-black' : ''}`}>
                      {d.date}
                    </span>
                    {d.status === 'completed' && <div className="w-1 h-1 rounded-full bg-[#DFFF00] mt-1" />}
                    {d.status === 'missed' && <div className="w-1 h-1 rounded-full bg-[#FF3366] mt-1" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Fuel (Span 1) */}
          <div className="bento-card p-4 flex flex-col justify-between aspect-square">
            <div className="bento-glow" />
            <div className="relative z-10">
              <h2 className="bento-title text-lg font-bold flex items-center gap-2 mb-1">
                <Zap size={16} className="text-[#00E5FF]" />
                Fuel
              </h2>
              <div className="flex items-baseline gap-1">
                <span className="bento-title text-3xl font-black text-white">1,850</span>
                <span className="text-[10px] text-[#888] uppercase tracking-wide">/ 2500 kcal</span>
              </div>
            </div>

            <div className="space-y-2 relative z-10 w-full mt-auto">
              {macros.map((m, i) => (
                <div key={i} className="w-full">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[#888]">{m.label}</span>
                    <span className="font-bold" style={{ color: m.color }}>{m.value}g</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#222] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${Math.min(100, (m.value / m.target) * 100)}%`,
                        backgroundColor: m.color
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Activity (Span 1) */}
          <div className="bento-card p-4 flex flex-col justify-between aspect-square">
            <div className="relative z-10">
              <h2 className="bento-title text-lg font-bold flex items-center gap-2 mb-1">
                <Target size={16} className="text-[#FF3366]" />
                Activity
              </h2>
              <div className="flex items-baseline gap-1">
                <span className="bento-title text-4xl font-black text-white">4</span>
                <span className="text-[10px] text-[#888] uppercase tracking-wide">Workouts</span>
              </div>
            </div>

            <div className="relative z-10 mt-auto bg-[#1A1A1A] border border-[#333] rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FF3366]/20 flex items-center justify-center">
                <Flame size={16} className="text-[#FF3366]" fill="#FF3366" />
              </div>
              <div>
                <div className="bento-title text-lg font-bold text-white leading-none">3 Days</div>
                <div className="text-[10px] text-[#888] uppercase tracking-wide mt-1">Streak</div>
              </div>
            </div>
          </div>

          {/* Card 4: Challenge (Span 2) */}
          <div className="bento-card col-span-2 p-0 min-h-[140px] group">
            {/* Background Image / Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A] via-[#1A1A1A]/80 to-transparent z-10" />
            <div 
              className="absolute inset-0 opacity-40 mix-blend-overlay grayscale group-hover:grayscale-0 transition-all duration-500"
              style={{
                backgroundImage: 'url("/__mockup/images/challenge-bg.png")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            
            <div className="relative z-20 p-5 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <div className="inline-block px-2 py-1 bg-[#DFFF00] text-black text-[10px] font-bold uppercase tracking-wider rounded mb-2">
                    Active Challenge
                  </div>
                  <h3 className="bento-title text-xl font-black text-white uppercase italic">Summer Shred</h3>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <ChevronRight size={16} className="text-white" />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-[#DFFF00]">60% Completed</span>
                  <span className="text-white">4 Days Left</span>
                </div>
                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                  <div className="h-full bg-[#DFFF00] rounded-full w-[60%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Leaderboard Podium (Span 2) */}
          <div className="bento-card col-span-2 p-5">
            <div className="flex justify-between items-center mb-6">
              <h2 className="bento-title text-lg font-bold flex items-center gap-2">
                <Trophy size={18} className="text-[#DFFF00]" />
                Leaderboard
              </h2>
              <span className="text-[#888] text-xs font-medium uppercase tracking-wider">Top 3</span>
            </div>

            <div className="flex justify-center items-end gap-3 h-[120px] pb-2">
              {leaderboard.map((user, i) => (
                <div key={i} className="flex flex-col items-center flex-1 relative">
                  {/* Avatar & Name */}
                  <div className={`flex flex-col items-center z-10 ${user.rank === 1 ? '-mt-6' : ''}`}>
                    <div 
                      className={`rounded-full flex items-center justify-center bento-title font-bold shadow-lg
                        ${user.rank === 1 ? 'w-12 h-12 text-black text-xl mb-2' : 'w-10 h-10 text-white text-base mb-2'}`}
                      style={{ backgroundColor: user.color, border: `2px solid ${user.rank === 1 ? '#fff' : '#333'}` }}
                    >
                      {user.avatar}
                    </div>
                    <span className={`text-xs font-semibold truncate w-full text-center ${user.rank === 1 ? 'text-[#DFFF00]' : 'text-white'}`}>
                      {user.name}
                    </span>
                    <span className="text-[10px] text-[#888] font-mono mt-0.5">{user.points}</span>
                  </div>

                  {/* Podium Pillar */}
                  <div 
                    className="w-full rounded-t-lg mt-2 bg-gradient-to-t border-t border-l border-r border-[#333]"
                    style={{ 
                      height: user.rank === 1 ? '60px' : user.rank === 2 ? '45px' : '30px',
                      backgroundImage: user.rank === 1 
                        ? 'linear-gradient(to top, #111, #222)' 
                        : 'linear-gradient(to top, #0A0A0A, #151515)'
                    }}
                  >
                    <div className="w-full text-center mt-2 bento-title text-xl font-black opacity-20">
                      {user.rank}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
