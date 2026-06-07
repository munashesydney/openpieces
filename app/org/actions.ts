"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/services/auth.service";
import { createOrganisation } from "@/lib/services/organisation.service";

export async function createOrganisationAction(formData: FormData) {
  const user = await requireUser();

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || "";

  if (!name || !name.trim()) {
    return { error: "Name is required." };
  }

  try {
    await createOrganisation({
      name,
      description,
      userId: user.id,
    });
  } catch {
    return { error: "Failed to create organization." };
  }

  revalidatePath("/org");
  return { success: true };
}
