import { useLocation } from 'wouter';
import { Dumbbell, Zap, BarChart3, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-1">
          <span className="text-primary">Iron</span>Pace
        </h1>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => setLocation('/sign-in')}
            className="text-muted-foreground hover:text-foreground"
          >
            Log in
          </Button>
          <Button
            onClick={() => setLocation('/sign-up')}
            className="bg-primary text-primary-foreground font-bold hover:bg-primary/90"
          >
            Get started
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-none border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            <Zap className="h-3 w-3" /> Track. Train. Dominate.
          </div>
          <h2 className="text-5xl font-black leading-none tracking-tight md:text-6xl">
            Your fitness data,{' '}
            <span className="text-primary">one dashboard.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Connect your IronPace mobile account to view workouts, runs, nutrition, and leaderboard stats — all in one place.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() => setLocation('/sign-up')}
              className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 px-8"
            >
              Create account
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation('/sign-in')}
              className="border-border font-bold px-8"
            >
              Sign in
            </Button>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="border-t border-border px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <Dumbbell className="h-6 w-6 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-widest">Workout History</h3>
            <p className="text-sm text-muted-foreground">
              View every lift, set, and rep from your IronPace sessions across all devices.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-widest">Nutrition Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Monitor daily macros, calories, and meal logs synced from your mobile app.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-widest">Leaderboard</h3>
            <p className="text-sm text-muted-foreground">
              See how you rank against other IronPace athletes in real time.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} IronPace. All rights reserved.
      </footer>
    </div>
  );
}
