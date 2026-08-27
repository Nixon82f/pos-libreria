"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Venta } from "@/types/database";
import { DetalleVentaModal } from "@/components/ventas/DetalleVentaModal";
import {
  SearchIcon,
  XMarkIcon,
  RefreshCwIcon,
  BanknotesIcon,
  ShoppingCartIcon,
} from "@/components/pos/Icons";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

type FiltroFecha = "hoy" | "7dias" | "mes" | "todo";

export default function VentasPage() {
  const supabase = useMemo(() => createClient(), []);

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>("hoy");

  // Selected sale for detail modal
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null);

  const cargarVentas = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from("ventas")
      .select("id, fecha, total, items_vendidos")
      .order("fecha", { ascending: false });

    if (err) {
      setError(err.message);
      setVentas([]);
      return;
    }

    setVentas(
      (data ?? []).map((row) => ({
        id: row.id,
        fecha: row.fecha,
        total: Number(row.total),
        items_vendidos: Array.isArray(row.items_vendidos)
          ? row.items_vendidos
          : [],
      }))
    );
  }, [supabase]);

  useEffect(() => {
    let activo = true;

    async function iniciar() {
      setCargando(true);
      await cargarVentas();
      if (activo) setCargando(false);
    }

    void iniciar();
    return () => {
      activo = false;
    };
  }, [cargarVentas]);

  // Filtered sales
  const ventasFiltradas = useMemo(() => {
    const ahora = new Date();
    const hoyInicio = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate()
    ).getTime();
    const hace7Dias = hoyInicio - 7 * 24 * 60 * 60 * 1000;
    const inicioMes = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      1
    ).getTime();

    const query = busqueda.trim().toLowerCase();

    return ventas.filter((v) => {
      const fechaVenta = new Date(v.fecha).getTime();

      // Date range filter
      if (filtroFecha === "hoy" && fechaVenta < hoyInicio) return false;
      if (filtroFecha === "7dias" && fechaVenta < hace7Dias) return false;
      if (filtroFecha === "mes" && fechaVenta < inicioMes) return false;

      // Search filter (by folio / ID or product name)
      if (query) {
        const coincideFolio = v.id.toLowerCase().includes(query);
        const coincideProducto = v.items_vendidos.some((item) =>
          item.nombre.toLowerCase().includes(query)
        );
        if (!coincideFolio && !coincideProducto) return false;
      }

      return true;
    });
  }, [ventas, filtroFecha, busqueda]);

  // Aggregate metrics for filtered data
  const metricas = useMemo(() => {
    const totalRecaudado = ventasFiltradas.reduce((acc, v) => acc + v.total, 0);
    const totalTickets = ventasFiltradas.length;
    const totalArticulos = ventasFiltradas.reduce((acc, v) => {
      return (
        acc +
        v.items_vendidos.reduce((subAcc, it) => subAcc + it.cantidad, 0)
      );
    }, 0);
    const ticketPromedio =
      totalTickets > 0 ? totalRecaudado / totalTickets : 0;

    return {
      totalRecaudado,
      totalTickets,
      totalArticulos,
      ticketPromedio,
    };
  }, [ventasFiltradas]);

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
            <span className="text-stone-900 font-semibold">Historial de Ventas</span>
          </nav>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              Historial de Ventas
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
            onClick={() => cargarVentas()}
            disabled={cargando}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 active:scale-95 transition disabled:opacity-50"
            title="Recargar ventas"
          >
            <RefreshCwIcon
              className={`h-3.5 w-3.5 ${cargando ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <Link
            href="/pos"
            className="rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-stone-800 transition"
          >
            &larr; Ir a Caja (POS)
          </Link>

          <Link
            href="/inventario"
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
          >
            Inventario
          </Link>

          <Link
            href="/inventario/historial"
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
          >
            Auditoría de Stock
          </Link>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error al consultar ventas:</strong> {error}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Total recaudado */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">Total Recaudado</span>
            <BanknotesIcon className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            {money.format(metricas.totalRecaudado)}
          </div>
          <p className="mt-1 text-[11px] text-stone-400 capitalize">
            Período: {filtroFecha === "7dias" ? "Últimos 7 días" : filtroFecha}
          </p>
        </div>

        {/* Total tickets */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">Tickets de Venta</span>
            <ShoppingCartIcon className="h-4 w-4 text-stone-700" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            {metricas.totalTickets}
          </div>
          <p className="mt-1 text-[11px] text-stone-400">Ventas completadas</p>
        </div>

        {/* Total artículos */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">Artículos Vendidos</span>
            <span className="text-xs font-bold text-stone-400"># un.</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            {metricas.totalArticulos}
          </div>
          <p className="mt-1 text-[11px] text-stone-400">Piezas totales</p>
        </div>

        {/* Ticket promedio */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium">Ticket Promedio</span>
            <span className="text-xs font-bold text-stone-400">Ø</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            {money.format(metricas.ticketPromedio)}
          </div>
          <p className="mt-1 text-[11px] text-stone-400">Por transacción</p>
        </div>
      </div>

      {/* Main Table Container */}
      <section className="flex flex-1 flex-col rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="border-b border-stone-200 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Period Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFiltroFecha("hoy")}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  filtroFecha === "hoy"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setFiltroFecha("7dias")}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  filtroFecha === "7dias"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Últimos 7 días
              </button>
              <button
                type="button"
                onClick={() => setFiltroFecha("mes")}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  filtroFecha === "mes"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Este mes
              </button>
              <button
                type="button"
                onClick={() => setFiltroFecha("todo")}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  filtroFecha === "todo"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Todo el historial
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
                placeholder="Buscar por folio o producto..."
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

        {/* Sales Table Content */}
        <div className="flex-1 overflow-x-auto">
          {cargando ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-stone-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
              <p className="text-sm">Cargando ventas...</p>
            </div>
          ) : ventasFiltradas.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-8 text-center text-stone-400">
              <ShoppingCartIcon className="h-10 w-10 text-stone-300 mb-2" />
              <p className="text-base font-semibold text-stone-700">No se encontraron ventas</p>
              <p className="mt-1 text-xs text-stone-500">
                {busqueda
                  ? `No hay coincidencias para "${busqueda}" en este período.`
                  : "No se han registrado ventas en el período seleccionado."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 text-xs font-semibold">
                  <th className="p-3.5 pl-5">Folio / Ticket</th>
                  <th className="p-3.5">Fecha y Hora</th>
                  <th className="p-3.5">Artículos</th>
                  <th className="p-3.5">Resumen de Productos</th>
                  <th className="p-3.5">Total</th>
                  <th className="p-3.5 pr-5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ventasFiltradas.map((venta) => {
                  const fechaObj = new Date(venta.fecha);
                  const fechaStr = fechaObj.toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const horaStr = fechaObj.toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const totalItems = venta.items_vendidos.reduce(
                    (acc, it) => acc + it.cantidad,
                    0
                  );

                  const resumenTexto = venta.items_vendidos
                    .map((it) => `${it.cantidad}x ${it.nombre}`)
                    .join(", ");

                  return (
                    <tr
                      key={venta.id}
                      className="hover:bg-stone-50/70 transition-colors"
                    >
                      {/* Folio */}
                      <td className="p-3.5 pl-5 font-mono font-bold text-stone-900">
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-800">
                          #{venta.id.slice(0, 8)}
                        </span>
                      </td>

                      {/* Fecha / Hora */}
                      <td className="p-3.5 text-stone-700">
                        <div className="font-medium text-stone-900">{fechaStr}</div>
                        <div className="text-xs text-stone-400">{horaStr}</div>
                      </td>

                      {/* Cantidad articulos */}
                      <td className="p-3.5 text-stone-600 font-medium">
                        {totalItems} un.
                      </td>

                      {/* Resumen productos */}
                      <td className="p-3.5 text-stone-600 max-w-xs truncate" title={resumenTexto}>
                        {resumenTexto}
                      </td>

                      {/* Total */}
                      <td className="p-3.5 text-base font-black text-stone-900 whitespace-nowrap">
                        {money.format(venta.total)}
                      </td>

                      {/* Botón Ver Detalle */}
                      <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setVentaSeleccionada(venta)}
                          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-100 hover:text-stone-900 transition"
                        >
                          Ver Detalle
                        </button>
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
            Mostrando {ventasFiltradas.length} venta(s)
          </span>
          <span>
            Total en lista: <strong>{money.format(metricas.totalRecaudado)}</strong>
          </span>
        </div>
      </section>

      {/* Sale Detail & Reprint & Edit Modal */}
      <DetalleVentaModal
        isOpen={Boolean(ventaSeleccionada)}
        onClose={() => setVentaSeleccionada(null)}
        venta={ventaSeleccionada}
        onSaleUpdated={(ventaActualizada) => {
          setVentas((prev) =>
            prev.map((v) =>
              v.id === ventaActualizada.id ? ventaActualizada : v
            )
          );
          setVentaSeleccionada(ventaActualizada);
        }}
      />
    </main>
  );
}
