import { useState } from "react";
import { Select, TextInput, Textarea, Button, Stack, Group, ColorSwatch, Collapse, Alert, Text } from "@mantine/core";
import { Archive } from "lucide-react";
import { useCreateTimelineEntry } from "../hooks/usePlantTimeline";
import { EVENT_TYPES, EVENT_LABELS, EVENT_COLORS, type EventType } from "../lib/timelineEvents";

interface Props {
  plotId: number;
  plotPlantId: number;
  /**
   * Requests that the parent archive this plot_plant. The mutation is owned
   * by the parent (CellModal) rather than this form because archiving
   * invalidates the active-plants list, which un-renders this form before
   * its own mutation callback would get a chance to fire.
   */
  onRequestArchive: () => void;
  archiving?: boolean;
}

const EVENT_OPTIONS = EVENT_TYPES.map((t) => ({ value: t, label: EVENT_LABELS[t] }));

// Logging one of these event types is a strong hint the crop is done, so we
// offer to archive it right away instead of leaving that as a separate step.
const ARCHIVE_PROMPT_TYPES: EventType[] = ["harvested", "removed"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AddTimelineEntryForm({ plotId, plotPlantId, onRequestArchive, archiving }: Props) {
  const [opened, setOpened] = useState(false);
  const [eventType, setEventType] = useState<EventType>("comment");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [confirmArchive, setConfirmArchive] = useState(false);

  const createEntry = useCreateTimelineEntry(plotId);

  function reset() {
    setEventType("comment");
    setDate(today());
    setNote("");
    setConfirmArchive(false);
  }

  function toggle() {
    if (opened) reset();
    setOpened((v) => !v);
  }

  function handleSubmit() {
    const trimmedNote = note.trim();

    createEntry.mutate(
      {
        plotPlantId,
        event_type: eventType,
        event_date: date ? new Date(date).toISOString() : undefined,
        notes: trimmedNote || undefined,
      },
      {
        onSuccess: () => {
          if (ARCHIVE_PROMPT_TYPES.includes(eventType)) {
            setConfirmArchive(true);
          } else {
            reset();
            setOpened(false);
          }
        },
      },
    );
  }

  function keepActive() {
    reset();
    setOpened(false);
  }

  return (
    <Stack gap="xs">
      <Button variant={opened ? "subtle" : "light"} size="xs" onClick={toggle}>
        {opened ? "Cancel" : "+ New entry"}
      </Button>

      <Collapse expanded={opened} transitionDuration={200} transitionTimingFunction="ease">
        <Stack gap="xs" pt={2}>
          {confirmArchive ? (
            <Alert color="orange" title="Archive this plant?" icon={<Archive size={16} />}>
              <Stack gap="xs">
                <Text size="sm">
                  This moves it to the plot's history and frees the cell up for something new. You can still view
                  its timeline afterwards.
                </Text>
                <Group gap="xs">
                  <Button size="xs" color="orange" onClick={onRequestArchive} loading={archiving}>
                    Archive it
                  </Button>
                  <Button size="xs" variant="subtle" onClick={keepActive} disabled={archiving}>
                    Keep active
                  </Button>
                </Group>
              </Stack>
            </Alert>
          ) : (
            <>
              <Select
                label="Type"
                data={EVENT_OPTIONS}
                value={eventType}
                onChange={(value) => value && setEventType(value as EventType)}
                allowDeselect={false}
                leftSection={<ColorSwatch color={`var(--mantine-color-${EVENT_COLORS[eventType]}-6)`} size={12} />}
                renderOption={({ option }) => (
                  <Group gap="xs" wrap="nowrap">
                    <ColorSwatch
                      color={`var(--mantine-color-${EVENT_COLORS[option.value as EventType]}-6)`}
                      size={12}
                    />
                    {option.label}
                  </Group>
                )}
              />
              <TextInput
                type="date"
                label="Date"
                value={date}
                onChange={(e) => setDate(e.currentTarget.value)}
              />
              <Textarea
                label="Note"
                placeholder="Optional details…"
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
                autosize
                minRows={2}
              />
              <Button onClick={handleSubmit} loading={createEntry.isPending} size="sm">
                Add entry
              </Button>
            </>
          )}
        </Stack>
      </Collapse>
    </Stack>
  );
}
