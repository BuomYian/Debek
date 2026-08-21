"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { signOut } from "@/actions/auth";

/**
 * Section 5.1: "Session timeout after inactivity." 30 minutes idle,
 * with a toast warning a minute before — long enough not to interrupt a
 * receptionist mid-shift, short enough that a browser left unlocked at
 * an unattended desk doesn't stay signed in all day.
 */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;

export function SessionTimeoutHandler() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearTimers() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    }

    function reset() {
      clearTimers();
      warningRef.current = setTimeout(() => {
        toast.warning("You'll be signed out in 1 minute due to inactivity.", {
          duration: WARNING_BEFORE_MS,
        });
      }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
      timeoutRef.current = setTimeout(() => {
        void signOut();
      }, IDLE_TIMEOUT_MS);
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, reset, { passive: true });
    }
    reset();

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, reset);
      }
    };
  }, []);

  return null;
}
