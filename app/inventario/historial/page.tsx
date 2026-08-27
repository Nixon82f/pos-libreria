"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MovimientoInventario, TipoMovimiento } from "@/types/database";
import {
  SearchIcon,
  XMarkIcon,
  RefreshCwIcon,
  BookOpenIcon,
} from "@/components/pos/Icons";

export default function HistorialInventarioPage() {
  const supabase = useMemo(() => createClient(), []);

  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  const cargarMovimientos = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from("movimientos_inventario")
      .select("id, producto_id, nombre_producto, tipo, cantidad_cambio, stock_anterior, stock_nuevo, motivo, fecha")
      .order("fecha", { ascending: false });

    if (err) {
      // Table might not be populated or might need schema creation in Supabase
      setError(err.message);
      setMovimientos([]);
      return;
    }

    setMovimientos(
      (data ?? []).map((row) => ({
        id: row.id,
        producto_id: row.producto_id,
        nombre_producto: row.nombre_producto,
        tipo: row.tipo as TipoMovimiento,
        cantidad_cambio: Number(row.cantidad_cambio),
        stock_anterior: Number(row.stock_anterior),
        stock_nuevo: Number(row.stock_nuevo),
        motivo: row.motivo,
        fecha: row.fecha,
      }))
    );
  }, [supabase]);

  useEffect(() => {
    let activo = true;

    async function iniciar() {
      setCargando(true);
      await cargarMovimientos();
      if (activo) setCargando(false);
    }

    void iniciar();
    return () => {
      activo = false;
    };
  }, [cargarMovimientos]);

  const movimientosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase();

    return movimientos.filter((m) => {
      // Type filter
      if (filtroTipo !== "todos" && m.tipo !== filtroTipo) return false;

      // Search filter
      if (query) {
        const coincideProducto = m.nombre_producto.toLowerCase().includes(query);
        const coincideMotivo = m.motivo?.toLowerCase().includes(query) ?? false;
        if (!coincideProducto && !coincideMotivo) return false;
      }

      return true;
    });
  }, [movimientos, filtroTipo, busqueda]);

  // Movement badge color helper
  function getBadge(tipo: TipoMovimiento) {
    switch (tipo) {
      case "venta":
        return (
          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
            Salida por Venta
          </span>
        );
      case "recepcion_stock":
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            Entrada de Stock
          </span>
        );
      case "creacion":
        return (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            Producto Creado
          </span>
        );
      case "ajuste_manual":
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            Ajuste Manual
          </span>
        );
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col p-4 sm:p-6 lg:p-8">
      {/* Top Navbar */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <nav className="flex items-center gap-2 text-xs font-medium text-stone-500">
            <Link href="/" className="hover:text-stone-900 transition">
              Inicio
            </Link>
            <span>/</span>
            <Link href="/inventario" className="hover:text-stone-900 transition">
              Inventario
            </Link>
            <span>/</span>
            <span className="text-stone-900 font-semibold">Auditoría de Stock</span>
          </nav>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              Auditoría y Movimientos de Stock
            </h1>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
              Libreria San Rafael
            </span>
          </div>
        </div>

        {/* Action Links */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => cargarMovimientos()}
            disabled={cargando}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 active:scale-95 transition disabled:opacity-50"
            title="Recargar movimientos"
          >
            <RefreshCwIcon
              className={`h-3.5 w-3.5 ${cargando ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <Link
            href="/inventario"
            className="rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-stone-800 transition"
          >
            &larr; Volver al Inventario
          </Link>

          <Link
            href="/pos"
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
          >
            Caja (POS)
          </Link>

          <Link
            href="/ventas"
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
          >
            Historial de Ventas
          </Link>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="font-semibold mb-1">Aviso sobre la tabla de auditoría:</div>
          <p className="text-xs">
            Si acabas de agregar la tabla de movimientos en el schema SQL, asegúrate de ejecutar las sentencias SQL de <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">supabase/schema.sql</code> en el SQL Editor de Supabase para activar los registros automáticos.
          </p>
          <p className="text-xs text-amber-700 mt-1 font-mono">{error}</p>
        </div>
      )}

      {/* Main Table Container */}
      <section className="flex flex-1 flex-col rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        {/* Filters and Search Bar */}
        <div className="border-b border-stone-200 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFiltroTipo("todos")}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  filtroTipo === "todos"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo("venta")}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  filtroTipo === "venta"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Salidas por Venta
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo("recepcion_stock")}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  filtroTipo === "recepcion_stock"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Entradas de Stock
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo("creacion")}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  filtroTipo === "creacion"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Creaciones
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px] sm:w-80">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                <SearchIcon className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por producto o motivo..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-8 text-xs text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white focus:ring-1 focus:ring-stone-400"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-stone-400 hover:text-stone-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Movements Table Content */}
        <div className="flex-1 overflow-x-auto">
          {cargando ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-stone-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
              <p className="text-sm">Cargando registros de auditoría...</p>
            </div>
          ) : movimientosFiltrados.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-8 text-center text-stone-400">
              <BookOpenIcon className="h-10 w-10 text-stone-300 mb-2" />
              <p className="text-base font-semibold text-stone-700">No hay movimientos registrados</p>
              <p className="mt-1 text-xs text-stone-500 max-w-sm">
                Los cambios de stock por ventas, compras o nuevos artículos se registrarán aquí automáticamente.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 text-xs font-semibold">
                  <th className="p-3.5 pl-5">Fecha y Hora</th>
                  <th className="p-3.5">Producto</th>
                  <th className="p-3.5">Tipo de Movimiento</th>
                  <th className="p-3.5">Variación</th>
                  <th className="p-3.5">Balance de Stock</th>
                  <th className="p-3.5 pr-5">Motivo / Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {movimientosFiltrados.map((mov) => {
                  const fechaObj = new Date(mov.fecha);
                  const fechaStr = fechaObj.toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const horaStr = fechaObj.toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const esPositivo = mov.cantidad_cambio > 0;
                  const esNegativo = mov.cantidad_cambio < 0;

                  return (
                    <tr
                      key={mov.id}
                      className="hover:bg-stone-50/70 transition-colors"
                    >
                      {/* Fecha */}
                      <td className="p-3.5 pl-5 text-stone-700 whitespace-nowrap">
                        <div className="font-medium text-stone-900">{fechaStr}</div>
                        <div className="text-xs text-stone-400">{horaStr}</div>
                      </td>

                      {/* Producto */}
                      <td className="p-3.5 font-semibold text-stone-900">
                        {mov.nombre_producto}
                      </td>

                      {/* Tipo */}
                      <td className="p-3.5 whitespace-nowrap">
                        {getBadge(mov.tipo)}
                      </td>

                      {/* Variación */}
                      <td className="p-3.5 font-bold whitespace-nowrap">
                        {esPositivo && (
                          <span className="text-emerald-700">+{mov.cantidad_cambio} un.</span>
                        )}
                        {esNegativo && (
                          <span className="text-red-700">{mov.cantidad_cambio} un.</span>
                        )}
                        {!esPositivo && !esNegativo && (
                          <span className="text-stone-600">0 un.</span>
                        )}
                      </td>

                      {/* Balance Stock */}
                      <td className="p-3.5 text-stone-600 whitespace-nowrap">
                        <span className="text-stone-400">{mov.stock_anterior}</span>
                        <span className="mx-1.5 font-bold text-stone-400">&rarr;</span>
                        <span className="font-bold text-stone-900">{mov.stock_nuevo} un.</span>
                      </td>

                      {/* Motivo */}
                      <td className="p-3.5 pr-5 text-stone-500 text-xs">
                        {mov.motivo || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 bg-stone-50/60 px-5 py-3 text-xs text-stone-500 flex justify-between items-center">
          <span>
            Mostrando {movimientosFiltrados.length} movimiento(s)
          </span>
          <span className="text-stone-400">
            Registro de auditoría continua
          </span>
        </div>
      </section>
    </main>
  );
}
