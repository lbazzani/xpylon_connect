import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import type { Conversation } from "@xpylon/shared";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.get("/conversations");
      setConversations(data.conversations);
    } catch {
      // handle error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return { conversations, isLoading, refetch: fetchConversations };
}
