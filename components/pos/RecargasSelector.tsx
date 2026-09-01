"use client";

import { useState } from "react";
import type { OperadorRecarga, RecargaBolsa, CartItemRecarga } from "@/types/database";
import {
  SmartphoneIcon,
  PlusIcon,
  WalletIcon,
  AlertTriangleIcon,
} from "@/components/pos/Icons";

const money = new Intl.NumberFormat("es-NI", {
  style: "currency",
  currency: "NIO",
  minimumFractionDigits: 2,
});

interface RecargasSelectorProps {
  bolsas: RecargaBolsa[];
  onAddRecargaToCart: (item: Omit<CartItemRecarga, "id">) => void;
  onOpenBolsasModal: () => void;
}

export function RecargasSelector({
  bolsas,
  onAddRecargaToCart,
  onOpenBolsasModal,
}: RecargasSelectorProps) {
  // Selection state
  const [operador, setOperador] = useState<OperadorRecarga>("tigo");
  const [telefono, setTelefono] = useState<string>("");
  const [montoRecarga, setMontoRecarga] = useState<string>("50");
  const [comision, setComision] = useState<string>("5");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const bolsaTigo = bolsas.find((b) => b.operador === "tigo") || {
    id: "tigo",
    operador: "tigo",
    nombre_display: "Tigo",
    saldo_actual: 0,
    color_hex: "#00377B",
  };

  const bolsaClaro = bolsas.find((b) => b.operador === "claro") || {
    id: "claro",
    operador: "claro",
    nombre_display: "Claro",
    saldo_actual: 0,
    color_hex: "#DA291C",
  };

  const saldoDisponible = operador === "tigo" ? bolsaTigo.saldo_actual : bolsaClaro.saldo_actual;
  const montoNum = Math.max(0, parseFloat(montoRecarga) || 0);
  const comisionNum = Math.max(0, parseFloat(comision) || 0);
  const totalCobro = montoNum + comisionNum;
  const saldoInsuficiente = montoNum > saldoDisponible;

  const handleTelefonoChange = (val: string) => {
    // Keep only numbers and max 8 digits
    const clean = val.replace(/\D/g, "").slice(0, 8);
    setTelefono(clean);
  };

  const handleAddRecarga = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorLocal(null);

    if (montoNum <= 0) {
      setErrorLocal("Ingresa un monto de recarga válido");
      return;
    }

    if (saldoInsuficiente) {
      setErrorLocal(
        `Saldo insuficiente en ${operador.toUpperCase()} (Disponible: ${money.format(saldoDisponible)}). Recarga saldo a la bolsa primero.`
      );
      return;
    }

    const telFormateado =
      telefono.length === 8 ? `${telefono.slice(0, 4)}-${telefono.slice(4)}` : telefono;

    const opLabel = operador === "tigo" ? "TIGO" : "CLARO";
    const desc = telFormateado
      ? `Tel: ${telFormateado} ($${montoNum} + $${comisionNum} com.)`
      : `$${montoNum} + $${comisionNum} com.`;

    onAddRecargaToCart({
      tipo: "recarga",
      operador,
      numero_telefono: telFormateado,
      monto_recarga: montoNum,
      comision: comisionNum,
      precio_unitario: totalCobro,
      cantidad: 1,
      nombre: `Recarga ${opLabel}`,
      descripcion_personalizada: desc,
    });

    // Reset phone for next customer, keep amounts
    setTelefono("");
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Top Banner with Balances & Manage Button */}
      <div className="bg-stone-900 text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
            <SmartphoneIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
              Recargas Telefónicas
            </h2>
            <p className="text-[11px] text-stone-300">
              Venta rápida de saldo Tigo y Claro con comisión variable
            </p>
          </div>
        </div>

        {/* Live Balance Floats */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOperador("tigo")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer ${
              operador === "tigo"
                ? "bg-blue-600 text-white ring-2 ring-white/30 shadow-xs"
                : "bg-white/10 text-stone-200 hover:bg-white/20"
            }`}
          >
            <span>TIGO:</span>
            <span>{money.format(bolsaTigo.saldo_actual)}</span>
          </button>

          <button
            type="button"
            onClick={() => setOperador("claro")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer ${
              operador === "claro"
                ? "bg-red-600 text-white ring-2 ring-white/30 shadow-xs"
                : "bg-white/10 text-stone-200 hover:bg-white/20"
            }`}
          >
            <span>CLARO:</span>
            <span>{money.format(bolsaClaro.saldo_actual)}</span>
          </button>

          <button
            type="button"
            onClick={onOpenBolsasModal}
            className="flex items-center gap-1 rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-bold text-white transition cursor-pointer ml-1"
            title="Administrar / Comprar Saldo"
          >
            <WalletIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Bolsas</span>
          </button>
        </div>
      </div>

      {/* Main Body Form */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 max-w-xl mx-auto w-full">
        {/* Operator Selection */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1.5">
            1. Selecciona el Operador
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOperador("tigo")}
              className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                operador === "tigo"
                  ? "border-blue-600 bg-blue-50/80 ring-2 ring-blue-600 shadow-xs"
                  : "border-stone-200 bg-white hover:border-stone-300"
              }`}
            >
              <div className="text-base font-black text-blue-900 tracking-wider">
                TIGO
              </div>
              <div className="text-xs font-bold text-blue-700 mt-0.5">
                Saldo: {money.format(bolsaTigo.saldo_actual)}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setOperador("claro")}
              className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                operador === "claro"
                  ? "border-red-600 bg-red-50/80 ring-2 ring-red-600 shadow-xs"
                  : "border-stone-200 bg-white hover:border-stone-300"
              }`}
            >
              <div className="text-base font-black text-red-900 tracking-wider">
                CLARO
              </div>
              <div className="text-xs font-bold text-red-700 mt-0.5">
                Saldo: {money.format(bolsaClaro.saldo_actual)}
              </div>
            </button>
          </div>
        </div>

        {/* Low balance alert */}
        {saldoInsuficiente && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-900">
            <AlertTriangleIcon className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <strong>Saldo insuficiente en {operador.toUpperCase()}:</strong> Tienes {money.format(saldoDisponible)} y necesitas {money.format(montoNum)}.
            </div>
            <button
              type="button"
              onClick={onOpenBolsasModal}
              className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-700 transition"
            >
              + Saldo
            </button>
          </div>
        )}

        {/* Phone number input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-stone-700">
            2. Número de Teléfono (8 dígitos)
          </label>
          <div className="relative">
            <input
              type="tel"
              maxLength={8}
              value={telefono}
              onChange={(e) => handleTelefonoChange(e.target.value)}
              placeholder="Ej. 88889999"
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-center text-xl font-mono font-black tracking-widest text-stone-900 outline-none focus:border-stone-700 shadow-2xs"
            />
            {telefono.length > 0 && (
              <span className="absolute right-3.5 top-3.5 text-xs font-bold text-stone-400">
                {telefono.length}/8
              </span>
            )}
          </div>
        </div>

        {/* Amount to recharge */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2.5">
          <label className="block text-xs font-bold text-stone-700">
            3. Monto de Saldo a Enviar ($)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              step="1"
              value={montoRecarga}
              onChange={(e) => setMontoRecarga(e.target.value)}
              className="w-32 rounded-xl border border-stone-300 bg-white p-2.5 text-center text-lg font-black text-stone-900 outline-none focus:border-stone-600"
            />
            <div className="flex flex-wrap gap-1.5">
              {["10", "20", "30", "50", "100", "150", "200"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setMontoRecarga(p)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                    montoRecarga === p
                      ? "bg-stone-900 text-white"
                      : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  ${p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Commission / Service Fee */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-stone-700">
              4. Comisión de Ganancia ($)
            </label>
            <span className="text-[11px] text-stone-500 font-medium">
              Ganancia neta para la librería
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              step="0.5"
              value={comision}
              onChange={(e) => setComision(e.target.value)}
              className="w-32 rounded-xl border border-stone-300 bg-white p-2.5 text-center text-lg font-black text-emerald-800 outline-none focus:border-emerald-600"
            />
            <div className="flex flex-wrap gap-1.5">
              {["0", "2", "3", "5", "10"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setComision(c)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                    comision === c
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {c === "0" ? "Sin com." : `+$${c}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {errorLocal && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
            {errorLocal}
          </div>
        )}

        {/* Calculation summary & Add to cart button */}
        <div className="rounded-xl border border-stone-200 bg-stone-100/80 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-600 border-b border-stone-200 pb-2">
            <span>Saldo a enviar ({operador.toUpperCase()}):</span>
            <span className="font-bold text-stone-900">{money.format(montoNum)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-stone-600 border-b border-stone-200 pb-2">
            <span>Comisión de ganancia:</span>
            <span className="font-bold text-emerald-700">+{money.format(comisionNum)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-500">Total a cobrar al cliente:</span>
              <div className="text-2xl font-black text-stone-900">
                {money.format(totalCobro)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleAddRecarga()}
              disabled={montoNum <= 0 || saldoInsuficiente}
              className="flex items-center gap-2 rounded-xl bg-stone-900 px-6 py-3.5 text-xs font-extrabold text-white shadow-xs hover:bg-stone-800 active:scale-95 transition disabled:opacity-50 cursor-pointer"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Agregar al Carrito</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
