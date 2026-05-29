import {
  Button,
  Container,
  Text,
  Title,
  Badge,
  Card,
  Group,
  Stack,
  SimpleGrid,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMe } from "../hooks/useMe";
import api from "../lib/api";

const features = [
  {
    icon: "🌱",
    title: "Plan your plot",
    description:
      "Lay out your beds, paths, and growing zones with an intuitive drag-and-drop canvas.",
  },
  {
    icon: "🌿",
    title: "Track what you grow",
    description:
      "Log crops, planting dates, and harvests so you always know what's in the ground.",
  },
  {
    icon: "🤝",
    title: "Invite collaborators",
    description:
      "Share your plot with a partner or community group and plan together in real time.",
  },
  {
    icon: "📅",
    title: "Season planning",
    description:
      "Get reminders for sowing, transplanting, and harvesting at exactly the right time.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const { mutate: logout } = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
    },
  });

  const isLoggedIn = !!me;

  return (
    <div className="min-h-screen bg-[--color-bg]">

      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 border-b border-[--color-border] backdrop-blur-md"
        style={{ background: "color-mix(in srgb, var(--earth-50) 85%, transparent)" }}
      >
        <Container size="lg">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌾</span>
              <Text fw={700} size="lg" className="text-primary" style={{ letterSpacing: "-0.3px" }}>
                PlotPlanner
              </Text>
            </div>
            <Group gap="sm">
              {isLoggedIn ? (
                <>
                  <Button variant="subtle" className="text-primary!" onClick={() => logout()}>
                    Log out
                  </Button>
                  <Button radius="xl" className="bg-primary!" onClick={() => navigate("/dashboard")}>
                    Go to dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="subtle" className="text-primary!" onClick={() => navigate("/login")}>
                    Log in
                  </Button>
                  <Button radius="xl" className="bg-primary!" onClick={() => navigate("/register")}>
                    Get started
                  </Button>
                </>
              )}
            </Group>
          </div>
        </Container>
      </nav>

      {/* Hero */}
      <div
        className="relative overflow-hidden py-24"
        style={{
          background:
            "linear-gradient(135deg, var(--sage-100) 0%, var(--earth-100) 50%, var(--sage-200) 100%)",
        }}
      >
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-30 blur-3xl bg-[--green-300]" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full opacity-20 blur-3xl bg-accent" />

        <Container size="md" className="relative text-center">
          <Stack align="center" gap="xl">
            <Badge
              size="lg"
              radius="xl"
              className="border-0! font-semibold"
              style={{ background: "var(--green-50)", color: "var(--color-primary)" }}
            >
              Your garden, beautifully organised
            </Badge>

            <Title
              order={1}
              className="text-primary-dark font-extrabold!"
              style={{
                fontSize: "clamp(2.4rem, 6vw, 4rem)",
                lineHeight: 1.15,
                letterSpacing: "-1px",
              }}
            >
              Grow smarter,
              <br />
              <span className="text-primary-light">plan better</span>
            </Title>

            <Text size="xl" className="text-muted max-w-140 leading-[1.7]">
              PlotPlanner helps gardeners and allotment holders design their
              plots, track their crops, and collaborate with others — all in one
              place.
            </Text>

            <Group gap="md" justify="center">
              <Button
                size="lg"
                radius="xl"
                className="bg-primary! px-8"
                onClick={() => navigate("/register")}
              >
                Start planning for free
              </Button>
              <Button
                size="lg"
                radius="xl"
                variant="outline"
                className="border-[--green-400]! text-primary!"
              >
                See how it works
              </Button>
            </Group>

            <div
              className="w-full max-w-2xl rounded-3xl mt-4 flex items-center justify-center h-80 border border-[--green-200]"
              style={{
                background: "linear-gradient(160deg, var(--green-100) 0%, var(--earth-200) 100%)",
                boxShadow: "0 20px 60px rgba(60,100,40,0.12)",
              }}
            >
              <Text size="4rem">🌻</Text>
            </div>
          </Stack>
        </Container>
      </div>

      {/* Features */}
      <Container size="lg" py={80}>
        <Stack align="center" gap="xs" mb={48}>
          <Text className="text-[--green-400] uppercase tracking-[1px] text-[13px] font-semibold">
            Everything you need
          </Text>
          <Title
            order={2}
            className="text-primary-dark font-bold!"
            style={{ letterSpacing: "-0.5px" }}
          >
            Built for the way you garden
          </Title>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {features.map((f) => (
            <Card
              key={f.title}
              padding="xl"
              radius="xl"
              className="bg-surface! border! border-[--color-border-subtle]! transition-shadow duration-200"
              style={{ boxShadow: "0 2px 12px rgba(60,80,40,0.06)" }}
            >
              <Stack gap="sm">
                <Text size="2rem">{f.icon}</Text>
                <Text fw={700} size="lg" className="text-primary-dark">
                  {f.title}
                </Text>
                <Text className="text-subtle leading-[1.7]">
                  {f.description}
                </Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      {/* CTA banner */}
      <div
        className="py-20"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-mid) 100%)",
        }}
      >
        <Container size="md" className="text-center">
          <Stack align="center" gap="lg">
            <Title
              order={2}
              className="text-white font-bold!"
              style={{ letterSpacing: "-0.5px" }}
            >
              Ready to get growing?
            </Title>
            <Text size="lg" className="text-white/80 max-w-110">
              Join gardeners who are making the most of their plots this season.
            </Text>
            <Button
              size="lg"
              radius="xl"
              className="bg-accent-light! text-primary! font-bold! px-10"
              onClick={() => navigate("/register")}
            >
              Create your free plot
            </Button>
          </Stack>
        </Container>
      </div>

      {/* Footer */}
      <footer className="bg-primary-dark py-8">
        <Container size="lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <Group gap="xs">
              <span className="text-xl">🌾</span>
              <Text className="text-white/60 text-sm">© 2026 PlotPlanner</Text>
            </Group>
            <Text className="text-white/40 text-[13px]">
              Made with care for every gardener
            </Text>
          </div>
        </Container>
      </footer>

    </div>
  );
}
