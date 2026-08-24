import { useState } from "react";
import { Container, Text, Title, Button, Skeleton } from "@mantine/core";
import { Link, useParams, useNavigate } from "react-router-dom";
import { usePlot } from "../hooks/usePlots";
import { usePlotPlants } from "../hooks/usePlants";
import PlotView, { type CellGrid, cellKey } from "../components/PlotView";
import CellModal from "../components/CellModal";

export default function PlotPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plotId = Number(id);

  const { data: plot, isLoading, isError } = usePlot(plotId);
  const { data: plotPlants } = usePlotPlants(plotId);

  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number } | null>(null);

  const cells: CellGrid = {};
  plotPlants?.forEach((pp) => {
    cells[cellKey(pp.col, pp.row)] = { status: "planted", label: "" };
  });

  const selectedPlotPlant =
    selectedCell
      ? (plotPlants?.find((pp) => pp.col === selectedCell.col && pp.row === selectedCell.row) ?? null)
      : null;

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
            <Button variant="subtle" size="sm" radius="xl" className="text-muted!" onClick={() => navigate("/dashboard")}>
              ← Dashboard
            </Button>
          </div>
        </Container>
      </header>

      <Container py={48}>
        {isLoading && (
          <>
            <Skeleton height={32} width={200} mb={8} radius="md" />
            <Skeleton height={400} radius="xl" />
          </>
        )}

        {isError && <Text className="text-muted">Could not load plot.</Text>}

        {plot && (
          <div className="flex flex-col gap-2 mb-4">
            <Title order={2} className="text-primary-dark" style={{ letterSpacing: "-0.5px" }}>
              {plot.name}
            </Title>
            <PlotView
              shape={plot.shape}
              cells={cells}
              cols={15}
              onCellClick={(col, row) => setSelectedCell({ col, row })}
            />
          </div>
        )}
      </Container>

      {selectedCell && plot && (
        <CellModal
          plotId={plot.id}
          col={selectedCell.col}
          row={selectedCell.row}
          plotPlant={selectedPlotPlant}
          opened
          onClose={() => setSelectedCell(null)}
        />
      )}
    </div>
  );
}
