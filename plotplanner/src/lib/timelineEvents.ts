export const EVENT_TYPES = [
  "planted",
  "germinated",
  "watered",
  "fertilized",
  "pruned",
  "pest_disease",
  "harvested",
  "removed",
  "comment",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_LABELS: Record<EventType, string> = {
  planted: "Planted",
  germinated: "Germinated",
  watered: "Watered",
  fertilized: "Fertilized",
  pruned: "Pruned",
  pest_disease: "Pest / disease",
  harvested: "Harvested",
  removed: "Removed",
  comment: "Note",
};

export const EVENT_COLORS: Record<EventType, string> = {
  planted: "green",
  germinated: "teal",
  watered: "blue",
  fertilized: "grape",
  pruned: "orange",
  pest_disease: "red",
  harvested: "yellow",
  removed: "gray",
  comment: "gray",
};
