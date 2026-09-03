"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getOrCreateDeviceId } from "../lib/deviceId";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  ownershipVersion: number;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (confirmationEmail: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function claimDeviceProducts(session: Session) {
  const response = await fetch("/api/auth/claim", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ deviceId: getOrCreateDeviceId() }),
  });

  if (!response.ok) {
    throw new Error("Could not link browser products to this account");
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ownershipVersion, setOwnershipVersion] = useState(0);
  const claimedUserId = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    async function applySession(nextSession: Session | null) {
      if (!active) return;

      setSession(nextSession);

      if (nextSession?.user.id && claimedUserId.current !== nextSession.user.id) {
        claimedUserId.current = nextSession.user.id;

        try {
          await claimDeviceProducts(nextSession);
          setOwnershipVersion((version) => version + 1);
        } catch (error) {
          claimedUserId.current = null;
          console.error("Could not claim anonymous products:", error);
        }
      }

      setIsLoading(false);
    }

    void supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.access_token ?? null,
      isLoading,
      ownershipVersion,
      async sendMagicLink(email: string) {
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;
      },
      async signOut() {
        const supabase = getSupabaseBrowserClient();
        const deviceId = getOrCreateDeviceId();

        if (session?.access_token) {
          try {
            await fetch("/api/push/subscribe", {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ deviceId }),
            });
          } catch (error) {
            console.error("Could not detach push alerts during sign-out:", error);
          }
        }

        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        claimedUserId.current = null;
        setOwnershipVersion((version) => version + 1);
      },
      async deleteAccount(confirmationEmail: string) {
        const supabase = getSupabaseBrowserClient();

        if (!session?.access_token) {
          throw new Error("Sign in again before deleting this account.");
        }

        const response = await fetch("/api/account", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ confirmationEmail }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not delete the account.");
        }

        try {
          const registration = await navigator.serviceWorker?.getRegistration();
          const subscription = await registration?.pushManager.getSubscription();
          await subscription?.unsubscribe();
        } catch (error) {
          console.error("Could not remove the local push subscription:", error);
        }

        window.localStorage.removeItem("tracked-products");
        await supabase.auth.signOut({ scope: "local" });
        claimedUserId.current = null;
        setSession(null);
        setOwnershipVersion((version) => version + 1);
      },
    }),
    [isLoading, ownershipVersion, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
