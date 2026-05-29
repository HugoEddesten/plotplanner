import { useForm } from "@mantine/form";
import {
  TextInput,
  PasswordInput,
  Button,
  Text,
  Title,
  Anchor,
  Alert,
  Paper,
  Stack,
} from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import api from "../lib/api";

interface RegisterValues {
  email: string;
  password: string;
  confirmPassword: string;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const form = useForm<RegisterValues>({
    initialValues: { email: "", password: "", confirmPassword: "" },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : "Enter a valid email address"),
      password: (v) => (v.length >= 5 ? null : "Password must be at least 5 characters"),
      confirmPassword: (v, values) =>
        v !== values.password ? "Passwords do not match" : null,
    },
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: ({ email, password }: RegisterValues) =>
      api.post("/auth/register", { email, password }),
    onSuccess: () => navigate("/dashboard"),
  });

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{
        background:
          "linear-gradient(135deg, var(--sage-100) 0%, var(--earth-100) 50%, var(--sage-200) 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 no-underline">
          <span className="text-2xl">🌾</span>
          <Text fw={700} size="lg" className="text-primary" style={{ letterSpacing: "-0.3px" }}>
            PlotPlanner
          </Text>
        </Link>

        <Paper radius="xl" p="xl" className="border border-[--color-border]" shadow="sm">
          <Stack gap="xs" mb="xl">
            <Title order={2} className="text-primary-dark" style={{ letterSpacing: "-0.5px" }}>
              Create your account
            </Title>
            <Text className="text-muted">Start planning your plot today.</Text>
          </Stack>

          {error && (
            <Alert color="red" radius="lg" mb="md">
              {getErrorMessage(error)}
            </Alert>
          )}

          <form onSubmit={form.onSubmit((values) => mutate(values))}>
            <Stack gap="md">
              <TextInput
                label="Email"
                placeholder="you@example.com"
                radius="md"
                {...form.getInputProps("email")}
              />
              <PasswordInput
                label="Password"
                placeholder="At least 5 characters"
                radius="md"
                {...form.getInputProps("password")}
              />
              <PasswordInput
                label="Confirm password"
                placeholder="Repeat your password"
                radius="md"
                {...form.getInputProps("confirmPassword")}
              />
              <Button
                type="submit"
                radius="xl"
                size="md"
                loading={isPending}
                className="bg-primary! mt-2"
                fullWidth
              >
                Create account
              </Button>
            </Stack>
          </form>
        </Paper>

        <Text size="sm" className="text-center text-muted mt-6">
          Already have an account?{" "}
          <Anchor component={Link} to="/login" className="text-primary font-semibold">
            Log in
          </Anchor>
        </Text>
      </div>
    </div>
  );
}
