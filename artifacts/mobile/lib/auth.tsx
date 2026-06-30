import { useAuth as useClerkAuth } from "@clerk/expo";

export interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  clerkUserId: string | null;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthContextValue {
  const { isSignedIn, isLoaded, userId, signOut } = useClerkAuth();

  return {
    isLoading: !isLoaded,
    isAuthenticated: isSignedIn === true,
    clerkUserId: userId ?? null,
    signOut,
  };
}
