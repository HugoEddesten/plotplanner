import { useState } from "react";
import { Select, TextInput, Textarea, Button, Stack, Group, ColorSwatch, Collapse } from "@mantine/core";
import { useCreateTimelineEntry } from "../hooks/usePlantTimeline";
import { EVENT_TYPES, EVENT_LABELS, EVENT_COLORS, type EventType } from "../lib/timelineEvents";

interface Props {
  plotId: number;
  plotPlantId: number;
}

const EVENT_OPTIONS = EVENT_TYPES.map((t) => ({ value: t, label: EVENT_LABELS[t] }));

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AddTimelineEntryForm({ plotId, plotPlantId }: Props) {
  const [opened, setOpened] = useState(false);
  const [eventType, setEventType] = useState<EventType>("comment");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");

  const createEntry = useCreateTimelineEntry(plotId);

  function reset() {
    setEventType("comment");
    setDate(today());
    setNote("");
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
          reset();
          setOpened(false);
        },
      },
    );
  }

  return (
    <Stack gap="xs">
      <Button variant={opened ? "subtle" : "light"} size="xs" onClick={toggle}>
        {opened ? "Cancel" : "+ New entry"}
      </Button>

      <Collapse expanded={opened} transitionDuration={200} transitionTimingFunction="ease">
        <Stack gap="xs" pt={2}>
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
        </Stack>
      </Collapse>
    </Stack>
  );
}
