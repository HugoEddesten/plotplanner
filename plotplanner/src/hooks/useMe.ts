import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

interface Me {
  userId: number;
  email: string;
}

export function useMe() {
  return useQuery<Me>({
    queryKey: ["me"],
    queryFn: () => api.get<Me>("/auth/me").then((r) => r.data),
    retry: false,
  });
}
