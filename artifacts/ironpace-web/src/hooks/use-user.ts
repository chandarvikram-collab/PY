import { useState, useEffect } from "react";

export function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("ironpace_user_id");
    if (stored) {
      setUserId(stored);
    }
    setIsLoaded(true);
  }, []);

  const saveUserId = (id: string) => {
    localStorage.setItem("ironpace_user_id", id);
    setUserId(id);
  };

  return { userId, saveUserId, isLoaded };
}
