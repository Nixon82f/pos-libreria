"use client";

import { useEffect } from "react";
import type { CierreCaja } from "@/types/database";
import {
  XMarkIcon,
  PrinterIcon,
  LayersIcon,
  BookOpenIcon,
  BanknotesIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "@/components/pos/Icons";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

interface DetalleCierreModalProps {
  cierre: CierreCaja | null;
  onClose: () => void;
}

export function DetalleCierreModal({ cierre, onClose }: DetalleCierreModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && cierre) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cierre, onClose]);

  if (!cierre) return null;

  const handlePrint = () => {
    window.print();
  };

  const fechaCierreFormatted = new Date(cierre.fecha_cierre).toLocaleString(
    "es-MX",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );

  const fechaInicioFormatted = new Date(cierre.fecha_inicio_turno).toLocaleString(
    "es-MX",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  );

  const fechaFinFormatted = new Date(cierre.fecha_fin_turno).toLocaleString(
    "es-MX",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  );

  const esCuadrado = Math.abs(cierre.diferencia) < 0.01;
  const esSobrante = cierre.diferencia > 0.01;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 p-5 bg-stone-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-900">
                Auditoría de Cierre de Caja
              </h2>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                  esCuadrado
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : esSobrante
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {esCuadrado ? "Caja Cuadrada" : esSobrante ? `Sobrante (+${money.format(cierre.diferencia)})` : `Faltante (-${money.format(Math.abs(cierre.diferencia))})`}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Folio: {cierre.id.slice(0, 8).toUpperCase()} &middot; {fechaCierreFormatted} &middot; Cajero: {cierre.cajero}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer shadow-2xs"
            >
              <PrinterIcon className="h-4 w-4" />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition cursor-pointer"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable & Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 print:p-0">
          {/* Printable Store Header */}
          <div className="hidden print:block text-center border-b border-stone-200 pb-3 mb-3">
            <h1 className="text-lg font-bold">Librería San Rafael</h1>
            <p className="text-xs">Comprobante de Cierre de Turno y Arqueo</p>
            <p className="text-xs text-stone-500">
              {fechaInicioFormatted} a {fechaFinFormatted}
            </p>
          </div>

          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
              <span className="block text-[11px] font-semibold text-stone-500">Total Turno</span>
              <span className="text-lg font-bold text-stone-900">{money.format(cierre.total_ventas)}</span>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
              <span className="block text-[11px] font-semibold text-stone-500">Productos Físicos</span>
              <span className="text-lg font-bold text-stone-900">{money.format(cierre.total_productos)}</span>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
              <span className="block text-[11px] font-semibold text-stone-500">Servicios Copistería</span>
              <span className="text-lg font-bold text-stone-900">{money.format(cierre.total_servicios)}</span>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
              <span className="block text-[11px] font-semibold text-stone-500">Recargas Telefónicas</span>
              <span className="text-lg font-bold text-stone-900">{money.format(cierre.total_recargas || 0)}</span>
              {Boolean(cierre.total_comisiones_recargas) && (
                <span className="text-[10px] font-bold text-emerald-700 block">
                  +{money.format(cierre.total_comisiones_recargas || 0)} comisiones
                </span>
              )}
            </div>
          </div>

          {/* Section 1: Breakdown of Recargas if available */}
          {cierre.desglose_recargas && (
            <div className="rounded-xl border border-stone-200 bg-stone-50/40 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-stone-700 tracking-wider">
                <span>Auditoría de Recargas (Tigo / Claro)</span>
                <span className="text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                  Comisiones: +{money.format(cierre.desglose_recargas.total_comisiones || 0)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Tigo */}
                <div className="rounded-lg border border-blue-200 bg-white p-2.5 space-y-1">
                  <div className="flex justify-between font-bold text-blue-900">
                    <span>TIGO</span>
                    <span>Saldo Final: {money.format(cierre.desglose_recargas.tigo?.saldo_final_esperado || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500">
                    <span>Vendido: {money.format(cierre.desglose_recargas.tigo?.ventas || 0)}</span>
                    <span>Repuesto: {money.format(cierre.desglose_recargas.tigo?.compras_saldo || 0)}</span>
                  </div>
                </div>

                {/* Claro */}
                <div className="rounded-lg border border-red-200 bg-white p-2.5 space-y-1">
                  <div className="flex justify-between font-bold text-red-900">
                    <span>CLARO</span>
                    <span>Saldo Final: {money.format(cierre.desglose_recargas.claro?.saldo_final_esperado || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500">
                    <span>Vendido: {money.format(cierre.desglose_recargas.claro?.ventas || 0)}</span>
                    <span>Repuesto: {money.format(cierre.desglose_recargas.claro?.compras_saldo || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Breakdown of Services */}
          <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-stone-700 tracking-wider">
              <LayersIcon className="h-4 w-4 text-stone-500" />
              <span>Desglose de Servicios de Copistería</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-lg bg-stone-50 px-2.5 py-1.5 border border-stone-100">
                <span className="text-stone-600">Fotocopias:</span>
                <span className="font-bold text-stone-900">{money.format(cierre.desglose_servicios?.fotocopias || 0)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-stone-50 px-2.5 py-1.5 border border-stone-100">
                <span className="text-stone-600">Impresiones:</span>
                <span className="font-bold text-stone-900">{money.format(cierre.desglose_servicios?.impresiones || 0)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-stone-50 px-2.5 py-1.5 border border-stone-100">
                <span className="text-stone-600">Laminados:</span>
                <span className="font-bold text-stone-900">{money.format(cierre.desglose_servicios?.laminados || 0)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-stone-50 px-2.5 py-1.5 border border-stone-100">
                <span className="text-stone-600">Encolochados:</span>
                <span className="font-bold text-stone-900">{money.format(cierre.desglose_servicios?.encolochados || 0)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-stone-50 px-2.5 py-1.5 border border-stone-100">
                <span className="text-stone-600">Sublimados:</span>
                <span className="font-bold text-stone-900">{money.format(cierre.desglose_servicios?.sublimados || 0)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-stone-50 px-2.5 py-1.5 border border-stone-100">
                <span className="text-stone-600">Otros Servicios:</span>
                <span className="font-bold text-stone-900">{money.format(cierre.desglose_servicios?.otros || 0)}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Arqueo and Reconciliation */}
          <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-stone-700 tracking-wider">
              <BanknotesIcon className="h-4 w-4 text-stone-500" />
              <span>Arqueo y Conciliación de Efectivo</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-stone-50 p-3 border border-stone-200">
                <span className="block text-[11px] font-semibold text-stone-500">Efectivo Esperado</span>
                <span className="text-base font-bold text-stone-900">{money.format(cierre.total_efectivo_esperado)}</span>
              </div>

              <div className="rounded-lg bg-stone-50 p-3 border border-stone-200">
                <span className="block text-[11px] font-semibold text-stone-500">Efectivo Físico Contado</span>
                <span className="text-base font-bold text-stone-900">{money.format(cierre.efectivo_contado)}</span>
              </div>

              <div className={`rounded-lg p-3 border ${esCuadrado ? "bg-emerald-50/50 border-emerald-200" : esSobrante ? "bg-amber-50/50 border-amber-200" : "bg-red-50/50 border-red-200"}`}>
                <span className="block text-[11px] font-semibold text-stone-600">Diferencia Final</span>
                <span className={`text-base font-black ${esCuadrado ? "text-emerald-900" : esSobrante ? "text-amber-900" : "text-red-900"}`}>
                  {esCuadrado ? "$0.00 (Cuadrada)" : esSobrante ? `+${money.format(cierre.diferencia)}` : `-${money.format(Math.abs(cierre.diferencia))}`}
                </span>
              </div>
            </div>

            {/* Methods Breakdown */}
            <div className="flex flex-wrap gap-4 pt-1 border-t border-stone-100 text-xs text-stone-600">
              <span><strong>Efectivo:</strong> {money.format(cierre.total_efectivo_esperado)}</span>
              <span><strong>Transferencias:</strong> {money.format(cierre.total_transferencia_esperado)}</span>
              <span><strong>Tarjetas:</strong> {money.format(cierre.total_tarjeta_esperado)}</span>
            </div>
          </div>

          {/* Section 3: Notes / Observations */}
          {cierre.notas && (
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3.5 text-xs text-stone-700">
              <span className="font-bold block text-stone-900 mb-1">Notas / Observaciones del Cajero:</span>
              <p className="whitespace-pre-wrap">{cierre.notas}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 bg-stone-50/70 p-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
