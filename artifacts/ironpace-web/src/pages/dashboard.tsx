import React, { useMemo } from "react";
import { useUserId } from "@/hooks/use-user";
import { useLocalLog } from "@/hooks/use-local-log";
import { UserSetupModal } from "@/components/user-setup-modal";
import { QuickLogModal } from "@/components/quick-log-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Dumbbell, Footprints, Settings2, MonitorSmartphone } from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const { userId, saveUserId, isLoaded } = useUserId();
  const [showChangeUser, setShowChangeUser] = useState(false);
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

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-6">
      <UserSetupModal
        open={!userId || showChangeUser}
        onSave={(id) => {
          saveUserId(id);
          setShowChangeUser(false);
        }}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span className="text-primary uppercase">Iron</span>Pace
            </h1>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              ID: {userId ? `${userId.slice(0, 8)}...` : "None"}
              <button
                onClick={() => setShowChangeUser(true)}
                className="text-primary hover:underline flex items-center gap-1 ml-2"
              >
                <Settings2 className="w-3 h-3" /> Change
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {userId && <QuickLogModal userId={userId} onLogSuccess={refresh} />}
          </div>
        </header>

        {/* Device-local data notice */}
        <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <MonitorSmartphone className="h-3.5 w-3.5 shrink-0" />
          <span>
            Data logged on this device only. Connect your account (coming soon) to sync full history.
          </span>
        </div>

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
                          {w.volumeKg > 0 ? `${w.volumeKg} kg` : "-"}
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
