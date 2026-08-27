"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Venta,
  CierreCaja,
  DesgloseServiciosCierre,
  DesgloseEfectivo,
  EstadoDiferenciaCierre,
} from "@/types/database";
import { CalculadoraEfectivo } from "@/components/cierre/CalculadoraEfectivo";
import { DetalleCierreModal } from "@/components/cierre/DetalleCierreModal";
import {
  BanknotesIcon,
  LayersIcon,
  BookOpenIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  SearchIcon,
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  PrinterIcon,
} from "@/components/pos/Icons";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

type TabPrincipal = "cierre_actual" | "historial";
type FiltroFechaHistorial = "hoy" | "7dias" | "mes" | "todo";

export default function CierrePage() {
  const supabase = useMemo(() => createClient(), []);

  const [tabPrincipal, setTabPrincipal] = useState<TabPrincipal>("cierre_actual");

  // Current Shift State
  const [ventasTurno, setVentasTurno] = useState<Venta[]>([]);
  const [ultimoCierre, setUltimoCierre] = useState<CierreCaja | null>(null);
  const [cargandoTurno, setCargandoTurno] = useState(true);
  const [errorTurno, setErrorTurno] = useState<string | null>(null);
  const [avisoExito, setAvisoExito] = useState<string | null>(null);

  // Cash count state
  const [desgloseEfectivo, setDesgloseEfectivo] = useState<DesgloseEfectivo>({});
  const [montoManual, setMontoManual] = useState<string>("");
  const [modoConteo, setModoConteo] = useState<"desglosado" | "directo">("desglosado");
  const [nombreCajero, setNombreCajero] = useState("Cajero Principal");
  const [notasCierre, setNotasCierre] = useState("");
  const [guardandoCierre, setGuardandoCierre] = useState(false);

  // History State
  const [historialCierres, setHistorialCierres] = useState<CierreCaja[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [filtroHistorial, setFiltroHistorial] = useState<FiltroFechaHistorial>("todo");
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [cierreSeleccionado, setCierreSeleccionado] = useState<CierreCaja | null>(null);

  // 1. Load Current Shift Data (Ventas since latest closure or today)
  const cargarDatosTurno = useCallback(async () => {
    setErrorTurno(null);

    try {
      // Find latest closure to determine start of shift
      const { data: dataUltimoCierre } = await supabase
        .from("cierres_caja")
        .select("*")
        .order("fecha_cierre", { ascending: false })
        .limit(1);

      const lastClosure = dataUltimoCierre && dataUltimoCierre.length > 0 ? (dataUltimoCierre[0] as CierreCaja) : null;
      setUltimoCierre(lastClosure);

      const fechaInicio = lastClosure
        ? lastClosure.fecha_cierre
        : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

      // Query sales since fechaInicio
      let queryVentas = supabase
        .from("ventas")
        .select("id, fecha, total, items_vendidos")
        .gte("fecha", fechaInicio)
        .order("fecha", { ascending: true });

      const { data: dataVentas, error: errorVentas } = await queryVentas;

      if (errorVentas) {
        throw new Error(errorVentas.message);
      }

      setVentasTurno(
        (dataVentas ?? []).map((row) => ({
          id: row.id,
          fecha: row.fecha,
          total: Number(row.total),
          items_vendidos: Array.isArray(row.items_vendidos) ? row.items_vendidos : [],
        }))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar datos del turno.";
      setErrorTurno(msg);
      setVentasTurno([]);
    }
  }, [supabase]);

  // 2. Load History of Past Closures
  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);
    try {
      const { data, error: errHistorial } = await supabase
        .from("cierres_caja")
        .select("*")
        .order("fecha_cierre", { ascending: false });

      if (errHistorial) {
        // If table not created yet, return empty list gracefully
        setHistorialCierres([]);
        return;
      }

      setHistorialCierres(
        (data ?? []).map((row) => ({
          ...row,
          total_ventas: Number(row.total_ventas),
          total_productos: Number(row.total_productos),
          total_servicios: Number(row.total_servicios),
          total_efectivo_esperado: Number(row.total_efectivo_esperado),
          total_transferencia_esperado: Number(row.total_transferencia_esperado),
          total_tarjeta_esperado: Number(row.total_tarjeta_esperado),
          efectivo_contado: Number(row.efectivo_contado),
          diferencia: Number(row.diferencia),
        }))
      );
    } catch {
      setHistorialCierres([]);
    } finally {
      setCargandoHistorial(false);
    }
  }, [supabase]);

  // Initial Load
  useEffect(() => {
    let activo = true;
    async function iniciar() {
      setCargandoTurno(true);
      await cargarDatosTurno();
      if (activo) setCargandoTurno(false);
    }
    void iniciar();
    return () => {
      activo = false;
    };
  }, [cargarDatosTurno]);

  useEffect(() => {
    if (tabPrincipal === "historial") {
      void cargarHistorial();
    }
  }, [tabPrincipal, cargarHistorial]);

  // Calculations for current shift
  const resumenTurno = useMemo(() => {
    let totalVentas = 0;
    let totalProductos = 0;
    let totalServicios = 0;
    let totalEfectivo = 0;
    let totalTransferencias = 0;
    let totalTarjetas = 0;

    const desgloseServicios: DesgloseServiciosCierre = {
      fotocopias: 0,
      impresiones: 0,
      laminados: 0,
      encolochados: 0,
      sublimados: 0,
      otros: 0,
    };

    for (const v of ventasTurno) {
      totalVentas += v.total;
      // Default payment method is efectivo (or in json if extended)
      totalEfectivo += v.total;

      for (const item of v.items_vendidos) {
        const itemSubtotal = item.precio_unitario * item.cantidad;

        if (item.tipo === "servicio" || item.servicio_id || item.codigo_servicio) {
          totalServicios += itemSubtotal;
          const cod = (item.codigo_servicio || "").toLowerCase();
          const nom = (item.nombre || "").toLowerCase();

          if (cod.includes("fotocopia") || nom.includes("fotocopia") || nom.includes("copia")) {
            desgloseServicios.fotocopias += itemSubtotal;
          } else if (cod.includes("impresion") || nom.includes("impresión") || nom.includes("impresion")) {
            desgloseServicios.impresiones += itemSubtotal;
          } else if (cod.includes("laminado") || nom.includes("laminado") || nom.includes("enmicado")) {
            desgloseServicios.laminados += itemSubtotal;
          } else if (cod.includes("encolochado") || nom.includes("encolochado") || nom.includes("espiral")) {
            desgloseServicios.encolochados += itemSubtotal;
          } else if (cod.includes("sublimad") || nom.includes("sublimad") || nom.includes("taza") || nom.includes("playera")) {
            desgloseServicios.sublimados += itemSubtotal;
          } else {
            desgloseServicios.otros += itemSubtotal;
          }
        } else {
          totalProductos += itemSubtotal;
        }
      }
    }

    return {
      totalVentas,
      totalProductos,
      totalServicios,
      desgloseServicios,
      totalEfectivo,
      totalTransferencias,
      totalTarjetas,
      totalTickets: ventasTurno.length,
    };
  }, [ventasTurno]);

  // Calculate counted physical cash
  const totalEfectivoContado = useMemo(() => {
    if (modoConteo === "directo") {
      return Math.max(0, parseFloat(montoManual) || 0);
    }
    const DENOMS = [
      { key: "b1000" as const, v: 1000 },
      { key: "b500" as const, v: 500 },
      { key: "b200" as const, v: 200 },
      { key: "b100" as const, v: 100 },
      { key: "b50" as const, v: 50 },
      { key: "b20" as const, v: 20 },
      { key: "m10" as const, v: 10 },
      { key: "m5" as const, v: 5 },
      { key: "m2" as const, v: 2 },
      { key: "m1" as const, v: 1 },
      { key: "m05" as const, v: 0.5 },
    ];
    let sum = 0;
    for (const d of DENOMS) {
      sum += (desgloseEfectivo[d.key] || 0) * d.v;
    }
    return sum;
  }, [modoConteo, montoManual, desgloseEfectivo]);

  const diferenciaTurno = totalEfectivoContado - resumenTurno.totalEfectivo;

  const estadoDiferencia: EstadoDiferenciaCierre =
    Math.abs(diferenciaTurno) < 0.01
      ? "cuadrado"
      : diferenciaTurno > 0
      ? "sobrante"
      : "faltante";

  // Execute and persist Cash Closure
  const handleGuardarCierre = async () => {
    if (ventasTurno.length === 0 && totalEfectivoContado === 0) {
      if (
        !window.confirm(
          "No hay ventas registradas en este turno y el efectivo contado es $0.00. ¿Deseas registrar este cierre de todos modos?"
        )
      ) {
        return;
      }
    }

    setGuardandoCierre(true);
    setErrorTurno(null);

    const ahoraIso = new Date().toISOString();
    const fechaInicioTurno = ultimoCierre
      ? ultimoCierre.fecha_cierre
      : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

    const payload = {
      fecha_cierre: ahoraIso,
      fecha_inicio_turno: fechaInicioTurno,
      fecha_fin_turno: ahoraIso,
      total_ventas: resumenTurno.totalVentas,
      total_productos: resumenTurno.totalProductos,
      total_servicios: resumenTurno.totalServicios,
      desglose_servicios: resumenTurno.desgloseServicios,
      total_efectivo_esperado: resumenTurno.totalEfectivo,
      total_transferencia_esperado: resumenTurno.totalTransferencias,
      total_tarjeta_esperado: resumenTurno.totalTarjetas,
      efectivo_contado: totalEfectivoContado,
      desglose_efectivo: modoConteo === "desglosado" ? desgloseEfectivo : {},
      diferencia: diferenciaTurno,
      estado_diferencia: estadoDiferencia,
      total_transacciones: resumenTurno.totalTickets,
      cajero: nombreCajero.trim() || "Cajero Principal",
      notas: notasCierre.trim() || null,
    };

    const { data, error: insertError } = await supabase
      .from("cierres_caja")
      .insert(payload)
      .select()
      .single();

    setGuardandoCierre(false);

    if (insertError) {
      setErrorTurno(
        `No se pudo guardar el cierre en Supabase: ${insertError.message}. Asegúrate de haber ejecutado la migración de 'cierres_caja' en el SQL Editor de Supabase.`
      );
      return;
    }

    setAvisoExito("¡Cierre de caja guardado con éxito!");
    setDesgloseEfectivo({});
    setMontoManual("");
    setNotasCierre("");

    if (data) {
      setCierreSeleccionado(data as CierreCaja);
    }

    await cargarDatosTurno();
  };

  // Filtered History
  const historialFiltrado = useMemo(() => {
    const ahora = new Date();
    const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
    const hace7Dias = hoyInicio - 7 * 24 * 60 * 60 * 1000;
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();

    const q = busquedaHistorial.trim().toLowerCase();

    return historialCierres.filter((c) => {
      const fechaCierre = new Date(c.fecha_cierre).getTime();

      if (filtroHistorial === "hoy" && fechaCierre < hoyInicio) return false;
      if (filtroHistorial === "7dias" && fechaCierre < hace7Dias) return false;
      if (filtroHistorial === "mes" && fechaCierre < inicioMes) return false;

      if (q) {
        const matchCajero = c.cajero.toLowerCase().includes(q);
        const matchFolio = c.id.toLowerCase().includes(q);
        const matchNotas = (c.notas || "").toLowerCase().includes(q);
        if (!matchCajero && !matchFolio && !matchNotas) return false;
      }

      return true;
    });
  }, [historialCierres, filtroHistorial, busquedaHistorial]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6">
      {/* Top Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <p className="text-xs font-medium text-stone-500">
            <Link href="/" className="hover:text-stone-800">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            Cierre de Caja
          </p>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              Cierre de Caja y Arqueo Diario
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs font-medium text-stone-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              <span>Turno Activo</span>
            </span>
          </div>
        </div>

        {/* Global Navigation Links */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/pos"
            className="rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-stone-800 transition"
          >
            Ir a Caja (POS)
          </Link>
          <Link
            href="/ventas"
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
          >
            Historial de Ventas
          </Link>
          <Link
            href="/inventario"
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
          >
            Inventario
          </Link>
          <Link
            href="/servicios"
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
          >
            Tarifas de Servicios
          </Link>
        </div>
      </header>

      {/* Mode Switcher Tabs */}
      <div className="mb-6 flex rounded-2xl bg-stone-100 p-1 text-xs font-bold sm:w-fit">
        <button
          type="button"
          onClick={() => setTabPrincipal("cierre_actual")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition cursor-pointer ${
            tabPrincipal === "cierre_actual"
              ? "bg-white text-stone-900 shadow-xs"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <ClockIcon className="h-4 w-4" />
          <span>Arqueo y Cierre del Turno Actual</span>
        </button>
        <button
          type="button"
          onClick={() => setTabPrincipal("historial")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition cursor-pointer ${
            tabPrincipal === "historial"
              ? "bg-white text-stone-900 shadow-xs"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <CalendarIcon className="h-4 w-4" />
          <span>Historial de Cierres Realizados</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {avisoExito && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-emerald-700" />
            <span>{avisoExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setAvisoExito(null)}
            className="text-emerald-700 hover:underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorTurno && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {errorTurno}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ARQUEO Y CIERRE DEL TURNO ACTUAL                                  */}
      {/* ========================================================================= */}
      {tabPrincipal === "cierre_actual" && (
        <div className="space-y-6">
          {/* Turn Overview Bar */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Resumen de Ventas del Turno
                </h2>
                <p className="text-xs text-stone-500">
                  {ultimoCierre
                    ? `Desde el último corte: ${new Date(ultimoCierre.fecha_cierre).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}`
                    : "Corte acumulado del día de hoy"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => cargarDatosTurno()}
                disabled={cargandoTurno}
                className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
              >
                <RefreshCwIcon className={`h-3.5 w-3.5 ${cargandoTurno ? "animate-spin" : ""}`} />
                <span>Actualizar Ventas</span>
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Vendido */}
              <div className="rounded-xl border border-stone-200 bg-stone-900 p-4 text-white">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Total Vendido en Turno
                </span>
                <span className="mt-1 block text-2xl font-black">
                  {money.format(resumenTurno.totalVentas)}
                </span>
                <span className="text-[11px] text-stone-400">
                  {resumenTurno.totalTickets} ticket(s) emitido(s)
                </span>
              </div>

              {/* Productos Físicos */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-600">
                  <BookOpenIcon className="h-3.5 w-3.5 text-stone-500" />
                  <span>Productos Físicos</span>
                </div>
                <span className="mt-1 block text-2xl font-black text-stone-900">
                  {money.format(resumenTurno.totalProductos)}
                </span>
                <span className="text-[11px] text-stone-500">
                  Inventario de papelería y snacks
                </span>
              </div>

              {/* Servicios Copistería */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-600">
                  <LayersIcon className="h-3.5 w-3.5 text-stone-500" />
                  <span>Servicios de Copistería</span>
                </div>
                <span className="mt-1 block text-2xl font-black text-stone-900">
                  {money.format(resumenTurno.totalServicios)}
                </span>
                <span className="text-[11px] text-stone-500">
                  Copias, impresiones, laminados...
                </span>
              </div>

              {/* Efectivo Esperado en Caja */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-600">
                  <BanknotesIcon className="h-3.5 w-3.5 text-stone-500" />
                  <span>Efectivo Esperado</span>
                </div>
                <span className="mt-1 block text-2xl font-black text-stone-900">
                  {money.format(resumenTurno.totalEfectivo)}
                </span>
                <span className="text-[11px] text-stone-500">
                  Dinero a conciliar en gaveta
                </span>
              </div>
            </div>

            {/* Detailed Services Breakdown Cards */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-stone-700 tracking-wider">
                <LayersIcon className="h-3.5 w-3.5 text-stone-500" />
                <span>Desglose por Categoría de Servicio Técnico</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-lg border border-stone-200 bg-white p-2.5">
                  <span className="block text-[11px] text-stone-500 font-medium">Fotocopias</span>
                  <span className="text-sm font-bold text-stone-900">
                    {money.format(resumenTurno.desgloseServicios.fotocopias)}
                  </span>
                </div>
                <div className="rounded-lg border border-stone-200 bg-white p-2.5">
                  <span className="block text-[11px] text-stone-500 font-medium">Impresiones</span>
                  <span className="text-sm font-bold text-stone-900">
                    {money.format(resumenTurno.desgloseServicios.impresiones)}
                  </span>
                </div>
                <div className="rounded-lg border border-stone-200 bg-white p-2.5">
                  <span className="block text-[11px] text-stone-500 font-medium">Laminados</span>
                  <span className="text-sm font-bold text-stone-900">
                    {money.format(resumenTurno.desgloseServicios.laminados)}
                  </span>
                </div>
                <div className="rounded-lg border border-stone-200 bg-white p-2.5">
                  <span className="block text-[11px] text-stone-500 font-medium">Encolochados</span>
                  <span className="text-sm font-bold text-stone-900">
                    {money.format(resumenTurno.desgloseServicios.encolochados)}
                  </span>
                </div>
                <div className="rounded-lg border border-stone-200 bg-white p-2.5">
                  <span className="block text-[11px] text-stone-500 font-medium">Sublimados</span>
                  <span className="text-sm font-bold text-stone-900">
                    {money.format(resumenTurno.desgloseServicios.sublimados)}
                  </span>
                </div>
                <div className="rounded-lg border border-stone-200 bg-white p-2.5">
                  <span className="block text-[11px] text-stone-500 font-medium">Otros Servicios</span>
                  <span className="text-sm font-bold text-stone-900">
                    {money.format(resumenTurno.desgloseServicios.otros)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Cash Reconciliation Board */}
          <CalculadoraEfectivo
            desglose={desgloseEfectivo}
            onChangeDesglose={setDesgloseEfectivo}
            montoManual={montoManual}
            onChangeMontoManual={setMontoManual}
            modoConteo={modoConteo}
            onChangeModoConteo={setModoConteo}
            totalEsperado={resumenTurno.totalEfectivo}
          />

          {/* Cashier Signature & Final Confirmation */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-stone-900">
              Finalizar y Registrar Cierre Oficial
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nombre del Cajero / Responsable
                </label>
                <input
                  type="text"
                  required
                  value={nombreCajero}
                  onChange={(e) => setNombreCajero(e.target.value)}
                  placeholder="Ej. Juan Pérez, Turno Matutino..."
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-900 outline-none focus:border-stone-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Notas / Observaciones del Turno (Opcional)
                </label>
                <input
                  type="text"
                  value={notasCierre}
                  onChange={(e) => setNotasCierre(e.target.value)}
                  placeholder="Ej. Se pagó proveedor de refrescos con $200 de caja..."
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-600"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={guardandoCierre}
                onClick={handleGuardarCierre}
                className="flex items-center gap-2 rounded-xl bg-stone-900 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-stone-800 active:scale-95 disabled:opacity-50 transition cursor-pointer"
              >
                <CheckCircleIcon className="h-4 w-4" />
                <span>{guardandoCierre ? "Guardando Cierre..." : "Guardar Cierre de Caja y Generar Comprobante"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HISTORIAL DE CIERRES                                              */}
      {/* ========================================================================= */}
      {tabPrincipal === "historial" && (
        <section className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          {/* Header & Filter Bar */}
          <div className="p-5 border-b border-stone-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-base font-bold text-stone-900">
                Historial de Cortes Realizados
              </h2>

              {/* Date Filters */}
              <div className="flex items-center rounded-xl bg-stone-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFiltroHistorial("todo")}
                  className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                    filtroHistorial === "todo"
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Todos ({historialCierres.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroHistorial("hoy")}
                  className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                    filtroHistorial === "hoy"
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroHistorial("7dias")}
                  className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                    filtroHistorial === "7dias"
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  7 días
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroHistorial("mes")}
                  className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                    filtroHistorial === "mes"
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Este mes
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative min-w-[240px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                <SearchIcon className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={busquedaHistorial}
                onChange={(e) => setBusquedaHistorial(e.target.value)}
                placeholder="Buscar por cajero, folio o nota..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-1.5 pl-9 pr-8 text-xs text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
              />
              {busquedaHistorial && (
                <button
                  type="button"
                  onClick={() => setBusquedaHistorial("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-stone-400 hover:text-stone-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Closures Table */}
          {cargandoHistorial ? (
            <div className="p-8 text-center text-xs text-stone-500">
              Cargando historial de cierres...
            </div>
          ) : historialFiltrado.length === 0 ? (
            <div className="p-8 text-center text-stone-500 space-y-1">
              <CalendarIcon className="h-8 w-8 mx-auto text-stone-300 mb-2" />
              <p className="text-sm font-semibold text-stone-700">No hay cierres registrados</p>
              <p className="text-xs text-stone-500">
                {busquedaHistorial
                  ? `No hay coincidencias para "${busquedaHistorial}"`
                  : "Los cortes de caja guardados se registrarán aquí para auditoría."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 uppercase tracking-wider text-stone-500 border-b border-stone-200 font-semibold">
                  <tr>
                    <th className="px-5 py-3">Fecha y Hora</th>
                    <th className="px-5 py-3">Cajero</th>
                    <th className="px-5 py-3">Total Ventas</th>
                    <th className="px-5 py-3">Físicos / Servicios</th>
                    <th className="px-5 py-3">Efectivo Contado</th>
                    <th className="px-5 py-3">Diferencia</th>
                    <th className="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {historialFiltrado.map((cierre) => {
                    const esCuadrado = Math.abs(cierre.diferencia) < 0.01;
                    const esSobrante = cierre.diferencia > 0.01;

                    return (
                      <tr key={cierre.id} className="hover:bg-stone-50/70 transition">
                        <td className="px-5 py-3">
                          <span className="font-bold text-stone-900 block">
                            {new Date(cierre.fecha_cierre).toLocaleDateString("es-MX", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-[11px] text-stone-500">
                            {new Date(cierre.fecha_cierre).toLocaleTimeString("es-MX", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>

                        <td className="px-5 py-3 font-medium text-stone-800">
                          {cierre.cajero}
                        </td>

                        <td className="px-5 py-3 font-bold text-stone-900">
                          {money.format(cierre.total_ventas)}
                        </td>

                        <td className="px-5 py-3 text-stone-600">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-stone-800">Físicos: {money.format(cierre.total_productos)}</span>
                            <span className="text-[11px] text-stone-500">Servicios: {money.format(cierre.total_servicios)}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3 font-bold text-stone-900">
                          {money.format(cierre.efectivo_contado)}
                        </td>

                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                              esCuadrado
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : esSobrante
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                          >
                            {esCuadrado
                              ? "Exacto"
                              : esSobrante
                              ? `+${money.format(cierre.diferencia)}`
                              : `-${money.format(Math.abs(cierre.diferencia))}`}
                          </span>
                        </td>

                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setCierreSeleccionado(cierre)}
                            className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-200 transition cursor-pointer"
                          >
                            <PrinterIcon className="h-3.5 w-3.5 text-stone-600" />
                            <span>Ver / Imprimir</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Detailed Modal for Past Closure */}
      <DetalleCierreModal
        cierre={cierreSeleccionado}
        onClose={() => setCierreSeleccionado(null)}
      />
    </main>
  );
}
