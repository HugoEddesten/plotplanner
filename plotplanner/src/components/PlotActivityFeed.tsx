import { Text, Badge, Skeleton, Stack, Table } from "@mantine/core";
import { usePlotFeed } from "../hooks/usePlantTimeline";
import { EVENT_LABELS, EVENT_COLORS } from "../lib/timelineEvents";

interface Props {
  plotId: number;
  onSelectCell?: (col: number, row: number) => void;
}

function eventLabel(eventType: string): string {
  return EVENT_LABELS[eventType as keyof typeof EVENT_LABELS] ?? eventType;
}

function eventColor(eventType: string): string {
  return EVENT_COLORS[eventType as keyof typeof EVENT_COLORS] ?? "gray";
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffDays = Math.round((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PlotActivityFeed({ plotId, onSelectCell }: Props) {
  const { data: entries, isLoading } = usePlotFeed(plotId, 8);

  if (isLoading) {
    return (
      <Stack gap="xs">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={32} radius="md" />
        ))}
      </Stack>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <Text size="sm" className="text-muted">
        No activity yet — plant something to get started.
      </Text>
    );
  }

  return (
    <Table verticalSpacing={6} horizontalSpacing="sm" withRowBorders={false}>
      <Table.Tbody>
        {entries.map((entry) => {
          const clickable = !entry.is_archived && !!onSelectCell;

          return (
            <Table.Tr
              key={entry.id}
              onClick={clickable ? () => onSelectCell(entry.col, entry.row) : undefined}
              className={clickable ? "cursor-pointer hover:bg-accent-light rounded-lg! transition-colors" : undefined}
              style={{borderRadius: "16px !important"}}
            >
              <Table.Td w={110}>
                <Badge size="xs" variant="light" color={eventColor(entry.event_type)}>
                  {eventLabel(entry.event_type)}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={600} className="text-primary-dark truncate">
                  {entry.plant_name}
                </Text>
              </Table.Td>
              <Table.Td w={90}>
                {entry.is_archived && (
                  <Text size="xs" className="text-subtle">
                    archived
                  </Text>
                )}
              </Table.Td>
              <Table.Td w={90} ta="right">
                <Text size="xs" className="text-muted">
                  {formatRelative(entry.event_date)}
                </Text>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
