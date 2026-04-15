// Re-export from mockData for convenience; extend here as the backend grows.
export type { Genre, ContentType, Title } from "@/data/mockData";

export interface NavLink {
  label: string;
  href: string;
}

export interface FilterOption {
  label: string;
  value: string;
}
