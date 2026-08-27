"use client";

import { useEffect, useMemo, useState } from "react";
import type { CartItem, MetodoPago } from "@/types/database";
import {
  BanknotesIcon,
  XMarkIcon,
} from "./Icons";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  total: number;
  onConfirmSale: (metodo: MetodoPago, montoRecibido?: number) => Promise<void>;
  isProcessing: boolean;
  error: string | null;
}

export function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  total,
  onConfirmSale,
  isProcessing,
  error,
}: CheckoutModalProps) {
  const [montoRecibidoStr, setMontoRecibidoStr] = useState<string>("");

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMontoRecibidoStr(total > 0 ? total.toString() : "");
    }
  }, [isOpen, total]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isProcessing) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  const montoRecibido = parseFloat(montoRecibidoStr) || 0;
  const cambio = Math.max(0, montoRecibido - total);
  const faltante = Math.max(0, total - montoRecibido);

  const esValido = useMemo(() => {
    if (cartItems.length === 0 || total <= 0) return false;
    return montoRecibido >= total;
  }, [cartItems.length, total, montoRecibido]);

  // Generate suggested quick cash denominations
  const sugerenciasEfectivo = useMemo(() => {
    if (total <= 0) return [];
    const billetes = [20, 50, 100, 200, 500, 1000];
    const lista = new Set<number>();
    lista.add(total); // Exact amount

    for (const b of billetes) {
      if (b > total) {
        lista.add(b);
      } else {
        const proximo = Math.ceil(total / b) * b;
        if (proximo > total) lista.add(proximo);
      }
    }

    return Array.from(lista).sort((a, b) => a - b).slice(0, 5);
  }, [total]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!esValido || isProcessing) return;
    await onConfirmSale("efectivo", montoRecibido);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => !isProcessing && onClose()}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-stone-900">Cobrar Venta</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                <BanknotesIcon className="h-3.5 w-3.5" />
                Solo Efectivo
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {cartItems.length} artículo(s) en caja
            </p>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Total to pay display */}
          <div className="rounded-xl bg-stone-50 p-4 text-center border border-stone-200/80">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
              Total a Pagar
            </span>
            <div className="mt-1 text-3xl font-black tracking-tight text-stone-900">
              {money.format(total)}
            </div>
          </div>

          {/* Cash section with change calculator */}
          <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/50 p-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Monto Recibido
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400 font-semibold text-sm">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={montoRecibidoStr}
                  onChange={(e) => setMontoRecibidoStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-7 pr-3 text-base font-semibold text-stone-900 outline-none focus:border-stone-600 focus:ring-1 focus:ring-stone-600"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick suggestion chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-stone-500 font-medium mr-1">
                Atajos:
              </span>
              {sugerenciasEfectivo.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setMontoRecibidoStr(sug.toString())}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                    montoRecibido === sug
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  {sug === total ? "Exacto" : `$${sug}`}
                </button>
              ))}
            </div>

            {/* Change / Shortage indicator */}
            <div className="border-t border-stone-200/80 pt-3">
              {montoRecibido >= total ? (
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 text-emerald-900 border border-emerald-200">
                  <span className="text-xs font-semibold">Cambio a entregar:</span>
                  <span className="text-xl font-black">{money.format(cambio)}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3 text-amber-900 border border-amber-200">
                  <span className="text-xs font-semibold">Faltante por cubrir:</span>
                  <span className="text-base font-bold">{money.format(faltante)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              className="w-1/3 rounded-xl border border-stone-300 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 active:scale-95 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!esValido || isProcessing}
              className="w-2/3 flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 active:scale-[0.99] transition disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Procesando venta…</span>
                </>
              ) : (
                <span>Confirmar Cobro ({money.format(total)})</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
