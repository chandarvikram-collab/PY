import React from 'react';
import { Flame, Zap, Trophy, Target, ChevronRight, Activity, Plus } from 'lucide-react';
import { format, startOfWeek, addDays, isBefore, isSameDay, startOfToday, parseISO } from 'date-fns';
import { 
  useGetDashboardSummary, 
  useGetCurrentWeekSchedule, 
  useGetActiveChallenge, 
  useGetLeaderboard,
  getGetDashboardSummaryQueryKey,
  getGetCurrentWeekScheduleQueryKey,
  getGetActiveChallengeQueryKey,
  getGetLeaderboardQueryKey,
} from '@workspace/api-client-react';

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary({ query: { enabled: true, queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: schedule, isLoading: isScheduleLoading } = useGetCurrentWeekSchedule({ query: { enabled: true, queryKey: getGetCurrentWeekScheduleQueryKey() } });
  const { data: challengeData, isLoading: isChallengeLoading } = useGetActiveChallenge({ query: { enabled: true, queryKey: getGetActiveChallengeQueryKey() } });
  const { data: leaderboard, isLoading: isLeaderboardLoading } = useGetLeaderboard({ limit: 3 }, { query: { enabled: true, queryKey: getGetLeaderboardQueryKey({ limit: 3 }) } });

  const today = startOfToday();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday

  // Generate 7-day strip
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(weekStart, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const entry = schedule?.find(s => s.date.startsWith(dateStr));
    
    let status = 'upcoming';
    if (isSameDay(d, today)) {
      status = 'today';
    } else if (isBefore(d, today)) {
      if (entry) {
        status = entry.completed ? 'completed' : 'missed';
      }
      // if no entry, it's just 'upcoming' (rest day passed)
    }

    return {
      day: format(d, 'eeeee'), // S, M, T...
      date: format(d, 'd'), // 10, 11...
      status
    };
  });

  const isLoading = isSummaryLoading || isScheduleLoading || isChallengeLoading || isLeaderboardLoading;

  if (isLoading) {
    return (
      <div className="pastel-theme min-h-[100dvh] w-full flex justify-center">
        <div className="w-full max-w-[400px] min-h-full bg-[#FAF7F7] shadow-xl relative p-6 space-y-6">
           <div className="animate-pulse flex gap-4 mt-6">
             <div className="w-12 h-12 bg-[#FCDADA] rounded-full" />
             <div className="flex-1 space-y-2">
               <div className="h-4 w-1/4 bg-[#FCDADA] rounded" />
               <div className="h-6 w-2/3 bg-[#FCDADA] rounded" />
             </div>
           </div>
           <div className="animate-pulse h-32 bg-white rounded-[2rem] border-4 border-white" />
           <div className="grid grid-cols-2 gap-4">
             <div className="animate-pulse aspect-square bg-white rounded-[2rem] border-4 border-white" />
             <div className="animate-pulse aspect-square bg-white rounded-[2rem] border-4 border-white" />
           </div>
           <div className="animate-pulse h-40 bg-[#C0392B] opacity-50 rounded-[2rem] border-4 border-transparent" />
        </div>
      </div>
    );
  }

  // Fallbacks
  const currentSummary = summary || { 
    name: 'Athlete', 
    caloriesToday: 0, calorieGoal: 2000, 
    proteinToday: 0, proteinGoal: 150, 
    carbsToday: 0, carbGoal: 200, 
    fatToday: 0, fatGoal: 60,
    workoutsThisWeek: 0, streakDays: 0,
    imageUrl: null
  };

  const macros = [
    { label: 'Protein', value: currentSummary.proteinToday, target: currentSummary.proteinGoal, color: '#C0392B' },
    { label: 'Carbs',   value: currentSummary.carbsToday, target: currentSummary.carbGoal, color: '#E05252' },
    { label: 'Fat',     value: currentSummary.fatToday, target: currentSummary.fatGoal, color: '#FCDADA' },
  ];

  const challenge = challengeData?.challenge;

  // Process leaderboard to ensure we have 3 slots for podium (1, 2, 3)
  const sortedLeaderboard = [...(leaderboard || [])].sort((a, b) => a.rank - b.rank);
  const podiumSlots = [
    { rank: 2, data: sortedLeaderboard.find(l => l.rank === 2) },
    { rank: 1, data: sortedLeaderboard.find(l => l.rank === 1) },
    { rank: 3, data: sortedLeaderboard.find(l => l.rank === 3) },
  ];

  return (
    <div className="pastel-theme min-h-[100dvh] w-full flex justify-center">
      <div className="w-full max-w-[400px] min-h-full bg-[#FAF7F7] shadow-xl relative overflow-x-hidden">

        {/* Top Nav */}
        <div className="px-6 pt-12 pb-4 flex justify-between items-center bg-white rounded-b-[2.5rem] shadow-sm mb-2 z-20 relative border-b border-[#F3EBEB]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#C0392B] flex items-center justify-center text-white pastel-title font-bold text-xl shadow-[0_4px_14px_rgba(192,57,43,0.35)] overflow-hidden">
              {currentSummary.imageUrl ? (
                <img src={currentSummary.imageUrl} alt={currentSummary.name} className="w-full h-full object-cover" />
              ) : (
                currentSummary.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-[#9B7272] text-xs font-semibold tracking-wide mb-0.5">Today</p>
              <h1 className="pastel-title text-2xl font-bold text-[#1A0808] leading-none">
                {format(today, 'EEE, MMM d')}
              </h1>
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
                <span className="pastel-title text-4xl font-extrabold text-[#1A0808]">
                  {currentSummary.caloriesToday.toLocaleString()}
                </span>
                <span className="text-[11px] text-[#9B7272] font-semibold uppercase tracking-wide">
                  / {currentSummary.calorieGoal.toLocaleString()} kcal
                </span>
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
                        width: `${Math.min(100, (m.value / (m.target || 1)) * 100)}%`,
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
                <span className="pastel-title text-5xl font-extrabold text-[#1A0808]">
                  {currentSummary.workoutsThisWeek}
                </span>
                <span className="text-[11px] text-[#9B7272] font-semibold uppercase tracking-wide">Workouts</span>
              </div>
            </div>

            <div className="relative z-10 mt-auto bg-[#FEF2F2] rounded-2xl p-3 flex items-center gap-3 border border-[#FCDADA]">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#FCDADA]">
                <Flame size={20} className="text-[#C0392B]" fill="#C0392B" />
              </div>
              <div>
                <div className="pastel-title text-lg font-bold text-[#1A0808] leading-none mb-1">
                  {currentSummary.streakDays} Days
                </div>
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
              {challenge ? (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="inline-block px-3 py-1 bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider rounded-full mb-3 border border-white/30">
                        Active Challenge
                      </div>
                      <h3 className="pastel-title text-2xl font-extrabold text-white">{challenge.title}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/15 border border-white/30 flex items-center justify-center hover:bg-white/25 transition-colors cursor-pointer">
                      <ChevronRight size={20} className="text-white" />
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-white/90">{challenge.progressPercent}% Completed</span>
                      <span className="text-white/70 font-medium">{challenge.daysLeft} Days Left</span>
                    </div>
                    <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full shadow-sm" 
                        style={{ width: `${Math.min(100, challenge.progressPercent)}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3">
                    <Trophy size={24} className="text-white/80" />
                  </div>
                  <h3 className="pastel-title text-xl font-bold text-white mb-1">No Active Challenge</h3>
                  <p className="text-white/70 text-xs font-medium">Join a challenge to stay motivated.</p>
                </div>
              )}
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
              {podiumSlots.map((slot, i) => {
                const user = slot.data;
                const isRank1 = slot.rank === 1;
                const isRank2 = slot.rank === 2;
                
                // Colors logic matches mock
                const bgColor = isRank1 ? '#C0392B' : '#FEF2F2';
                const avatarColor = user?.isCurrentUser ? '#C0392B' : bgColor;
                const avatarText = user?.isCurrentUser ? '#FFFFFF' : '#9B7272';
                
                if (isRank1 && !user?.isCurrentUser && user) {
                    // special case if rank 1 is not you
                    // we'll still make it crimson
                }
                
                return (
                  <div key={i} className="flex flex-col items-center flex-1 relative">
                    <div className={`flex flex-col items-center z-10 ${isRank1 ? '-mt-8' : ''}`}>
                      <div
                        className={`rounded-full flex items-center justify-center pastel-title font-bold transition-transform hover:scale-110 overflow-hidden
                          ${isRank1
                            ? 'w-14 h-14 text-white text-2xl mb-3 shadow-[0_8px_20px_rgba(192,57,43,0.40)] border-4 border-white'
                            : 'w-11 h-11 text-[#7A4A4A] text-lg mb-2 border-2 border-[#FCDADA]'
                          }`}
                        style={{ 
                          backgroundColor: avatarColor,
                          color: avatarText
                        }}
                      >
                        {user ? (
                          user.imageUrl ? (
                            <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )
                        ) : '?'}
                      </div>
                      <span className={`text-sm font-bold truncate w-full text-center ${isRank1 ? 'text-[#C0392B]' : 'text-[#7A4A4A]'}`}>
                        {user ? (user.isCurrentUser ? 'You' : user.name.split(' ')[0]) : '-'}
                      </span>
                      <span className="text-[11px] text-[#9B7272] font-semibold mt-1 bg-[#FEF2F2] px-2 py-0.5 rounded-full">
                        {user ? user.totalPoints : 0}
                      </span>
                    </div>

                    {/* Podium Pillar */}
                    <div
                      className="w-full rounded-t-2xl mt-4"
                      style={{
                        height: isRank1 ? '70px' : isRank2 ? '50px' : '35px',
                        background: isRank1
                          ? 'linear-gradient(to top, #FEF2F2, #FCDADA)'
                          : 'linear-gradient(to top, #FAF7F7, #FEF2F2)',
                        borderTop: `2px solid ${isRank1 ? '#FCDADA' : '#F3EBEB'}`,
                        borderLeft: `2px solid ${isRank1 ? '#FCDADA' : '#F3EBEB'}`,
                        borderRight: `2px solid ${isRank1 ? '#FCDADA' : '#F3EBEB'}`,
                      }}
                    >
                      <div className="w-full text-center mt-3 pastel-title text-2xl font-black text-[#C0392B]/15">
                        {slot.rank}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
