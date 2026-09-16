import { NextResponse } from "next/server";
import { getLlegadasBarajas, getLlegadasTrenes } from "@/lib/transporte.functions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const [vuelos, trenes] = await Promise.all([
      getLlegadasBarajas(),
      getLlegadasTrenes(),
    ]);
    return NextResponse.json({ vuelos, trenes });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error obteniendo transportes" },
      { status: 500 }
    );
  }
}