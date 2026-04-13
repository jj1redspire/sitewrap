import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <AppShell>
      <SettingsClient email={user.email ?? ""} userId={user.id} />
    </AppShell>
  );
}
