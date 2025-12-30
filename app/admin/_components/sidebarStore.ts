type SidebarState = {
  collapsed: boolean;
  sections: Record<string, boolean>;
};

const SIDEBAR_COLLAPSED_KEY = "admin.sidebar.collapsed";
const SIDEBAR_SECTIONS_KEY = "admin.sidebar.sections";
const SSR_SNAPSHOT: SidebarState = Object.freeze({
  collapsed: false,
  sections: Object.freeze({}) as Record<string, boolean>,
});

const listeners = new Set<() => void>();
let state: SidebarState = { collapsed: false, sections: {} };
let hydrated = false;
let snapshot: SidebarState = state;

const notify = () => {
  listeners.forEach((listener) => listener());
};

const isSameSections = (
  next: Record<string, boolean>,
  prev: Record<string, boolean>,
) => {
  const nextKeys = Object.keys(next);
  const prevKeys = Object.keys(prev);
  if (nextKeys.length !== prevKeys.length) return false;
  return nextKeys.every((key) => next[key] === prev[key]);
};

const updateState = (next: SidebarState) => {
  if (next.collapsed === state.collapsed && isSameSections(next.sections, state.sections)) {
    return;
  }
  state = next;
  snapshot = state;
  notify();
};

const readFromStorage = (): SidebarState => {
  if (typeof window === "undefined") return state;
  const storedCollapsed = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  const isSmallScreen = window.innerWidth < 640;
  const collapsed =
    storedCollapsed === "true" || (storedCollapsed === null && isSmallScreen);

  const storedSections = window.localStorage.getItem(SIDEBAR_SECTIONS_KEY);
  if (!storedSections) {
    return { collapsed, sections: {} };
  }
  try {
    return {
      collapsed,
      sections: JSON.parse(storedSections) as Record<string, boolean>,
    };
  } catch {
    return { collapsed, sections: {} };
  }
};

const hydrate = () => {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  updateState(readFromStorage());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_COLLAPSED_KEY || event.key === SIDEBAR_SECTIONS_KEY) {
      updateState(readFromStorage());
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
};

const getSnapshot = () => snapshot;

const getServerSnapshot = () => SSR_SNAPSHOT;

const setCollapsed = (nextCollapsed: boolean) => {
  if (typeof window === "undefined") return;
  if (nextCollapsed === state.collapsed) return;
  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(nextCollapsed));
  updateState({ collapsed: nextCollapsed, sections: state.sections });
};

const toggleSection = (title: string) => {
  if (typeof window === "undefined") return;
  const currentOpen = state.sections[title] !== false;
  const nextSections = { ...state.sections, [title]: !currentOpen };
  window.localStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify(nextSections));
  updateState({ collapsed: state.collapsed, sections: nextSections });
};

export const sidebarStore = {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  hydrate,
  setCollapsed,
  toggleSection,
};

export type { SidebarState };
