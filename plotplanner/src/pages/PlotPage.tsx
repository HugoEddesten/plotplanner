import { useRef, useState } from "react";
import { Container, Text, Title, Button, Skeleton, Progress, Card } from "@mantine/core";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { usePlot } from "../hooks/usePlots";
import { usePlotPlants } from "../hooks/usePlants";
import PlotView, { type CellGrid, cellKey, computeGrid } from "../components/PlotView";
import CellModal from "../components/CellModal";
import PlotActivityFeed from "../components/PlotActivityFeed";

const GRID_COLS = 15;

export default function PlotPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plotId = Number(id);

  const { data: plot, isLoading, isError } = usePlot(plotId);
  const { data: plotPlants } = usePlotPlants(plotId);

  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number } | null>(null);
  const historyButtonRef = useRef<HTMLButtonElement>(null);

  const cells: CellGrid = {};
  plotPlants?.forEach((pp) => {
    cells[cellKey(pp.col, pp.row)] = { status: "planted", label: "" };
  });

  const grid = plot ? computeGrid(plot.shape, GRID_COLS) : null;
  const totalCells = grid?.insideCells.length ?? 0;
  const plantedCount = plotPlants?.length ?? 0;
  const emptyCount = Math.max(totalCells - plantedCount, 0);
  const percentPlanted = totalCells > 0 ? Math.round((plantedCount / totalCells) * 100) : 0;

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
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between gap-4">
              <Title order={2} className="text-primary-dark" style={{ letterSpacing: "-0.5px" }}>
                {plot.name}
              </Title>
              <Button
                ref={historyButtonRef}
                variant="subtle"
                size="sm"
                leftSection={<Clock size={16} />}
                onClick={() => navigate(`/plots/${plot.id}/history`)}
              >
                History
              </Button>
            </div>

            {totalCells > 0 && (
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-light" />
                  <Text size="sm" className="text-muted">
                    {plantedCount} planted
                  </Text>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full border border-[--color-border]" />
                  <Text size="sm" className="text-muted">
                    {emptyCount} empty
                  </Text>
                </div>
                <Progress
                  value={percentPlanted}
                  size="sm"
                  radius="xl"
                  color="green"
                  className="flex-1 min-w-24 max-w-48"
                />
                <Text size="xs" className="text-subtle">
                  {percentPlanted}% planted
                </Text>
              </div>
            )}

            <PlotView
              shape={plot.shape}
              cells={cells}
              cols={GRID_COLS}
              onCellClick={(col, row) => setSelectedCell({ col, row })}
            />

            <Card padding="lg" radius="xl" className="bg-surface! border! border-[--color-border-subtle]!">
              <Text fw={700} size="sm" className="text-primary-dark mb-3">
                Recent activity
              </Text>
              <PlotActivityFeed plotId={plot.id} onSelectCell={(col, row) => setSelectedCell({ col, row })} />
            </Card>
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
          archiveFlightTargetRef={historyButtonRef}
        />
      )}
    </div>
  );
}
