"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Servicio, ServicioHistorialPrecio, CategoriaServicio } from "@/types/database";
import { DEFAULT_SERVICIOS } from "@/types/database";
import {
  CopyIcon,
  PrinterIcon,
  LayersIcon,
  BookOpenIcon,
  PencilIcon,
  ClockIcon,
  RefreshCwIcon,
  XMarkIcon,
  CheckCircleIcon,
  TagIcon,
} from "@/components/pos/Icons";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const CATEGORIAS_CONFIG: Record<
  CategoriaServicio,
  { label: string; icon: typeof CopyIcon }
> = {
  fotocopias: {
    label: "Fotocopias",
    icon: CopyIcon,
  },
  impresiones: {
    label: "Impresiones",
    icon: PrinterIcon,
  },
  laminados: {
    label: "Laminados",
    icon: LayersIcon,
  },
  encolochados: {
    label: "Encolochados",
    icon: BookOpenIcon,
  },
  sublimados: {
    label: "Artículos Sublimados",
    icon: TagIcon,
  },
};

export default function ServiciosPage() {
  const supabase = useMemo(() => createClient(), []);

  // Pre-initialize with DEFAULT_SERVICIOS for instant 0ms load
  const [servicios, setServicios] = useState<Servicio[]>(DEFAULT_SERVICIOS);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Edit Modal State
  const [servicioEnEdicion, setServicioEnEdicion] = useState<Servicio | null>(null);
  const [nuevoPrecio, setNuevoPrecio] = useState<string>("");
  const [motivoCambio, setMotivoCambio] = useState<string>("");
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  // History Drawer / Modal State
  const [servicioHistorial, setServicioHistorial] = useState<Servicio | null>(null);
  const [historialList, setHistorialList] = useState<ServicioHistorialPrecio[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Fetch all services
  const cargarServicios = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from("servicios")
      .select("*")
      .order("categoria", { ascending: true })
      .order("nombre", { ascending: true });

    if (err) {
      setError(err.message);
      return;
    }

    if (data) {
      setServicios(
        data.map((s) => ({
          id: s.id,
          codigo: s.codigo,
          categoria: s.categoria as CategoriaServicio,
          nombre: s.nombre,
          descripcion: s.descripcion,
          tipo_precio: s.tipo_precio,
          precio_actual: Number(s.precio_actual),
          version_precio: Number(s.version_precio),
          activo: Boolean(s.activo),
          created_at: s.created_at,
          updated_at: s.updated_at,
        }))
      );
    }
  }, [supabase]);

  useEffect(() => {
    async function init() {
      setCargando(true);
      await cargarServicios();
      setCargando(false);
    }
    init();
  }, [cargarServicios]);

  // Open Edit Modal
  const handleOpenEditModal = (servicio: Servicio) => {
    setServicioEnEdicion(servicio);
    setNuevoPrecio(servicio.precio_actual.toString());
    setMotivoCambio("");
    setErrorEdicion(null);
  };

  // Submit Price Update via RPC or Direct Supabase Mutation
  const handleGuardarNuevoPrecio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicioEnEdicion) return;

    const precioNumerico = parseFloat(nuevoPrecio);
    if (isNaN(precioNumerico) || precioNumerico < 0) {
      setErrorEdicion("Ingresa un precio válido mayor o igual a 0.");
      return;
    }

    setGuardandoPrecio(true);
    setErrorEdicion(null);

    try {
      // 1. Try calling the PostgreSQL RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "actualizar_precio_servicio",
        {
          p_servicio_id: servicioEnEdicion.id,
          p_nuevo_precio: precioNumerico,
          p_motivo: motivoCambio.trim() || undefined,
        }
      );

      if (rpcError) {
        // Fallback: If RPC not created in DB yet, update directly
        const ahora = new Date().toISOString();
        const nuevaVersion = servicioEnEdicion.version_precio + 1;

        // Close current history record
        await supabase
          .from("servicios_historial_precios")
          .update({ fecha_fin: ahora })
          .eq("servicio_id", servicioEnEdicion.id)
          .is("fecha_fin", null);

        // Insert new history version
        await supabase.from("servicios_historial_precios").insert({
          servicio_id: servicioEnEdicion.id,
          version: nuevaVersion,
          precio: precioNumerico,
          fecha_inicio: ahora,
          motivo_cambio: motivoCambio.trim() || "Ajuste de tarifa",
        });

        // Update active service row
        const { error: updateError } = await supabase
          .from("servicios")
          .update({
            precio_actual: precioNumerico,
            version_precio: nuevaVersion,
            updated_at: ahora,
          })
          .eq("id", servicioEnEdicion.id);

        if (updateError) {
          throw new Error(updateError.message);
        }
      }

      setMensajeExito(
        `Tarifa de "${servicioEnEdicion.nombre}" actualizada a ${money.format(
          precioNumerico
        )} exitosamente.`
      );
      setServicioEnEdicion(null);
      await cargarServicios();

      setTimeout(() => {
        setMensajeExito(null);
      }, 4000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al actualizar la tarifa.";
      setErrorEdicion(msg);
    } finally {
      setGuardandoPrecio(false);
    }
  };

  // Fetch History for a Service
  const handleOpenHistorial = async (servicio: Servicio) => {
    setServicioHistorial(servicio);
    setCargandoHistorial(true);
    setHistorialList([]);

    const { data, error: err } = await supabase
      .from("servicios_historial_precios")
      .select("*")
      .eq("servicio_id", servicio.id)
      .order("version", { ascending: false });

    if (!err && data) {
      setHistorialList(
        data.map((h) => ({
          id: h.id,
          servicio_id: h.servicio_id,
          version: Number(h.version),
          precio: Number(h.precio),
          fecha_inicio: h.fecha_inicio,
          fecha_fin: h.fecha_fin,
          motivo_cambio: h.motivo_cambio,
          created_at: h.created_at,
        }))
      );
    }

    setCargandoHistorial(false);
  };

  // Group services by category
  const serviciosPorCategoria = useMemo(() => {
    const grupos: Record<CategoriaServicio, Servicio[]> = {
      fotocopias: [],
      impresiones: [],
      laminados: [],
      encolochados: [],
      sublimados: [],
    };

    for (const s of servicios) {
      if (grupos[s.categoria]) {
        grupos[s.categoria].push(s);
      }
    }

    return grupos;
  }, [servicios]);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <nav className="flex items-center gap-2 text-xs font-medium text-stone-500">
            <Link href="/" className="hover:text-stone-900 transition">
              Inicio
            </Link>
            <span>/</span>
            <Link href="/pos" className="hover:text-stone-900 transition">
              Caja (POS)
            </Link>
            <span>/</span>
            <span className="text-stone-900">Tarifas de Servicios</span>
          </nav>

          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              Catálogo & Tarifas de Servicios
            </h1>
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-800">
              {servicios.length} Servicios Configurados
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500 max-w-2xl">
            Administra las tarifas de servicios independientes del inventario físico. Cualquier cambio queda versionado automáticamente con histórico de auditoría sin alterar tickets pasados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => cargarServicios()}
            disabled={cargando}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 active:scale-95 transition disabled:opacity-50 cursor-pointer"
            title="Recargar tarifas"
          >
            <RefreshCwIcon
              className={`h-3.5 w-3.5 ${cargando ? "animate-spin" : ""}`}
            />
            <span>Actualizar</span>
          </button>

          <Link
            href="/pos"
            className="flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 transition"
          >
            <span>Ir a la Caja (POS) &rarr;</span>
          </Link>
        </div>
      </header>

      {/* Notifications */}
      {mensajeExito && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
            <span>{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error de conexión:</strong> {error}
        </div>
      )}

      {/* Categories Grid */}
      {cargando ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-stone-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" />
          <p className="text-sm">Cargando tarifas y servicios...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(
            [
              "fotocopias",
              "impresiones",
              "laminados",
              "encolochados",
              "sublimados",
            ] as CategoriaServicio[]
          ).map((catKey) => {
            const conf = CATEGORIAS_CONFIG[catKey];
            const items = serviciosPorCategoria[catKey] || [];
            const Icon = conf.icon;

            return (
              <section
                key={catKey}
                className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-4"
              >
                {/* Category Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-800">
                      <Icon className="h-5 w-5 text-stone-700" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-stone-900 capitalize">
                        {conf.label}
                      </h2>
                      <p className="text-xs text-stone-500">
                        {items.length} servicio(s) en esta categoría
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700 border border-stone-200">
                    Categoría: {catKey}
                  </span>
                </div>

                {/* Services Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((servicio) => (
                    <div
                      key={servicio.id}
                      className="flex flex-col justify-between rounded-xl border border-stone-200 bg-stone-50/50 p-4 transition hover:border-stone-300 hover:bg-white hover:shadow-xs"
                    >
                      <div>
                        {/* Top Tag & Version Badge */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-stone-200/80 px-2 py-0.5 text-[11px] font-semibold text-stone-700 font-mono">
                            <TagIcon className="h-3 w-3 text-stone-500" />
                            {servicio.codigo}
                          </span>

                          <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[11px] font-bold text-stone-800 border border-stone-300">
                            Versión {servicio.version_precio}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-sm font-bold text-stone-900">
                          {servicio.nombre}
                        </h3>
                        {servicio.descripcion && (
                          <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                            {servicio.descripcion}
                          </p>
                        )}
                      </div>

                      {/* Price & Action Section */}
                      <div className="mt-4 border-t border-stone-200/70 pt-3">
                        <div className="flex items-baseline justify-between mb-3">
                          <span className="text-xs font-medium text-stone-500">
                            {servicio.tipo_precio === "por_unidad"
                              ? "Tarifa por unidad / pág:"
                              : servicio.tipo_precio === "variable"
                              ? "Tarifa de referencia:"
                              : "Tarifa fija:"}
                          </span>
                          <div className="text-right">
                            <span className="text-xl font-black text-stone-900 tracking-tight">
                              {servicio.tipo_precio === "variable" && servicio.precio_actual === 0
                                ? "Precio Abierto"
                                : money.format(servicio.precio_actual)}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(servicio)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-stone-800 active:scale-95 transition cursor-pointer"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                            <span>Cambiar Tarifa</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenHistorial(servicio)}
                            className="flex items-center justify-center rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 active:scale-95 transition cursor-pointer"
                            title="Ver histórico de cambios de precio"
                          >
                            <ClockIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Edit Price Modal */}
      {servicioEnEdicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !guardandoPrecio && setServicioEnEdicion(null)}
          />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-900">
                  <PencilIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Modificar Tarifa
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    {servicioEnEdicion.nombre}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={guardandoPrecio}
                onClick={() => setServicioEnEdicion(null)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {errorEdicion && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {errorEdicion}
              </div>
            )}

            <form onSubmit={handleGuardarNuevoPrecio} className="mt-4 space-y-4">
              {/* Current Version & Old Price Banner */}
              <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3 text-xs text-stone-600 border border-stone-200">
                <div>
                  <span>Versión actual: </span>
                  <strong>v{servicioEnEdicion.version_precio}</strong>
                </div>
                <div>
                  <span>Tarifa previa: </span>
                  <strong className="text-stone-900">
                    {money.format(servicioEnEdicion.precio_actual)}
                  </strong>
                </div>
              </div>

              {/* New Price Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nueva Tarifa ($ MXN)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400 font-bold text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={nuevoPrecio}
                    onChange={(e) => setNuevoPrecio(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-7 pr-3 text-base font-bold text-stone-900 outline-none focus:border-stone-600 focus:ring-1 focus:ring-stone-600"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  Al guardar, se generará la <strong>Versión {servicioEnEdicion.version_precio + 1}</strong>.
                </p>
              </div>

              {/* Change Reason Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Motivo del Cambio (Opcional)
                </label>
                <input
                  type="text"
                  value={motivoCambio}
                  onChange={(e) => setMotivoCambio(e.target.value)}
                  placeholder="Ej. Ajuste de costos de insumos, Tarifa escolar 2026..."
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-600 focus:ring-1 focus:ring-stone-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={guardandoPrecio}
                  onClick={() => setServicioEnEdicion(null)}
                  className="flex-1 rounded-xl border border-stone-300 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardandoPrecio}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-stone-800 transition disabled:opacity-50 cursor-pointer"
                >
                  {guardandoPrecio ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Guardando…</span>
                    </>
                  ) : (
                    <span>Guardar Nueva Tarifa</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Drawer / Modal */}
      {servicioHistorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setServicioHistorial(null)}
          />

          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl transition-all max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                  <ClockIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Historial de Precios y Versiones
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    {servicioHistorial.nombre} ({servicioHistorial.codigo})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setServicioHistorial(null)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cargandoHistorial ? (
                <div className="flex h-32 items-center justify-center text-xs text-stone-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800 mr-2" />
                  Cargando histórico...
                </div>
              ) : historialList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-500">
                  No hay versiones previas registradas para este servicio.
                </div>
              ) : (
                historialList.map((item) => {
                  const esVigente = !item.fecha_fin;
                  const fechaInicio = new Date(item.fecha_inicio).toLocaleString("es-MX", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  });
                  const fechaFin = item.fecha_fin
                    ? new Date(item.fecha_fin).toLocaleString("es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : null;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 transition ${
                        esVigente
                          ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900/10"
                          : "border-stone-200 bg-stone-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                              esVigente
                                ? "bg-stone-900 text-white"
                                : "bg-stone-200 text-stone-700"
                            }`}
                          >
                            v{item.version}
                          </span>
                          {esVigente && (
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              Vigente actualmente
                            </span>
                          )}
                        </div>

                        <span className="text-base font-black text-stone-900">
                          {money.format(item.precio)}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] text-stone-500 space-y-0.5">
                        <p>
                          <span className="font-semibold text-stone-600">Desde:</span>{" "}
                          {fechaInicio}
                        </p>
                        {fechaFin && (
                          <p>
                            <span className="font-semibold text-stone-600">Hasta:</span>{" "}
                            {fechaFin}
                          </p>
                        )}
                        {item.motivo_cambio && (
                          <p className="pt-1 text-stone-700 italic">
                            &ldquo;{item.motivo_cambio}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-stone-100 pt-3 text-right">
              <button
                type="button"
                onClick={() => setServicioHistorial(null)}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
