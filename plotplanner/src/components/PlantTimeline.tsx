import { useEffect, useRef, useState } from "react";
import {
  Timeline,
  Text,
  Badge,
  Button,
  ActionIcon,
  Skeleton,
  Stack,
} from "@mantine/core";
import {
  usePlantTimeline,
  useDeleteTimelineEntry,
} from "../hooks/usePlantTimeline";
import { EVENT_LABELS, EVENT_COLORS } from "../lib/timelineEvents";
import { Trash2 } from 'lucide-react';

interface Props {
  plotId: number;
  plotPlantId: number;
  /** Hides per-entry deletion once the plot_plant is archived history. */
  archived?: boolean;
}

const COLLAPSED_COUNT = 3;
const COLLAPSED_HEIGHT = 170;
const EXPANDED_MAX_HEIGHT = 320;
const TRANSITION_MS = 250;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function eventLabel(eventType: string): string {
  return EVENT_LABELS[eventType as keyof typeof EVENT_LABELS] ?? eventType;
}

function eventColor(eventType: string): string {
  return EVENT_COLORS[eventType as keyof typeof EVENT_COLORS] ?? "gray";
}

export default function PlantTimeline({ plotId, plotPlantId, archived }: Props) {
  const { data: entries, isLoading } = usePlantTimeline(plotId, plotPlantId);
  const deleteEntry = useDeleteTimelineEntry(plotId, plotPlantId);
  const [expanded, setExpanded] = useState(false);
  // true once the max-height transition for the current `expanded` value has finished
  const [settled, setSettled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
    };
  }, []);

  if (isLoading) {
    return <Skeleton height={72} radius="md" />;
  }

  if (!entries || entries.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No timeline entries yet.
      </Text>
    );
  }

  const hasMore = entries.length > COLLAPSED_COUNT;

  function toggle() {
    setSettled(false);
    setExpanded((prev) => {
      const next = !prev;
      if (!next && scrollRef.current) scrollRef.current.scrollTop = 0;
      return next;
    });

    if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
    transitionTimeout.current = setTimeout(
      () => setSettled(true),
      TRANSITION_MS,
    );
  }

  const list = (
    <Timeline active={entries.length} bulletSize={14} lineWidth={2}>
      {entries.map((entry) => (
        <Timeline.Item
          key={entry.id}
          title={formatDate(entry.event_date)}
          color={eventColor(entry.event_type)}
          className="group relative"
          style={{ position: "relative" }}
        >
          {!archived && (
            <ActionIcon
              variant="subtle"
              color="red"
              size="md"
              radius="xl"
              aria-label="Delete entry"
              style={{ position: "absolute", top: 0, right: 0 }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              loading={
                deleteEntry.isPending && deleteEntry.variables === entry.id
              }
              onClick={() => deleteEntry.mutate(entry.id)}
            >
              <Trash2 size={16} />
            </ActionIcon>
          )}
          <Badge
            size="xs"
            variant="light"
            color={eventColor(entry.event_type)}
            mb={4}
          >
            {eventLabel(entry.event_type)}
          </Badge>
          {entry.notes && (
            <Text size="sm" c="dimmed">
              {entry.notes}
            </Text>
          )}
        </Timeline.Item>
      ))}
    </Timeline>
  );

  // Fully open and no longer animating — safe to let it scroll and drop the fade.
  const scrollable = expanded && settled;
  const showMask = hasMore && !scrollable;

  return (
    <Stack gap={6}>
      <div
        ref={scrollRef}
        style={
          hasMore
            ? {
                maxHeight: expanded ? EXPANDED_MAX_HEIGHT : COLLAPSED_HEIGHT,
                overflowY: scrollable ? "auto" : "hidden",
                transition: `max-height ${TRANSITION_MS}ms ease`,
                maskImage: showMask
                  ? "linear-gradient(to bottom, black 45%, transparent 95%)"
                  : undefined,
                WebkitMaskImage: showMask
                  ? "linear-gradient(to bottom, black 45%, transparent 95%)"
                  : undefined,
              }
            : undefined
        }
      >
        {list}
      </div>

      {hasMore && (
        <Button
          variant="transparent"
          className="hover:underline"
          onClick={toggle}
        >
          {expanded ? "Show less" : `Show all (${entries.length})`}
        </Button>
      )}
    </Stack>
  );
}
