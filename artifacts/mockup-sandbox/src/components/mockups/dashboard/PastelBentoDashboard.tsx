import React from 'react';
import { Flame, Zap, Trophy, Target, ChevronRight, Activity, Plus } from 'lucide-react';
import './pastel-bento-dashboard.css';

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
  { label: 'Protein', value: 120, target: 150, color: '#A2D2FF' }, // Pastel Blue
  { label: 'Carbs', value: 180, target: 250, color: '#FFAFCC' }, // Pastel Pink
  { label: 'Fat', value: 45, target: 70, color: '#B9FBC0' }, // Pastel Green
];

const leaderboard = [
  { rank: 2, name: 'Alex M.', points: 2400, avatar: 'A', color: '#F3F4F6', textColor: '#9CA3AF' },
  { rank: 1, name: 'You', points: 2500, avatar: 'Y', color: '#CDB4DB', textColor: '#FFFFFF' },
  { rank: 3, name: 'Sam K.', points: 2100, avatar: 'S', color: '#F3F4F6', textColor: '#9CA3AF' },
];

export default function PastelBentoDashboard() {
  return (
    <div className="pastel-theme min-h-[100dvh] w-full flex justify-center">
      {/* Mobile constraint container */}
      <div className="w-full max-w-[400px] min-h-full bg-[#F9FAFB] shadow-xl relative overflow-x-hidden">
        
        {/* Top Nav */}
        <div className="px-6 pt-12 pb-4 flex justify-between items-center bg-white rounded-b-[2.5rem] shadow-sm mb-2 z-20 relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#CDB4DB] flex items-center justify-center text-white pastel-title font-bold text-xl shadow-[0_4px_12px_rgba(205,180,219,0.4)]">
              Y
            </div>
            <div>
              <p className="text-[#9CA3AF] text-xs font-semibold tracking-wide mb-0.5">Today</p>
              <h1 className="pastel-title text-2xl font-bold text-[#1F2937] leading-none">Wed, Oct 13</h1>
            </div>
          </div>
          <button className="w-12 h-12 rounded-full bg-[#B9FBC0] text-[#1F2937] flex items-center justify-center shadow-[0_4px_12px_rgba(185,251,192,0.4)] hover:scale-105 transition-transform">
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Bento Grid */}
        <div className="pastel-grid pb-12">
          
          {/* Card 1: The Week (Span 2) */}
          <div className="pastel-card col-span-2 p-5">
            <div className="pastel-glow" />
            <div className="flex justify-between items-center mb-5 relative z-10">
              <h2 className="pastel-title text-xl font-bold flex items-center gap-2 text-[#1F2937]">
                <Activity size={20} className="text-[#A2D2FF]" strokeWidth={3} />
                This Week
              </h2>
              <span className="text-[#A2D2FF] text-xs font-bold uppercase tracking-wider bg-[#A2D2FF]/10 px-3 py-1.5 rounded-full">Details</span>
            </div>
            
            <div className="flex justify-between items-center relative z-10">
              {weekDays.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <span className="text-[11px] text-[#9CA3AF] font-bold">{d.day}</span>
                  <div 
                    className={`w-10 h-14 rounded-full flex flex-col items-center justify-center transition-all ${
                      d.status === 'today' 
                        ? 'bg-[#A2D2FF] text-white shadow-[0_6px_16px_rgba(162,210,255,0.4)]' 
                        : d.status === 'completed'
                        ? 'bg-[#F3F4F6] text-[#4B5563]'
                        : d.status === 'missed'
                        ? 'bg-[#FFF0F4] text-[#FFAFCC]'
                        : 'bg-transparent text-[#D1D5DB]'
                    }`}
                  >
                    <span className={`text-base pastel-title font-bold ${d.status === 'today' ? 'text-white' : ''}`}>
                      {d.date}
                    </span>
                    {d.status === 'completed' && <div className="w-1.5 h-1.5 rounded-full bg-[#B9FBC0] mt-1" />}
                    {d.status === 'missed' && <div className="w-1.5 h-1.5 rounded-full bg-[#FFAFCC] mt-1" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Fuel (Span 1) */}
          <div className="pastel-card p-5 flex flex-col justify-between aspect-square">
            <div className="relative z-10">
              <h2 className="pastel-title text-lg font-bold flex items-center gap-2 mb-2 text-[#1F2937]">
                <Zap size={18} className="text-[#FBF8CC]" strokeWidth={3} fill="#FBF8CC" />
                Fuel
              </h2>
              <div className="flex flex-col gap-0.5">
                <span className="pastel-title text-4xl font-extrabold text-[#1F2937]">1,850</span>
                <span className="text-[11px] text-[#9CA3AF] font-semibold uppercase tracking-wide">/ 2500 kcal</span>
              </div>
            </div>

            <div className="space-y-2.5 relative z-10 w-full mt-auto">
              {macros.map((m, i) => (
                <div key={i} className="w-full">
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="text-[#6B7280] font-medium">{m.label}</span>
                    <span className="font-bold text-[#4B5563]">{m.value}g</span>
                  </div>
                  <div className="h-2 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
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
          <div className="pastel-card p-5 flex flex-col justify-between aspect-square">
            <div className="relative z-10">
              <h2 className="pastel-title text-lg font-bold flex items-center gap-2 mb-2 text-[#1F2937]">
                <Target size={18} className="text-[#FFAFCC]" strokeWidth={3} />
                Activity
              </h2>
              <div className="flex flex-col gap-0.5">
                <span className="pastel-title text-5xl font-extrabold text-[#1F2937]">4</span>
                <span className="text-[11px] text-[#9CA3AF] font-semibold uppercase tracking-wide">Workouts</span>
              </div>
            </div>

            <div className="relative z-10 mt-auto bg-[#FFF0F4] rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <Flame size={20} className="text-[#FFAFCC]" fill="#FFAFCC" />
              </div>
              <div>
                <div className="pastel-title text-lg font-bold text-[#1F2937] leading-none mb-1">3 Days</div>
                <div className="text-[10px] text-[#FFAFCC] font-bold uppercase tracking-wide">Streak</div>
              </div>
            </div>
          </div>

          {/* Card 4: Challenge (Span 2) */}
          <div className="pastel-card col-span-2 p-0 min-h-[160px] group overflow-hidden">
            {/* Background Image / Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#A2D2FF]/20 to-[#CDB4DB]/40 z-10 mix-blend-multiply" />
            <div 
              className="absolute inset-0 opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out"
              style={{
                backgroundImage: 'url("/__mockup/images/pastel-challenge-bg.png")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            
            <div className="relative z-20 p-6 h-full flex flex-col justify-between bg-gradient-to-t from-black/20 to-transparent">
              <div className="flex justify-between items-start">
                <div>
                  <div className="inline-block px-3 py-1 bg-white/30 backdrop-blur-md text-white text-[11px] font-bold uppercase tracking-wider rounded-full mb-3 shadow-sm border border-white/40">
                    Active Challenge
                  </div>
                  <h3 className="pastel-title text-2xl font-extrabold text-white">Summer Shred</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-sm hover:bg-white/30 transition-colors cursor-pointer">
                  <ChevronRight size={20} className="text-white" />
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-white drop-shadow-sm">60% Completed</span>
                  <span className="text-white/90 font-medium">4 Days Left</span>
                </div>
                <div className="h-3 w-full bg-white/30 rounded-full overflow-hidden backdrop-blur-md border border-white/20 p-0.5">
                  <div className="h-full bg-white rounded-full w-[60%] shadow-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Leaderboard Podium (Span 2) */}
          <div className="pastel-card col-span-2 p-6">
            <div className="flex justify-between items-center mb-8">
              <h2 className="pastel-title text-xl font-bold flex items-center gap-2 text-[#1F2937]">
                <Trophy size={20} className="text-[#FBF8CC]" fill="#FBF8CC" />
                Leaderboard
              </h2>
              <span className="text-[#CDB4DB] text-xs font-bold uppercase tracking-wider bg-[#CDB4DB]/10 px-3 py-1.5 rounded-full">Top 3</span>
            </div>

            <div className="flex justify-center items-end gap-4 h-[140px] pb-2">
              {leaderboard.map((user, i) => (
                <div key={i} className="flex flex-col items-center flex-1 relative">
                  {/* Avatar & Name */}
                  <div className={`flex flex-col items-center z-10 ${user.rank === 1 ? '-mt-8' : ''}`}>
                    <div 
                      className={`rounded-full flex items-center justify-center pastel-title font-bold shadow-sm transition-transform hover:scale-110
                        ${user.rank === 1 ? 'w-14 h-14 text-white text-2xl mb-3 shadow-[0_8px_20px_rgba(205,180,219,0.5)] border-4 border-white' : 'w-11 h-11 text-[#6B7280] text-lg mb-2 border-2 border-white'}`}
                      style={{ backgroundColor: user.color }}
                    >
                      {user.avatar}
                    </div>
                    <span className={`text-sm font-bold truncate w-full text-center ${user.rank === 1 ? 'text-[#CDB4DB]' : 'text-[#6B7280]'}`}>
                      {user.name}
                    </span>
                    <span className="text-[11px] text-[#9CA3AF] font-semibold mt-1 bg-[#F3F4F6] px-2 py-0.5 rounded-full">{user.points}</span>
                  </div>

                  {/* Podium Pillar */}
                  <div 
                    className="w-full rounded-t-2xl mt-4 border-t-2 border-l-2 border-r-2 border-white"
                    style={{ 
                      height: user.rank === 1 ? '70px' : user.rank === 2 ? '50px' : '35px',
                      background: user.rank === 1 
                        ? 'linear-gradient(to top, #F9FAFB, #F3F4F6)' 
                        : 'linear-gradient(to top, #FFFFFF, #F9FAFB)',
                      boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div className="w-full text-center mt-3 pastel-title text-2xl font-black text-[#D1D5DB]/30">
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
