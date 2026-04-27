import { NextResponse } from "next/server";
import { getOrganization, getOrgDefaults } from "@/lib/organization";

export async function GET() {
  const org = await getOrganization();
  if (org) {
    return NextResponse.json(org);
  }
  return NextResponse.json(getOrgDefaults());
}
