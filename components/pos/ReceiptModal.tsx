"use client";

import { useEffect } from "react";
import type { MetodoPago, Venta } from "@/types/database";
import { CheckCircleIcon, PrinterIcon, PlusIcon } from "./Icons";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

interface ReceiptModalProps {
  isOpen: boolean;
  venta: Venta | null;
  metodoPago: MetodoPago;
  montoRecibido?: number;
  onNewSale: () => void;
}

export function ReceiptModal({
  isOpen,
  venta,
  metodoPago,
  montoRecibido = 0,
  onNewSale,
}: ReceiptModalProps) {
  // Handle escape or enter key for quick new sale
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isOpen && (e.key === "Enter" || e.key === "Escape")) {
        onNewSale();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onNewSale]);

  if (!isOpen || !venta) return null;

  const fechaFormateada = new Date(venta.fecha).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const cambio = Math.max(0, montoRecibido - venta.total);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity" />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
        {/* Success Header */}
        <div className="flex flex-col items-center text-center pb-4 border-b border-stone-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
            <CheckCircleIcon className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-stone-900">¡Venta Exitosa!</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Comprobante de venta generado correctamente.
          </p>
        </div>

        {/* Printable Receipt Paper */}
        <div
          id="ticket-imprimible"
          className="my-4 rounded-xl border border-stone-200 bg-stone-50/70 p-5 font-mono text-xs text-stone-800 space-y-3"
        >
          {/* Header */}
          <div className="text-center space-y-0.5 border-b border-dashed border-stone-300 pb-3">
            <p className="font-bold text-sm tracking-wide">Libreria San Rafael</p>
            <p className="text-[11px] text-stone-500">Ticket de Venta</p>
            <p className="text-[10px] text-stone-400">Folio: {venta.id.slice(0, 8)}</p>
            <p className="text-[10px] text-stone-500">{fechaFormateada}</p>
          </div>

          {/* Items Table */}
          <div className="space-y-1.5 border-b border-dashed border-stone-300 pb-3">
            <div className="flex justify-between font-bold text-stone-500 text-[10px] uppercase">
              <span>Cant. / Concepto</span>
              <span>Total</span>
            </div>
            {venta.items_vendidos.map((item, idx) => {
              const isServicio = item.tipo === "servicio" || !item.producto_id;
              return (
                <div key={idx} className="flex justify-between text-xs items-start gap-2">
                  <div className="flex-1">
                    <span className="font-semibold">{item.cantidad}x </span>
                    <span>{item.nombre}</span>
                    {item.descripcion_personalizada && (
                      <div className="text-[10px] text-stone-600 font-sans italic">
                        {item.descripcion_personalizada}
                      </div>
                    )}
                    <div className="text-[10px] text-stone-400">
                      @{money.format(item.precio_unitario)} c/u {isServicio ? "(Servicio)" : ""}
                    </div>
                  </div>
                  <div className="font-semibold whitespace-nowrap">
                    {money.format(item.precio_unitario * item.cantidad)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals & Payment */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-sm font-black pt-1">
              <span>TOTAL</span>
              <span>{money.format(venta.total)}</span>
            </div>
            <div className="flex justify-between text-stone-600 capitalize">
              <span>Método de pago:</span>
              <span>{metodoPago}</span>
            </div>
            {metodoPago === "efectivo" && (
              <>
                <div className="flex justify-between text-stone-600">
                  <span>Monto recibido:</span>
                  <span>{money.format(montoRecibido)}</span>
                </div>
                <div className="flex justify-between font-bold text-stone-800">
                  <span>Cambio entregado:</span>
                  <span>{money.format(cambio)}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer message */}
          <div className="text-center pt-2 border-t border-dashed border-stone-300 text-[11px] text-stone-500">
            ¡Gracias por su visita!
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-stone-300 py-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            <PrinterIcon className="h-4 w-4" />
            <span>Imprimir Ticket</span>
          </button>

          <button
            type="button"
            onClick={onNewSale}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 transition"
            autoFocus
          >
            <PlusIcon className="h-4 w-4" />
            <span>Nueva Venta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
