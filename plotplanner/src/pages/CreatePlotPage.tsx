import { useState } from "react";
import {
  Container,
  Title,
  Text,
  Button,
  TextInput,
  Group,
  Stack,
} from "@mantine/core";
import { useNavigate, Link } from "react-router-dom";
import { useCreatePlot, type Point } from "../hooks/usePlots";
import PolygonCanvas from "../components/PolygonCanvas";
import { useMe } from "../hooks/useMe";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

type Step = "name" | "shape";

export default function CreatePlotPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [points, setPoints] = useState<Point[]>([]);

  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const { mutate: logout } = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      navigate("/");
    },
  });

  const { mutate: createPlot, isPending } = useCreatePlot();

  function handleNext() {
    if (!name.trim()) {
      setNameError("Plot name is required");
      return;
    }
    setNameError("");
    setStep("shape");
  }

  function normalizePoints(pts: Point[]): Point[] {
    const minX = Math.min(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    return pts.map((p) => ({ x: p.x - minX, y: p.y - minY }));
  }

  function handleCreate() {
    createPlot(
      { name: name.trim(), shape: normalizePoints(points) },
      { onSuccess: () => navigate("/dashboard") },
    );
  }

  return (
    <div className="h-screen bg-[--color-bg]">
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-[--color-border] backdrop-blur-md"
        style={{
          background: "color-mix(in srgb, var(--earth-50) 90%, transparent)",
        }}
      >
        <Container size="lg">
          <div className="flex items-center justify-between py-4">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <span className="text-xl">🌾</span>
              <Text
                fw={700}
                size="lg"
                className="text-primary"
                style={{ letterSpacing: "-0.3px" }}
              >
                PlotPlanner
              </Text>
            </Link>
            <Group gap="sm">
              <Text size="sm" className="text-muted hidden sm:block">
                {me?.email}
              </Text>
              <Button
                variant="subtle"
                size="sm"
                radius="xl"
                className="text-muted!"
                onClick={() => logout()}
              >
                Log out
              </Button>
            </Group>
          </div>
        </Container>
      </header>

      <Container size={step === "shape" ? "lg" : "xs"} py={36}>
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          {(["name", "shape"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background:
                      step === s || (s === "name" && step === "shape")
                        ? "var(--color-primary)"
                        : "var(--earth-300)",
                    color:
                      step === s || (s === "name" && step === "shape")
                        ? "white"
                        : "var(--sage-500)",
                  }}
                >
                  {s === "name" && step === "shape" ? "✓" : i + 1}
                </div>
                <Text
                  size="sm"
                  fw={step === s ? 600 : 400}
                  className={step === s ? "text-primary-dark" : "text-muted"}
                >
                  {s === "name" ? "Name" : "Draw outline"}
                </Text>
              </div>
              {i === 0 && <div className="w-8 h-px bg-[--earth-300]" />}
            </div>
          ))}
        </div>

        {/* Step: Name */}
        {step === "name" && (
          <Stack gap="xl">
            <div>
              <Title
                order={2}
                className="text-primary-dark"
                style={{ letterSpacing: "-0.5px" }}
              >
                Name your plot
              </Title>
              <Text className="text-muted mt-1">
                Give your plot a name so you can find it easily.
              </Text>
            </div>

            <TextInput
              size="md"
              radius="md"
              placeholder="e.g. Back garden, Allotment A3"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError("");
              }}
              error={nameError}
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
              data-autofocus
            />

            <Group>
              <Button
                variant="subtle"
                radius="xl"
                className="text-muted!"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </Button>
              <Button radius="xl" className="bg-primary!" onClick={handleNext}>
                Next →
              </Button>
            </Group>
          </Stack>
        )}

        {/* Step: Shape */}
        {step === "shape" && (
          <Stack gap="xl">
            <div>
              <Title
                order={2}
                className="text-primary-dark"
                style={{ letterSpacing: "-0.5px" }}
              >
                Draw your plot outline
              </Title>
              <Text className="text-muted mt-1">
                Sketch the boundary of <strong>{name}</strong> by placing corner
                points on the canvas. You can skip this and draw it later.
              </Text>
            </div>

            <PolygonCanvas
              points={points}
              onChange={(newPoints) => {
                console.log(newPoints);
                setPoints(newPoints);
              }}
            />

            {points.length > 0 && (
              <Text size="sm" className="text-muted">
                {points.length} point{points.length === 1 ? "" : "s"} placed
                {points.length >= 3 && ` · ${points.length}-sided polygon`}
              </Text>
            )}

            <Group justify="space-between">
              <Group gap="sm">
                <Button
                  variant="subtle"
                  radius="xl"
                  className="text-muted!"
                  onClick={() => setStep("name")}
                >
                  ← Back
                </Button>
                {points.length > 0 && (
                  <Button
                    variant="subtle"
                    radius="xl"
                    className="text-muted!"
                    onClick={() => setPoints([{x: 0, y: 0}])}
                  >
                    Clear
                  </Button>
                )}
              </Group>
              <Button
                radius="xl"
                className="bg-primary!"
                loading={isPending}
                onClick={handleCreate}
              >
                Create plot
              </Button>
            </Group>
          </Stack>
        )}
      </Container>
    </div>
  );
}
