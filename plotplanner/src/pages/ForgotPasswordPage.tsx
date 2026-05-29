import { useForm } from "@mantine/form";
import {
  TextInput,
  Button,
  Text,
  Title,
  Anchor,
  Alert,
  Paper,
  Stack,
} from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import axios from "axios";
import api from "../lib/api";

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

export default function ForgotPasswordPage() {
  const form = useForm({
    initialValues: { email: "" },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : "Enter a valid email address"),
    },
  });

  const { mutate, isPending, error, isSuccess } = useMutation({
    mutationFn: ({ email }: { email: string }) =>
      api.post("/auth/reset-password", { email }),
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
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 no-underline">
          <span className="text-2xl">🌾</span>
          <Text fw={700} size="lg" className="text-primary" style={{ letterSpacing: "-0.3px" }}>
            PlotPlanner
          </Text>
        </Link>

        <Paper radius="xl" p="xl" className="border border-[--color-border]" shadow="sm">
          <Stack gap="xs" mb="xl">
            <Title order={2} className="text-primary-dark" style={{ letterSpacing: "-0.5px" }}>
              Reset your password
            </Title>
            <Text className="text-muted">
              Enter your email and we&apos;ll send you a reset link.
            </Text>
          </Stack>

          {error && (
            <Alert color="red" radius="lg" mb="md">
              {getErrorMessage(error)}
            </Alert>
          )}

          {isSuccess ? (
            <Alert color="green" radius="lg">
              If an account exists for that email, you&apos;ll receive a reset link shortly.
            </Alert>
          ) : (
            <form onSubmit={form.onSubmit((values) => mutate(values))}>
              <Stack gap="md">
                <TextInput
                  label="Email"
                  placeholder="you@example.com"
                  radius="md"
                  {...form.getInputProps("email")}
                />
                <Button
                  type="submit"
                  radius="xl"
                  size="md"
                  loading={isPending}
                  className="bg-primary! mt-2"
                  fullWidth
                >
                  Send reset link
                </Button>
              </Stack>
            </form>
          )}
        </Paper>

        <Text size="sm" className="text-center text-muted mt-6">
          <Anchor component={Link} to="/login" className="text-primary font-semibold">
            Back to log in
          </Anchor>
        </Text>
      </div>
    </div>
  );
}
