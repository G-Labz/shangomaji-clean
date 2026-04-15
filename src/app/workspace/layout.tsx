import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { checkCreatorApproval } from "@/lib/creator-auth";
import WorkspaceShell from "./WorkspaceShell";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/creators/login");
  }

  const destination = await checkCreatorApproval(supabase, user.email);

  if (destination !== "/workspace") {
    redirect(destination);
  }

  return <WorkspaceShell>{children}</WorkspaceShell>;
}
