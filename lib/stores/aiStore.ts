import { create } from "zustand";

export type AiContextType =
  | "dashboard"
  | "episode"
  | "dailies"
  | "vfx"
  | "general";

type AiState = {
  isOpen: boolean;
  context: AiContextType;
  episodeId: string | null;
  showId: string | null;
  showName: string | null;
  orgSlug: string | null;
  showSlug: string | null;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  setContext: (c: AiContextType) => void;
  setShow: (p: {
    showId: string;
    showName: string;
    orgSlug: string;
    showSlug: string;
  }) => void;
  clearShow: () => void;
  setEpisodeId: (id: string | null) => void;
};

export const useAiStore = create<AiState>((set) => ({
  isOpen: false,
  context: "general",
  episodeId: null,
  showId: null,
  showName: null,
  orgSlug: null,
  showSlug: null,
  setOpen: (isOpen) => set({ isOpen }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  setContext: (context) => set({ context }),
  setShow: (p) =>
    set({
      showId: p.showId,
      showName: p.showName,
      orgSlug: p.orgSlug,
      showSlug: p.showSlug,
    }),
  clearShow: () =>
    set({
      showId: null,
      showName: null,
      orgSlug: null,
      showSlug: null,
      episodeId: null,
      context: "general",
    }),
  setEpisodeId: (episodeId) => set({ episodeId }),
}));
