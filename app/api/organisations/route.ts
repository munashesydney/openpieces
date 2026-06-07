import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { getUserOrganisations } from "../../../lib/services/organisation.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const organisations = await getUserOrganisations(session.user.id);
    return NextResponse.json(organisations);
  } catch (error) {
    console.error("[ORGANISATIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
