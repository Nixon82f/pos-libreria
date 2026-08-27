import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { items } = await request.json();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_venta", {
    p_items: items,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
