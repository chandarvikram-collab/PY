import { Plus, Trash2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { type UseFormReturn } from "react-hook-form";
import { type z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { foodSchema, workoutSchema, runSchema } from "@/lib/schemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLogFoodEntry, useLogWorkoutSession, useLogRunSession } from "@workspace/api-client-react";
import {
  addLocalFoodEntry,
  addLocalWorkoutSession,
  addLocalRunSession,
} from "@/hooks/use-local-log";

type FoodFormValues = z.infer<typeof foodSchema>;
type WorkoutFormValues = z.infer<typeof workoutSchema>;
type RunFormValues = z.infer<typeof runSchema>;

export function QuickLogModal({
  userId,
  onLogSuccess,
}: {
  userId: string;
  onLogSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("food");

  const logFood = useLogFoodEntry();
  const logWorkout = useLogWorkoutSession();
  const logRun = useLogRunSession();

  const handleSuccess = () => {
    onLogSuccess();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" className="h-10 w-10 shrink-0">
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Log</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="food">Food</TabsTrigger>
            <TabsTrigger value="workout">Workout</TabsTrigger>
            <TabsTrigger value="run">Run</TabsTrigger>
          </TabsList>

          <TabsContent value="food" className="mt-4">
            <FoodForm
              onSubmit={(data) => {
                logFood.mutate(
                  { userId, data },
                  {
                    onSuccess: (result) => {
                      // Save to local log for immediate dashboard display
                      const id =
                        result && typeof result === "object" && "id" in result
                          ? String(result.id)
                          : crypto.randomUUID();
                      addLocalFoodEntry({
                        id,
                        date: data.date,
                        meal: data.meal,
                        name: data.name,
                        calories: data.calories,
                        protein: data.protein,
                        carbs: data.carbs,
                        fat: data.fat,
                      });
                      handleSuccess();
                    },
                  },
                );
              }}
              isPending={logFood.isPending}
              error={logFood.error?.message}
            />
          </TabsContent>

          <TabsContent value="workout" className="mt-4">
            <WorkoutForm
              onSubmit={(data) => {
                const durationSeconds = data.durationMinutes * 60;
                let volumeKg = 0;
                const exerciseLogJson = data.exercises.map((ex) => {
                  ex.sets.forEach((set) => {
                    volumeKg += set.weight * set.reps;
                  });
                  return { name: ex.name, category: ex.category, sets: ex.sets };
                });
                const pointsEarned = Math.floor(durationSeconds / 60);

                logWorkout.mutate(
                  {
                    data: {
                      userId,
                      name: data.name,
                      date: data.date,
                      durationSeconds,
                      volumeKg,
                      exerciseCount: exerciseLogJson.length,
                      exerciseLogJson: exerciseLogJson as unknown as Record<string, unknown>,
                      pointsEarned,
                    },
                  },
                  {
                    onSuccess: (result) => {
                      const id =
                        result &&
                        typeof result === "object" &&
                        "session" in result &&
                        result.session &&
                        typeof result.session === "object" &&
                        "id" in result.session
                          ? String(result.session.id)
                          : crypto.randomUUID();
                      addLocalWorkoutSession({
                        id,
                        name: data.name,
                        date: data.date,
                        durationSeconds,
                        volumeKg,
                        exerciseCount: exerciseLogJson.length,
                        pointsEarned,
                      });
                      handleSuccess();
                    },
                  },
                );
              }}
              isPending={logWorkout.isPending}
              error={logWorkout.error?.message}
            />
          </TabsContent>

          <TabsContent value="run" className="mt-4">
            <RunForm
              onSubmit={(data) => {
                const durationSeconds = data.durationMinutes * 60;
                let avgPace = data.avgPace ?? "";
                if (!avgPace && data.distanceKm > 0) {
                  const paceSeconds = durationSeconds / data.distanceKm;
                  const mm = Math.floor(paceSeconds / 60);
                  const ss = Math.floor(paceSeconds % 60).toString().padStart(2, "0");
                  avgPace = `${mm}:${ss}`;
                }
                const pointsEarned = Math.floor(data.distanceKm * 10);

                logRun.mutate(
                  {
                    data: {
                      userId,
                      date: data.date,
                      distanceKm: data.distanceKm,
                      durationSeconds,
                      avgPace,
                      calories: data.calories ?? undefined,
                      pointsEarned,
                    },
                  },
                  {
                    onSuccess: (result) => {
                      const id =
                        result &&
                        typeof result === "object" &&
                        "session" in result &&
                        result.session &&
                        typeof result.session === "object" &&
                        "id" in result.session
                          ? String(result.session.id)
                          : crypto.randomUUID();
                      addLocalRunSession({
                        id,
                        date: data.date,
                        distanceKm: data.distanceKm,
                        durationSeconds,
                        avgPace,
                        calories: data.calories ?? 0,
                        pointsEarned,
                      });
                      handleSuccess();
                    },
                  },
                );
              }}
              isPending={logRun.isPending}
              error={logRun.error?.message}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MutationError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function FoodForm({
  onSubmit,
  isPending,
  error,
}: {
  onSubmit: (data: FoodFormValues) => void;
  isPending: boolean;
  error?: string;
}) {
  const form = useForm<FoodFormValues>({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      meal: "Breakfast",
      name: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="meal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meal</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select meal" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Breakfast">Breakfast</SelectItem>
                    <SelectItem value="Lunch">Lunch</SelectItem>
                    <SelectItem value="Dinner">Dinner</SelectItem>
                    <SelectItem value="Snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Food Name</FormLabel>
              <FormControl>
                <Input placeholder="Oatmeal, Chicken, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-4 gap-2">
          <FormField
            control={form.control}
            name="calories"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cal</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="protein"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pro (g)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="carbs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Carb (g)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fat (g)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <MutationError message={error} />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving..." : "Log Food"}
        </Button>
      </form>
    </Form>
  );
}

type WorkoutFormType = UseFormReturn<WorkoutFormValues>;

function WorkoutForm({
  onSubmit,
  isPending,
  error,
}: {
  onSubmit: (data: WorkoutFormValues) => void;
  isPending: boolean;
  error?: string;
}) {
  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      name: "",
      durationMinutes: 60,
      exercises: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (min)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workout Name</FormLabel>
              <FormControl>
                <Input placeholder="Leg Day, Push, etc." {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
            <FormLabel className="text-muted-foreground">Exercises (Optional)</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: "", sets: [{ weight: 0, reps: 0 }] })}
            >
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="border border-border p-3 space-y-3 relative group">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => remove(index)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>

              <FormField
                control={form.control}
                name={`exercises.${index}.name` as const}
                render={({ field: nameField }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Exercise name..." {...nameField} className="h-8" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <SetsEditor form={form} exerciseIndex={index} />
            </div>
          ))}
        </div>

        <MutationError message={error} />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving..." : "Log Workout"}
        </Button>
      </form>
    </Form>
  );
}

function SetsEditor({
  form,
  exerciseIndex,
}: {
  form: WorkoutFormType;
  exerciseIndex: number;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `exercises.${exerciseIndex}.sets` as const,
  });

  return (
    <div className="space-y-2 pl-2">
      {fields.map((set, setIndex) => (
        <div key={set.id} className="flex gap-2 items-center">
          <div className="text-xs text-muted-foreground w-4">{setIndex + 1}</div>
          <FormField
            control={form.control}
            name={`exercises.${exerciseIndex}.sets.${setIndex}.weight` as const}
            render={({ field }) => (
              <FormItem className="flex-1 space-y-0">
                <FormControl>
                  <Input type="number" placeholder="kg" {...field} className="h-7 text-xs" />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="text-xs text-muted-foreground">x</div>
          <FormField
            control={form.control}
            name={`exercises.${exerciseIndex}.sets.${setIndex}.reps` as const}
            render={({ field }) => (
              <FormItem className="flex-1 space-y-0">
                <FormControl>
                  <Input type="number" placeholder="reps" {...field} className="h-7 text-xs" />
                </FormControl>
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => remove(setIndex)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 text-xs text-primary"
        onClick={() => append({ weight: 0, reps: 0 })}
      >
        + Add Set
      </Button>
    </div>
  );
}

function RunForm({
  onSubmit,
  isPending,
  error,
}: {
  onSubmit: (data: RunFormValues) => void;
  isPending: boolean;
  error?: string;
}) {
  const form = useForm<RunFormValues>({
    resolver: zodResolver(runSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      distanceKm: 5,
      durationMinutes: 30,
      avgPace: "",
      calories: 0,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="distanceKm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Distance (km)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (min)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="avgPace"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pace (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="mm:ss" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="calories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Calories (optional)</FormLabel>
              <FormControl>
                <Input type="number" {...field} value={field.value ?? ""} />
              </FormControl>
            </FormItem>
          )}
        />
        <MutationError message={error} />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving..." : "Log Run"}
        </Button>
      </form>
    </Form>
  );
}
