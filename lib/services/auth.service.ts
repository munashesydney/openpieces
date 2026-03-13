import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { findUserById, countUsers } from "./user.service";

/**
 * Validates the current session against the database.
 * - No session → redirect to /login (or /setup if no users exist)
 * - Session user deleted / DB wiped → same redirect
 * Returns the verified DB user on success.
 */
export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    const count = await countUsers();
    redirect(count === 0 ? "/setup" : "/login");
  }

  const user = await findUserById(userId);
  if (!user) {
    const count = await countUsers();
    redirect(count === 0 ? "/setup" : "/login");
  }

  return user;
}
