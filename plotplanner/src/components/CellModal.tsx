import { useRef, useState } from "react";
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
  Group,
  Menu,
  ActionIcon,
} from "@mantine/core";
import { Archive, MoreVertical, Trash2 } from "lucide-react";
import type { PlotPlant } from "../hooks/usePlants";
import {
  usePlantSearch,
  usePlantOnCell,
  useRemoveFromCell,
  useArchivePlotPlant,
} from "../hooks/usePlants";
import type { Plant } from "../hooks/usePlants";
import { useCreateTimelineEntry } from "../hooks/usePlantTimeline";
import PlantTimeline from "./PlantTimeline";
import AddTimelineEntryForm from "./AddTimelineEntryForm";
import ArchiveFlyClone from "./ArchiveFlyClone";

interface Props {
  plotId: number;
  col: number;
  row: number;
  plotPlant: PlotPlant | null;
  opened: boolean;
  onClose: () => void;
  /** Where the archive-fold animation flies toward — the plot's History button. */
  archiveFlightTargetRef?: React.RefObject<HTMLButtonElement | null>;
}

export default function CellModal({
  plotId,
  col,
  row,
  plotPlant,
  opened,
  onClose,
  archiveFlightTargetRef,
}: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Plant | null>(null);
  const [plantedDate, setPlantedDate] = useState("");
  const [plantedNote, setPlantedNote] = useState("");
  const [flight, setFlight] = useState<{
    fromRect: DOMRect;
    toRect: DOMRect;
    plantName: string;
  } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: plants, isLoading } = usePlantSearch(query);
  const plantOnCell = usePlantOnCell(plotId);
  const removeFromCell = useRemoveFromCell(plotId);
  const archivePlant = useArchivePlotPlant(plotId);
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

  function handleArchive() {
    if (!plotPlant) return;

    const fromEl = cardRef.current;
    const toEl = archiveFlightTargetRef?.current;

    if (fromEl && toEl) {
      setFlight({
        fromRect: fromEl.getBoundingClientRect(),
        toRect: toEl.getBoundingClientRect(),
        plantName: plotPlant.plant_name,
      });
      archivePlant.mutate(plotPlant.id);
    } else {
      // No target to fly toward (e.g. ref not mounted) — fall back to a plain close.
      archivePlant.mutate(plotPlant.id, { onSuccess: close });
    }
  }

  function handleFlightDone() {
    setFlight(null);

    const target = archiveFlightTargetRef?.current;
    if (
      target &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      target.classList.add("archive-landing-pulse");
      target.addEventListener(
        "animationend",
        () => target.classList.remove("archive-landing-pulse"),
        { once: true },
      );
    }

    close();
  }

  const canPlant = selected !== null || query.trim().length > 0;

  const filteredPlants = selected
    ? [] // hide list once a plant is selected from it
    : (plants ?? []);

  return (
    <>
      <Modal
        // The flying clone is a sibling portal, not a child of this Modal, so
        // it doesn't depend on the Modal staying open — close it immediately
        // once a flight starts rather than trying to hide its paper in place.
        opened={opened && !flight}
        onClose={close}
        title={
          <div className="font-semibold text-lg w-full">
            {plotPlant ? plotPlant.plant_name : "Plant a crop"}
            <Divider />
          </div>
        }
        centered
        size="lg"
        transitionProps={flight ? { duration: 0 } : undefined}
      >
        {plotPlant ? (
          <Stack gap="md" ref={cardRef}>
            <Box className="flex items-center justify-between gap-4">
              <div>
                <Text size="xs" c="dimmed" mb={4}>
                  Currently planted
                </Text>
                <Badge color="green" size="lg" radius="sm">
                  {plotPlant.plant_name}
                </Badge>
              </div>

              <Group gap={4} wrap="nowrap">
                <Button
                  variant="light"
                  color="orange"
                  leftSection={<Archive size={16} />}
                  onClick={handleArchive}
                  loading={archivePlant.isPending}
                >
                  Archive
                </Button>

                <Menu shadow="md" width={180} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label="More options"
                    >
                      <MoreVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      color="red"
                      leftSection={<Trash2 size={14} />}
                      
                      onClick={handleRemove}
                      disabled={removeFromCell.isPending}
                    >
                      Remove crop
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Box>

            <Divider label="Timeline" labelPosition="center" />
            <PlantTimeline plotId={plotId} plotPlantId={plotPlant.id} />

            <Divider />
            <AddTimelineEntryForm
              plotId={plotId}
              plotPlantId={plotPlant.id}
              onRequestArchive={handleArchive}
              archiving={archivePlant.isPending}
            />
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
              <ScrollArea.Autosize mah={160} mih={160}>
                <Stack gap={4}>
                  {filteredPlants.map((p) => (
                    <Button
                      key={p.id}
                      variant="outline"
                      justify="left"
                      size="sm"
                      onClick={() => handleSelect(p)}
                      style={{ fontWeight: 400, textDecoration: "underline" }}
                      
                    >
                      {p.name}
                    </Button>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            ) : (
              <div className="h-40">
                {!isLoading &&
                  filteredPlants.length === 0 &&
                  query.trim().length > 0 &&
                  !selected && (
                    <Text size="sm" c="dimmed">
                      No plants found — "{query.trim()}" will be saved as a
                      custom plant.
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

      {flight && (
        <ArchiveFlyClone
          fromRect={flight.fromRect}
          toRect={flight.toRect}
          plantName={flight.plantName}
          onDone={handleFlightDone}
        />
      )}
    </>
  );
}
