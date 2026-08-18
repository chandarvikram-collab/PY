import React, { useMemo } from 'react';
import { useUser, useClerk } from '@clerk/react';
import { useGetCurrentAuthUser } from '@workspace/api-client-react';
import { useLocalLog } from '@/hooks/use-local-log';
import { QuickLogModal } from '@/components/quick-log-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Flame, Dumbbell, Footprints, LogOut, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { signOut } = useClerk();
  const { data: authData, isLoading: authLoading } = useGetCurrentAuthUser();
  const { todayFoodLog, recentWorkouts, recentRuns, refresh } = useLocalLog();

  const macros = useMemo(
    () =>
      todayFoodLog.reduce(
        (acc, entry) => ({
          cal: acc.cal + entry.calories,
          pro: acc.pro + entry.protein,
          carb: acc.carb + entry.carbs,
          fat: acc.fat + entry.fat,
        }),
        { cal: 0, pro: 0, carb: 0, fat: 0 },
      ),
    [todayFoodLog],
  );

  if (!clerkLoaded || authLoading) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Display name: prefer full name from Clerk, fallback to email prefix
  const displayName =
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    clerkUser?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ||
    'Athlete';

  const avatarFallback = displayName.slice(0, 2).toUpperCase();
  const avatarUrl = clerkUser?.imageUrl;

  // The local user id (from our DB, linked to clerkId)
  const localUserId = authData?.user?.id;

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span className="text-primary uppercase">Iron</span>Pace
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            {localUserId && (
              <QuickLogModal userId={localUserId} onLogSuccess={refresh} />
            )}
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-none">{displayName}</p>
                {clerkUser?.emailAddresses?.[0]?.emailAddress && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {clerkUser.emailAddresses[0].emailAddress}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  signOut({ redirectUrl: import.meta.env.BASE_URL || '/' })
                }
                title="Sign out"
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Account linked notice */}
        {!authData?.user && (
          <div className="flex items-center gap-2 rounded-none border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-400">
            <span className="font-semibold">Mobile account not linked.</span>
            <span>Open the IronPace mobile app and log in to sync your data here.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MacroCard
            title="Calories"
            value={macros.cal}
            suffix="kcal"
            icon={<Flame className="w-4 h-4 text-primary" />}
          />
          <MacroCard title="Protein" value={macros.pro} suffix="g" />
          <MacroCard title="Carbs" value={macros.carb} suffix="g" />
          <MacroCard title="Fat" value={macros.fat} suffix="g" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="col-span-1 border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Flame className="w-4 h-4" /> Today's Fuel
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {todayFoodLog.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No food logged today.
                </div>
              ) : (
                <div className="space-y-3">
                  {todayFoodLog.map((food) => (
                    <div key={food.id} className="flex justify-between items-center text-sm">
                      <div>
                        <div className="font-medium">{food.name}</div>
                        <div className="text-xs text-muted-foreground">{food.meal}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-primary">{food.calories}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {food.protein}P / {food.carbs}C / {food.fat}F
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1 border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Dumbbell className="w-4 h-4" /> Recent Lifts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {recentWorkouts.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No recent workouts.
                </div>
              ) : (
                <div className="space-y-4">
                  {recentWorkouts.map((w) => (
                    <div
                      key={w.id}
                      className="flex justify-between items-center text-sm border-l-2 border-primary pl-3 py-1"
                    >
                      <div>
                        <div className="font-bold">{w.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {w.date.slice(5)} • {Math.round(w.durationSeconds / 60)} min
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-white">
                          {w.volumeKg > 0 ? `${w.volumeKg} kg` : '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1 border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Footprints className="w-4 h-4" /> Recent Runs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {recentRuns.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No recent runs.
                </div>
              ) : (
                <div className="space-y-4">
                  {recentRuns.map((r) => (
                    <div
                      key={r.id}
                      className="flex justify-between items-center text-sm border-l-2 border-primary pl-3 py-1"
                    >
                      <div>
                        <div className="font-bold">{r.distanceKm} km</div>
                        <div className="text-xs text-muted-foreground">
                          {r.date.slice(5)} • {Math.round(r.durationSeconds / 60)} min
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-primary">{r.avgPace} /km</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MacroCard({
  title,
  value,
  suffix,
  icon,
}: {
  title: string;
  value: number;
  suffix: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-card/50">
      <CardContent className="p-4 flex flex-col justify-center h-full">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
          {icon} {title}
        </div>
        <div className="font-mono text-3xl font-bold">
          {value}
          <span className="text-lg text-muted-foreground ml-1">{suffix}</span>
        </div>
      </CardContent>
    </Card>
  );
}
