import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export interface TimelineEntry {
  id: number;
  plot_plant_id: number;
  event_type: string;
  event_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function usePlantTimeline(plotId: number, plotPlantId: number | null) {
  return useQuery<TimelineEntry[]>({
    queryKey: ["plots", plotId, "plants", plotPlantId, "timeline"],
    queryFn: () =>
      api
        .get<TimelineEntry[]>(`/plots/${plotId}/plants/${plotPlantId}/timeline`)
        .then((r) => r.data ?? []),
    enabled: plotPlantId != null,
  });
}

export function useCreateTimelineEntry(plotId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      plotPlantId,
      event_type,
      event_date,
      notes,
    }: {
      plotPlantId: number;
      event_type: string;
      event_date?: string;
      notes?: string;
    }) =>
      api
        .post<TimelineEntry>(`/plots/${plotId}/plants/${plotPlantId}/timeline`, {
          event_type,
          event_date,
          notes,
        })
        .then((r) => r.data),
    onSuccess: (entry) =>
      qc.invalidateQueries({ queryKey: ["plots", plotId, "plants", entry.plot_plant_id, "timeline"] }),
  });
}

export function useDeleteTimelineEntry(plotId: number, plotPlantId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) =>
      api.delete(`/plots/${plotId}/plants/${plotPlantId}/timeline/${entryId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["plots", plotId, "plants", plotPlantId, "timeline"] }),
  });
}
