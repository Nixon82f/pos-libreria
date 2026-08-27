import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID de producto requerido." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("productos")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, deleted: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al eliminar producto";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
