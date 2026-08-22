import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Instalări fibră optică — Proconect" },
      {
        name: "description",
        content:
          "Toate lucrările de instalare fibră optică B2B: echipamente, trasee de cablu și sudurile din manșoane, într-o singură aplicație de teren.",
      },
      { property: "og:title", content: "Instalări fibră optică — Proconect" },
      {
        property: "og:description",
        content: "Lucrările tale de instalare fibră optică B2B, documentate pe teren.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Home />
    </RequireAuth>
  ),
});

function Home() {
  const navigate = useNavigate();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (role === "coordinator") {
        // Show coordinator dashboard
        navigate({ to: "/dashboard" });
      } else if (role === "technician") {
        // Show technician mode selection
        navigate({ to: "/choose" });
      }
    }
  }, [role, loading, navigate]);

  return null;
}
