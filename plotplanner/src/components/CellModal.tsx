import { useState } from "react";
import {
  Modal,
  Stack,
  Text,
  TextInput,
  Textarea,
  Button,
  ScrollArea,
  Loader,
  Box,
  Badge,
  Divider,
} from "@mantine/core";
import type { PlotPlant } from "../hooks/usePlants";
import {
  usePlantSearch,
  usePlantOnCell,
  useRemoveFromCell,
} from "../hooks/usePlants";
import type { Plant } from "../hooks/usePlants";
import { useCreateTimelineEntry } from "../hooks/usePlantTimeline";
import PlantTimeline from "./PlantTimeline";
import AddTimelineEntryForm from "./AddTimelineEntryForm";

interface Props {
  plotId: number;
  col: number;
  row: number;
  plotPlant: PlotPlant | null;
  opened: boolean;
  onClose: () => void;
}

export default function CellModal({
  plotId,
  col,
  row,
  plotPlant,
  opened,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Plant | null>(null);
  const [plantedDate, setPlantedDate] = useState("");
  const [plantedNote, setPlantedNote] = useState("");

  const { data: plants, isLoading } = usePlantSearch(query);
  const plantOnCell = usePlantOnCell(plotId);
  const removeFromCell = useRemoveFromCell(plotId);
  const createTimelineEntry = useCreateTimelineEntry(plotId);

  function close() {
    setQuery("");
    setSelected(null);
    setPlantedDate("");
    setPlantedNote("");
    onClose();
  }

  function handleSelect(plant: Plant) {
    setSelected(plant);
    setQuery(plant.name);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (selected && value !== selected.name) setSelected(null);
  }

  function handlePlant() {
    const body =
      selected?.source === "global"
        ? { plant_id: selected.id, col, row }
        : { name: (selected?.name ?? query).trim(), col, row };

    const date = plantedDate.trim();
    const note = plantedNote.trim();

    plantOnCell.mutate(body, {
      onSuccess: (createdPlotPlant) => {
        if (date || note) {
          createTimelineEntry.mutate({
            plotPlantId: createdPlotPlant.id,
            event_type: "planted",
            event_date: date ? new Date(date).toISOString() : undefined,
            notes: note || undefined,
          });
        }
        close();
      },
    });
  }

  function handleRemove() {
    removeFromCell.mutate({ col, row }, { onSuccess: close });
  }

  const canPlant = selected !== null || query.trim().length > 0;

  const filteredPlants = selected
    ? [] // hide list once a plant is selected from it
    : (plants ?? []);

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={plotPlant ? plotPlant.plant_name : "Plant a crop"}
      centered
      size="lg"
    >
      {plotPlant ? (
        <Stack gap="md">
          <Box className="flex items-center justify-between gap-4">
            <div>
              <Text size="xs" c="dimmed" mb={4}>
                Currently planted
              </Text>
              <Badge color="green" size="lg" radius="sm">
                {plotPlant.plant_name}
              </Badge>
            </div>

            <Button
              variant="light"
              color="red"
              onClick={handleRemove}
              loading={removeFromCell.isPending}
            >
              Remove crop
            </Button>
          </Box>

          <Divider label="Timeline" labelPosition="center" />
          <PlantTimeline plotId={plotId} plotPlantId={plotPlant.id} />

          <Divider />
          <AddTimelineEntryForm plotId={plotId} plotPlantId={plotPlant.id} />
        </Stack>
      ) : (
        <Stack gap="sm">
          <TextInput
            placeholder="Search or type a plant name…"
            value={query}
            onChange={(e) => handleQueryChange(e.currentTarget.value)}
            rightSection={isLoading ? <Loader size="xs" /> : null}
            autoFocus
          />

          {filteredPlants.length > 0 ? (
            <ScrollArea.Autosize mah={150} mih={150}>
              <Stack gap={4}>
                {filteredPlants.map((p) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    justify="left"
                    size="sm"
                    onClick={() => handleSelect(p)}
                    style={{ fontWeight: 400 }}
                  >
                    {p.name}
                  </Button>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          ) : (
            <div className="h-37.5">
              {!isLoading &&
                filteredPlants.length === 0 &&
                query.trim().length > 0 &&
                !selected && (
                  <Text size="sm" c="dimmed">
                    No plants found — "{query.trim()}" will be saved as a custom
                    plant.
                  </Text>
                )}
            </div>
          )}

          <Divider
            mt="xs"
            label="Already planted? (optional)"
            labelPosition="center"
          />
          <Text size="xs" c="dimmed" mt={-4}>
            Leave blank to just reserve the cell — you can log it as planted
            later.
          </Text>
          <TextInput
            type="date"
            label="Planted on"
            value={plantedDate}
            onChange={(e) => setPlantedDate(e.currentTarget.value)}
          />
          <Textarea
            label="Note"
            placeholder="e.g. sowed 3 seeds per hole"
            value={plantedNote}
            onChange={(e) => setPlantedNote(e.currentTarget.value)}
            autosize
            minRows={2}
          />

          <Button
            onClick={handlePlant}
            disabled={!canPlant}
            loading={plantOnCell.isPending}
            mt="xs"
          >
            {selected
              ? `Plant ${selected.name}`
              : query.trim()
                ? `Plant "${query.trim()}"`
                : "Plant"}
          </Button>
        </Stack>
      )}
    </Modal>
  );
}
