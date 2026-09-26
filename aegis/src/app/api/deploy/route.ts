import { NextResponse } from "next/server";
import { checkDeploy } from "@/platform/gmi";

export async function POST() {
  const result = await checkDeploy();
  return NextResponse.json(result);
}
