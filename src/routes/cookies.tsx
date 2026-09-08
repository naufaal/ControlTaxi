import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Política de cookies — ControlTaxi" },
      { name: "description", content: "Política de cookies de ControlTaxi." },
    ],
  }),
  component: () => <LegalPage tipo="cookies" />,
});
