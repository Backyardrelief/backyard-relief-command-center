import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

export default function useUnreadSmsCount() {
  const [unreadCount, setUnreadCount] =
    useState(0);

  const loadUnreadCount = useCallback(
    async () => {
      const {
        count,
        error,
      } = await supabase
        .from("sms_messages")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("direction", "inbound")
        .eq("is_read", false);

      if (error) {
        console.error(
          "Could not load unread SMS count:",
          error
        );

        return;
      }

      setUnreadCount(count ?? 0);
    },
    []
  );

  useEffect(() => {
    loadUnreadCount();

    const channel = supabase
      .channel("global-unread-sms-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sms_messages",
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadUnreadCount]);

  return unreadCount;
}