// ============================================
// store/auth.store.ts
// ============================================

import { create } from "zustand";

type AuthState = {
  session: any;
  user: any;
  setSession: (session: any) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  clearSession: () => set({ session: null, user: null }),
}));
