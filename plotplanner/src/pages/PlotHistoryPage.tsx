import { useMemo, useState } from "react";
import { Container, Text, Title, Button, Skeleton, TextInput, Select, Badge, Accordion, Group } from "@mantine/core";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { usePlot } from "../hooks/usePlots";
import { useArchivedPlotPlants } from "../hooks/usePlants";
import type { PlotPlant } from "../hooks/usePlants";
import PlantTimeline from "../components/PlantTimeline";

type SortOption = "recent" | "oldest" | "name" | "position";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Recently archived" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Plant name (A–Z)" },
  { value: "position", label: "Cell position" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function sortPlotPlants(list: PlotPlant[], sort: SortOption): PlotPlant[] {
  const sorted = [...list];
  switch (sort) {
    case "recent":
      return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    case "oldest":
      return sorted.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
    case "name":
      return sorted.sort((a, b) => a.plant_name.localeCompare(b.plant_name));
    case "position":
      return sorted.sort((a, b) => a.row - b.row || a.col - b.col);
  }
}

export default function PlotHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plotId = Number(id);

  const { data: plot } = usePlot(plotId);
  const { data: archived, isLoading } = useArchivedPlotPlants(plotId);

  const [search, setSearch] = useState("");
  const [year, setYear] = useState("all");
  const [sort, setSort] = useState<SortOption>("recent");

  const years = useMemo(() => {
    const set = new Set<string>();
    archived?.forEach((pp) => set.add(new Date(pp.updated_at).getFullYear().toString()));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [archived]);

  const filtered = useMemo(() => {
    let list = archived ?? [];
    if (year !== "all") {
      list = list.filter((pp) => new Date(pp.updated_at).getFullYear().toString() === year);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((pp) => pp.plant_name.toLowerCase().includes(q));
    }
    return sortPlotPlants(list, sort);
  }, [archived, search, year, sort]);

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <header
        className="sticky top-0 z-50 border-b border-[--color-border] backdrop-blur-md"
        style={{ background: "color-mix(in srgb, var(--earth-50) 90%, transparent)" }}
      >
        <Container size="lg">
          <div className="flex items-center justify-between py-4">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <span className="text-xl">🌾</span>
              <Text fw={700} size="lg" className="text-primary" style={{ letterSpacing: "-0.3px" }}>
                PlotPlanner
              </Text>
            </Link>
            <Button
              variant="subtle"
              size="sm"
              radius="xl"
              className="text-muted!"
              onClick={() => navigate(`/plots/${plotId}`)}
            >
              ← Back to plot
            </Button>
          </div>
        </Container>
      </header>

      <Container py={48}>
        <Title order={2} className="text-primary-dark" mb={4} style={{ letterSpacing: "-0.5px" }}>
          {plot ? `${plot.name} — history` : "Plot history"}
        </Title>
        <Text size="sm" c="dimmed" mb="lg">
          Everything archived from this plot — harvested, removed, or otherwise cleared. Expand an entry to see its
          full timeline.
        </Text>

        <Group mb="lg" gap="sm" wrap="wrap">
          <TextInput
            placeholder="Search by plant name…"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<Search size={14} />}
            style={{ flex: 1, minWidth: 220 }}
          />
          <Select
            data={[{ value: "all", label: "All years" }, ...years.map((y) => ({ value: y, label: y }))]}
            value={year}
            onChange={(v) => v && setYear(v)}
            allowDeselect={false}
            w={140}
          />
          <Select
            data={SORT_OPTIONS}
            value={sort}
            onChange={(v) => v && setSort(v as SortOption)}
            allowDeselect={false}
            w={200}
          />
        </Group>

        {isLoading && <Skeleton height={200} radius="md" />}

        {!isLoading && filtered.length === 0 && (
          <Text c="dimmed" size="sm">
            {archived && archived.length > 0
              ? "No history matches your filters."
              : "Nothing archived yet — plants you archive from the plot will show up here."}
          </Text>
        )}

        {filtered.length > 0 && (
          <Accordion variant="separated" radius="md">
            {filtered.map((pp) => (
              <Accordion.Item key={pp.id} value={String(pp.id)}>
                <Accordion.Control>
                  <Group justify="space-between" wrap="nowrap" pr="sm">
                    <Group gap="sm" wrap="nowrap">
                      <Badge color="green" variant="light" size="lg" radius="sm">
                        {pp.plant_name}
                      </Badge>
                      <Text size="sm" c="dimmed">
                        Col {pp.col + 1}, Row {pp.row + 1}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Archived {formatDate(pp.updated_at)}
                    </Text>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <PlantTimeline plotId={plotId} plotPlantId={pp.id} archived />
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        )}
      </Container>
    </div>
  );
}
