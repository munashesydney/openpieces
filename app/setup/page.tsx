import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { countUsers } from "../../lib/services/user.service";
import SetupForm from "./setup-form";

export default async function SetupPage() {
  const session = await auth();
  if (session) redirect("/");

  const count = await countUsers();
  if (count > 0) redirect("/login");

  return <SetupForm />;
}
