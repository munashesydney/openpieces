import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { countUsers, findUserById } from "../../lib/services/user.service";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    const user = await findUserById(session.user.id);
    if (user) redirect("/");
  }

  const count = await countUsers();
  if (count === 0) redirect("/setup");

  return <LoginForm />;
}
