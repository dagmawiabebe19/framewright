import { useAiStore, type AiContextType } from "@/lib/stores/aiStore";
import { useEffect } from "react";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useAiPathSync(pathname: string | null) {
  useEffect(() => {
    if (!pathname) return;
    const hide =
      pathname.startsWith("/auth") || pathname.startsWith("/onboarding");
    if (hide) {
      useAiStore.getState().clearShow();
      return;
    }

    const parts = pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      useAiStore.getState().clearShow();
      return;
    }

    const [orgSlug, showSlug, ...rest] = parts;
    if (
      [
        "dashboard",
        "api",
        "tools",
        "_next",
        "icon",
        "auth",
        "onboarding",
        "favicon.ico",
      ].includes(orgSlug)
    ) {
      useAiStore.getState().clearShow();
      return;
    }

    const sub = rest.join("/");
    let context: AiContextType = "dashboard";
    let pathEpisodeId: string | null = null;

    if (rest[0] === "episodes" && rest[1] && UUID.test(rest[1])) {
      context = "episode";
      pathEpisodeId = rest[1];
    } else if (sub.startsWith("editorial/dailies")) {
      context = "dailies";
    } else if (sub.startsWith("vfx/shots")) {
      context = "vfx";
    }

    useAiStore.getState().setContext(context);
    if (pathEpisodeId) {
      useAiStore.getState().setEpisodeId(pathEpisodeId);
    } else if (context !== "dailies") {
      useAiStore.getState().setEpisodeId(null);
    }
    // orgSlug/showSlug are wired from AiShowBootstrap; path-only sync skips show id
  }, [pathname]);
}
