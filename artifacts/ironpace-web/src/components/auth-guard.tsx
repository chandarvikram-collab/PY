import React from 'react';
import { useGetCurrentAuthUser, getGetCurrentAuthUserQueryKey } from '@workspace/api-client-react';
import { Activity } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useGetCurrentAuthUser({ query: { enabled: true, queryKey: getGetCurrentAuthUserQueryKey() } });

  if (isLoading) {
    return (
      <div className="pastel-theme min-h-screen w-full flex items-center justify-center bg-[#FAF7F7]">
        <div className="animate-pulse w-12 h-12 rounded-full bg-[#FCDADA] flex items-center justify-center">
          <Activity size={24} className="text-[#C0392B]" />
        </div>
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div className="pastel-theme min-h-screen w-full flex items-center justify-center bg-[#FAF7F7] p-4">
        <div className="w-full max-w-[400px] pastel-card p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-6 border-2 border-[#FCDADA]">
            <Activity size={32} className="text-[#C0392B]" strokeWidth={3} />
          </div>
          
          <h1 className="pastel-title text-3xl font-extrabold text-[#1A0808] mb-2">IronPace</h1>
          <p className="text-[#9B7272] text-sm font-medium mb-8">
            Your performance command center. Track workouts, hit your macros, and crush your goals.
          </p>

          <a 
            href="/api/login?returnTo=/ironpace-web/" 
            className="w-full py-4 bg-[#C0392B] hover:bg-[#8B1A1A] text-white rounded-2xl pastel-title font-bold text-lg shadow-[0_6px_20px_rgba(192,57,43,0.25)] hover:-translate-y-1 transition-all active:translate-y-0"
          >
            Log in to continue
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
