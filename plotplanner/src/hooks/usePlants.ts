import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export interface Plant {
  id: number;
  name: string;
  source: "global" | "user";
  created_at: string;
  updated_at: string;
}

export interface PlotPlant {
  id: number;
  plot_id: number;
  plant_id: number | null;
  user_plant_id: number | null;
  col: number;
  row: number;
  plant_name: string;
  created_at: string;
  updated_at: string;
}

export function usePlantSearch(query: string) {
  return useQuery<Plant[]>({
    queryKey: ["plants", query],
    queryFn: () =>
      api.get<Plant[]>("/plants", { params: { q: query } }).then((r) => r.data ?? []),
    staleTime: 30_000,
  });
}

export function usePlotPlants(plotId: number) {
  return useQuery<PlotPlant[]>({
    queryKey: ["plots", plotId, "plants"],
    queryFn: () =>
      api.get<PlotPlant[]>(`/plots/${plotId}/plants`).then((r) => r.data ?? []),
  });
}

export function usePlantOnCell(plotId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { plant_id?: number; name?: string; col: number; row: number }) =>
      api.post<PlotPlant>(`/plots/${plotId}/plants`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plots", plotId, "plants"] }),
  });
}

export function useRemoveFromCell(plotId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ col, row }: { col: number; row: number }) =>
      api.delete(`/plots/${plotId}/plants`, { params: { col, row } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plots", plotId, "plants"] }),
  });
}
