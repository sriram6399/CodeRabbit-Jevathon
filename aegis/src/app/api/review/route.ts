import { NextResponse } from "next/server";
import { reviewRepository } from "@/platform/coderabbit";

export async function POST() {
  const review = await reviewRepository();
  return NextResponse.json(review);
}
