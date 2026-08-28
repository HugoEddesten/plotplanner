import {
  Container,
  Text,
  Title,
  Button,
  Card,
  SimpleGrid,
  Stack,
  Group,
  Skeleton,
  Menu,
} from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { Plus, ChevronDown, LogOut } from "lucide-react";
import { useMe } from "../hooks/useMe";
import { usePlots, type Plot } from "../hooks/usePlots";
import api from "../lib/api";

function PlotCard({ plot }: { plot: Plot }) {
  const navigate = useNavigate();
  const date = new Date(plot.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card
      padding="lg"
      radius="xl"
      className="bg-surface! border! border-[--color-border-subtle]! cursor-pointer transition-shadow duration-200 hover:shadow-md"
      onClick={() => navigate(`/plots/${plot.id}`)}
    >
      <Stack gap="xs">
        <Text size="2rem">🌱</Text>
        <Text fw={700} size="lg" className="text-primary-dark">
          {plot.name}
        </Text>
        <Text size="sm" className="text-muted">
          Created {date}
        </Text>
      </Stack>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: me } = useMe();
  const { data: plots, isLoading: plotsLoading } = usePlots();

  const queryClient = useQueryClient();
  const { mutate: logout } = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      navigate("/");
    },
  });

  const initial = me?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-[--color-bg]">
      {/* Header */}
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
            <Group gap="md">
              <Button
                radius="xl"
                leftSection={<Plus size={16} />}
                className="bg-primary!"
                onClick={() => navigate("/plots/new")}
              >
                New plot
              </Button>

              <div className="w-px h-6 bg-[--color-border]" />

              <Menu shadow="md" width={220} position="bottom-end" offset={8}>
                <Menu.Target>
                  <button className="flex items-center gap-2 py-1 pl-1 pr-2 rounded-full border-none bg-transparent cursor-pointer hover:bg-accent-light transition-colors">
                    <span className="w-8.5 h-8.5 rounded-full bg-primary-dark text-white flex items-center justify-center font-bold text-sm">
                      {initial}
                    </span>
                    <ChevronDown size={16} className="text-muted" />
                  </button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>
                    <Text size="xs" fw={600} className="text-subtle uppercase" style={{ letterSpacing: "0.04em" }}>
                      Signed in as
                    </Text>
                    <Text size="sm" fw={600} className="text-primary-dark" mt={2}>
                      {me?.email}
                    </Text>
                  </Menu.Label>
                  <Menu.Divider />
                  <Menu.Item leftSection={<LogOut size={16} />} onClick={() => logout()}>
                    Log out
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </div>
        </Container>
      </header>

      <Container size="lg" py={48}>
        <div className="mb-8">
          <Title order={2} className="text-primary-dark" style={{ letterSpacing: "-0.5px" }}>
            Your plots
          </Title>
          <Text className="text-muted mt-1">
            {plots?.length
              ? `${plots.length} plot${plots.length === 1 ? "" : "s"}`
              : "No plots yet"}
          </Text>
        </div>

        {plotsLoading ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={140} radius="xl" />
            ))}
          </SimpleGrid>
        ) : plots && plots.length > 0 ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {plots.map((plot) => (
              <PlotCard key={plot.id} plot={plot} />
            ))}
          </SimpleGrid>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-24">
            <Text size="4rem" mb="md">🌻</Text>
            <Title order={3} className="text-primary-dark mb-2">No plots yet</Title>
            <Text className="text-muted max-w-xs mb-6">
              Create your first plot to start planning what you&apos;ll grow this season.
            </Text>
            <Button radius="xl" className="bg-primary!" onClick={() => navigate("/plots/new")}>
              Create your first plot
            </Button>
          </div>
        )}
      </Container>
    </div>
  );
}
