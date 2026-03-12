// app/page.tsx
// Root route — just redirects the user to /dashboard
// The real homepage is app/dashboard/page.tsx

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}