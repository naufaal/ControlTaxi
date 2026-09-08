import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de privacidad — ControlTaxi" },
      { name: "description", content: "Política de privacidad de ControlTaxi." },
    ],
  }),
  component: () => <LegalPage tipo="privacidad" />,
});
