import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { countUsers, findUserById } from "../../lib/services/user.service";
import SetupForm from "./setup-form";

export default async function SetupPage() {
  const session = await auth();

  if (session?.user?.id) {
    const user = await findUserById(session.user.id);
    if (user) redirect("/");
  }

  const count = await countUsers();
  if (count > 0) redirect("/login");

  return <SetupForm />;
}
