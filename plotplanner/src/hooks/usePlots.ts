import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export interface Point {
  x: number;
  y: number;
}

export interface Plot {
  id: number;
  name: string;
  shape: Point[];
  created_at: string;
  updated_at: string;
}

export function usePlots() {
  return useQuery<Plot[]>({
    queryKey: ["plots"],
    queryFn: () => api.get<Plot[]>("/plots").then((r) => r.data),
  });
}

export function usePlot(id: number) {
  return useQuery<Plot>({
    queryKey: ["plots", id],
    queryFn: () => api.get<Plot>(`/plots/${id}`).then((r) => r.data),
  });
}

export function useCreatePlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, shape }: { name: string; shape: Point[] }) =>
      api.post("/plots", { name, shape }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plots"] }),
  });
}
