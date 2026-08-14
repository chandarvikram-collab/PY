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
  { label: 'Protein', value: 120, target: 150, color: '#C0392B' },  // deep crimson
  { label: 'Carbs',   value: 180, target: 250, color: '#E05252' },  // softer red
  { label: 'Fat',     value: 45,  target: 70,  color: '#FCDADA' },  // light rose
];

const leaderboard = [
  { rank: 2, name: 'Alex M.', points: 2400, avatar: 'A', color: '#FEF2F2', textColor: '#9B7272' },
  { rank: 1, name: 'You',     points: 2500, avatar: 'Y', color: '#C0392B', textColor: '#FFFFFF' },
  { rank: 3, name: 'Sam K.', points: 2100, avatar: 'S', color: '#FEF2F2', textColor: '#9B7272' },
];

export default function PastelBentoDashboard() {
  return (
    <div className="pastel-theme min-h-[100dvh] w-full flex justify-center">
      <div className="w-full max-w-[400px] min-h-full bg-[#FAF7F7] shadow-xl relative overflow-x-hidden">

        {/* Top Nav */}
        <div className="px-6 pt-12 pb-4 flex justify-between items-center bg-white rounded-b-[2.5rem] shadow-sm mb-2 z-20 relative border-b border-[#F3EBEB]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#C0392B] flex items-center justify-center text-white pastel-title font-bold text-xl shadow-[0_4px_14px_rgba(192,57,43,0.35)]">
              Y
            </div>
            <div>
              <p className="text-[#9B7272] text-xs font-semibold tracking-wide mb-0.5">Today</p>
              <h1 className="pastel-title text-2xl font-bold text-[#1A0808] leading-none">Wed, Oct 13</h1>
            </div>
          </div>
          <button className="w-12 h-12 rounded-full bg-[#FEF2F2] text-[#C0392B] flex items-center justify-center shadow-[0_4px_12px_rgba(192,57,43,0.12)] hover:scale-105 transition-transform border border-[#FCDADA]">
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Bento Grid */}
        <div className="pastel-grid pb-12">

          {/* Card 1: This Week (Span 2) */}
          <div className="pastel-card col-span-2 p-5">
            <div className="pastel-glow" />
            <div className="flex justify-between items-center mb-5 relative z-10">
              <h2 className="pastel-title text-xl font-bold flex items-center gap-2 text-[#1A0808]">
                <Activity size={20} className="text-[#C0392B]" strokeWidth={3} />
                This Week
              </h2>
              <span className="text-[#C0392B] text-xs font-bold uppercase tracking-wider bg-[#FEF2F2] px-3 py-1.5 rounded-full border border-[#FCDADA]">
                Details
              </span>
            </div>

            <div className="flex justify-between items-center relative z-10">
              {weekDays.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <span className="text-[11px] text-[#9B7272] font-bold">{d.day}</span>
                  <div
                    className={`w-10 h-14 rounded-full flex flex-col items-center justify-center transition-all ${
                      d.status === 'today'
                        ? 'bg-[#C0392B] text-white shadow-[0_6px_16px_rgba(192,57,43,0.35)]'
                        : d.status === 'completed'
                        ? 'bg-[#FEF2F2] text-[#6B3A3A]'
                        : d.status === 'missed'
                        ? 'bg-[#FAF7F7] text-[#FCDADA]'
                        : 'bg-transparent text-[#DBBFBF]'
                    }`}
                  >
                    <span className={`text-base pastel-title font-bold ${d.status === 'today' ? 'text-white' : ''}`}>
                      {d.date}
                    </span>
                    {d.status === 'completed' && <div className="w-1.5 h-1.5 rounded-full bg-[#C0392B] mt-1 opacity-60" />}
                    {d.status === 'missed'    && <div className="w-1.5 h-1.5 rounded-full bg-[#FCDADA] mt-1" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Fuel (Span 1) */}
          <div className="pastel-card p-5 flex flex-col justify-between aspect-square">
            <div className="relative z-10">
              <h2 className="pastel-title text-lg font-bold flex items-center gap-2 mb-2 text-[#1A0808]">
                <Zap size={18} className="text-[#C0392B]" strokeWidth={3} fill="#C0392B" />
                Fuel
              </h2>
              <div className="flex flex-col gap-0.5">
                <span className="pastel-title text-4xl font-extrabold text-[#1A0808]">1,850</span>
                <span className="text-[11px] text-[#9B7272] font-semibold uppercase tracking-wide">/ 2500 kcal</span>
              </div>
            </div>

            <div className="space-y-2.5 relative z-10 w-full mt-auto">
              {macros.map((m, i) => (
                <div key={i} className="w-full">
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="text-[#7A4A4A] font-medium">{m.label}</span>
                    <span className="font-bold text-[#4A1A1A]">{m.value}g</span>
                  </div>
                  <div className="h-2 w-full bg-[#FEF2F2] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (m.value / m.target) * 100)}%`,
                        backgroundColor: m.color,
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
              <h2 className="pastel-title text-lg font-bold flex items-center gap-2 mb-2 text-[#1A0808]">
                <Target size={18} className="text-[#E05252]" strokeWidth={3} />
                Activity
              </h2>
              <div className="flex flex-col gap-0.5">
                <span className="pastel-title text-5xl font-extrabold text-[#1A0808]">4</span>
                <span className="text-[11px] text-[#9B7272] font-semibold uppercase tracking-wide">Workouts</span>
              </div>
            </div>

            <div className="relative z-10 mt-auto bg-[#FEF2F2] rounded-2xl p-3 flex items-center gap-3 border border-[#FCDADA]">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#FCDADA]">
                <Flame size={20} className="text-[#C0392B]" fill="#C0392B" />
              </div>
              <div>
                <div className="pastel-title text-lg font-bold text-[#1A0808] leading-none mb-1">3 Days</div>
                <div className="text-[10px] text-[#C0392B] font-bold uppercase tracking-wide">Streak</div>
              </div>
            </div>
          </div>

          {/* Card 4: Challenge (Span 2) */}
          <div className="pastel-card col-span-2 p-0 min-h-[160px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#C0392B] to-[#8B1A1A] z-10" />
            {/* Subtle texture overlay */}
            <div className="absolute inset-0 z-10 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.4) 0%, transparent 50%),
                                  radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)`,
              }}
            />
            <div className="relative z-20 p-6 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <div className="inline-block px-3 py-1 bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider rounded-full mb-3 border border-white/30">
                    Active Challenge
                  </div>
                  <h3 className="pastel-title text-2xl font-extrabold text-white">Summer Shred</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/15 border border-white/30 flex items-center justify-center hover:bg-white/25 transition-colors cursor-pointer">
                  <ChevronRight size={20} className="text-white" />
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-white/90">60% Completed</span>
                  <span className="text-white/70 font-medium">4 Days Left</span>
                </div>
                <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full w-[60%] shadow-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Leaderboard Podium (Span 2) */}
          <div className="pastel-card col-span-2 p-6">
            <div className="flex justify-between items-center mb-8">
              <h2 className="pastel-title text-xl font-bold flex items-center gap-2 text-[#1A0808]">
                <Trophy size={20} className="text-[#C0392B]" fill="#C0392B" />
                Leaderboard
              </h2>
              <span className="text-[#C0392B] text-xs font-bold uppercase tracking-wider bg-[#FEF2F2] px-3 py-1.5 rounded-full border border-[#FCDADA]">
                Top 3
              </span>
            </div>

            <div className="flex justify-center items-end gap-4 h-[140px] pb-2">
              {leaderboard.map((user, i) => (
                <div key={i} className="flex flex-col items-center flex-1 relative">
                  <div className={`flex flex-col items-center z-10 ${user.rank === 1 ? '-mt-8' : ''}`}>
                    <div
                      className={`rounded-full flex items-center justify-center pastel-title font-bold transition-transform hover:scale-110
                        ${user.rank === 1
                          ? 'w-14 h-14 text-white text-2xl mb-3 shadow-[0_8px_20px_rgba(192,57,43,0.40)] border-4 border-white'
                          : 'w-11 h-11 text-[#7A4A4A] text-lg mb-2 border-2 border-[#FCDADA]'
                        }`}
                      style={{ backgroundColor: user.color }}
                    >
                      {user.avatar}
                    </div>
                    <span className={`text-sm font-bold truncate w-full text-center ${user.rank === 1 ? 'text-[#C0392B]' : 'text-[#7A4A4A]'}`}>
                      {user.name}
                    </span>
                    <span className="text-[11px] text-[#9B7272] font-semibold mt-1 bg-[#FEF2F2] px-2 py-0.5 rounded-full">
                      {user.points}
                    </span>
                  </div>

                  {/* Podium Pillar */}
                  <div
                    className="w-full rounded-t-2xl mt-4"
                    style={{
                      height: user.rank === 1 ? '70px' : user.rank === 2 ? '50px' : '35px',
                      background: user.rank === 1
                        ? 'linear-gradient(to top, #FEF2F2, #FCDADA)'
                        : 'linear-gradient(to top, #FAF7F7, #FEF2F2)',
                      borderTop: `2px solid ${user.rank === 1 ? '#FCDADA' : '#F3EBEB'}`,
                      borderLeft: `2px solid ${user.rank === 1 ? '#FCDADA' : '#F3EBEB'}`,
                      borderRight: `2px solid ${user.rank === 1 ? '#FCDADA' : '#F3EBEB'}`,
                    }}
                  >
                    <div className="w-full text-center mt-3 pastel-title text-2xl font-black text-[#C0392B]/15">
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
