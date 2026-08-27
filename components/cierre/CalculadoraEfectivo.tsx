"use client";

import { useMemo } from "react";
import type { DesgloseEfectivo } from "@/types/database";
import { BanknotesIcon, CalculatorIcon } from "@/components/pos/Icons";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

interface CalculadoraEfectivoProps {
  desglose: DesgloseEfectivo;
  onChangeDesglose: (nuevoDesglose: DesgloseEfectivo) => void;
  montoManual: string;
  onChangeMontoManual: (val: string) => void;
  modoConteo: "desglosado" | "directo";
  onChangeModoConteo: (modo: "desglosado" | "directo") => void;
  totalEsperado: number;
}

const DENOMINACIONES_BILLETES = [
  { key: "b1000" as const, valor: 1000, label: "$1,000" },
  { key: "b500" as const, valor: 500, label: "$500" },
  { key: "b200" as const, valor: 200, label: "$200" },
  { key: "b100" as const, valor: 100, label: "$100" },
  { key: "b50" as const, valor: 50, label: "$50" },
  { key: "b20" as const, valor: 20, label: "$20" },
];

const DENOMINACIONES_MONEDAS = [
  { key: "m10" as const, valor: 10, label: "$10" },
  { key: "m5" as const, valor: 5, label: "$5" },
  { key: "m2" as const, valor: 2, label: "$2" },
  { key: "m1" as const, valor: 1, label: "$1" },
  { key: "m05" as const, valor: 0.5, label: "$0.50" },
];

export function CalculadoraEfectivo({
  desglose,
  onChangeDesglose,
  montoManual,
  onChangeMontoManual,
  modoConteo,
  onChangeModoConteo,
  totalEsperado,
}: CalculadoraEfectivoProps) {
  // Calculate total from denominations
  const totalDesglosado = useMemo(() => {
    let sum = 0;
    for (const b of DENOMINACIONES_BILLETES) {
      const cant = desglose[b.key] || 0;
      sum += cant * b.valor;
    }
    for (const m of DENOMINACIONES_MONEDAS) {
      const cant = desglose[m.key] || 0;
      sum += cant * m.valor;
    }
    return sum;
  }, [desglose]);

  const totalEfectivoContado =
    modoConteo === "desglosado"
      ? totalDesglosado
      : Math.max(0, parseFloat(montoManual) || 0);

  const diferencia = totalEfectivoContado - totalEsperado;

  const handleCantidadChange = (key: keyof DesgloseEfectivo, valStr: string) => {
    const cant = Math.max(0, parseInt(valStr, 10) || 0);
    onChangeDesglose({
      ...desglose,
      [key]: cant,
    });
  };

  const handleLimpiarConteo = () => {
    onChangeDesglose({});
    onChangeMontoManual("");
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
      {/* Header and Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
            <CalculatorIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Arqueo de Efectivo Físico
            </h3>
            <p className="text-xs text-stone-500">
              Cuenta el dinero en la gaveta para cuadrar el turno.
            </p>
          </div>
        </div>

        {/* Mode switcher */}
        <div className="flex items-center rounded-xl bg-stone-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onChangeModoConteo("desglosado")}
            className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
              modoConteo === "desglosado"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Por Billetes y Monedas
          </button>
          <button
            type="button"
            onClick={() => onChangeModoConteo("directo")}
            className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
              modoConteo === "directo"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Monto Total Directo
          </button>
        </div>
      </div>

      {/* Mode 1: Denomination Breakdown */}
      {modoConteo === "desglosado" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Column 1: Billetes */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-stone-600 tracking-wider">
                <BanknotesIcon className="h-3.5 w-3.5" />
                <span>Billetes</span>
              </div>
              <div className="space-y-1.5">
                {DENOMINACIONES_BILLETES.map((b) => {
                  const cant = desglose[b.key] || "";
                  const sub = ((desglose[b.key] || 0) * b.valor);

                  return (
                    <div
                      key={b.key}
                      className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs"
                    >
                      <span className="font-bold text-stone-800 w-16">
                        {b.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-400">&times;</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={cant}
                          onChange={(e) => handleCantidadChange(b.key, e.target.value)}
                          placeholder="0"
                          className="w-16 rounded-lg border border-stone-300 bg-white px-2 py-1 text-center font-bold text-stone-900 outline-none focus:border-stone-600"
                        />
                      </div>
                      <span className="w-20 text-right font-bold text-stone-900">
                        {money.format(sub)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Monedas */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-stone-600 tracking-wider">
                <CalculatorIcon className="h-3.5 w-3.5" />
                <span>Monedas</span>
              </div>
              <div className="space-y-1.5">
                {DENOMINACIONES_MONEDAS.map((m) => {
                  const cant = desglose[m.key] || "";
                  const sub = ((desglose[m.key] || 0) * m.valor);

                  return (
                    <div
                      key={m.key}
                      className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs"
                    >
                      <span className="font-bold text-stone-800 w-16">
                        {m.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-400">&times;</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={cant}
                          onChange={(e) => handleCantidadChange(m.key, e.target.value)}
                          placeholder="0"
                          className="w-16 rounded-lg border border-stone-300 bg-white px-2 py-1 text-center font-bold text-stone-900 outline-none focus:border-stone-600"
                        />
                      </div>
                      <span className="w-20 text-right font-bold text-stone-900">
                        {money.format(sub)}
                      </span>
                    </div>
                  );
                })}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleLimpiarConteo}
                    className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
                  >
                    Restablecer conteo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Direct Total Input */}
      {modoConteo === "directo" && (
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
          <label className="block text-xs font-bold text-stone-700">
            Total de Efectivo Contado en Gaveta ($)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              step="0.50"
              value={montoManual}
              onChange={(e) => onChangeMontoManual(e.target.value)}
              placeholder="0.00"
              className="w-48 rounded-xl border border-stone-300 bg-white px-3 py-2 text-base font-bold text-stone-900 outline-none focus:border-stone-600"
            />
            <span className="text-xs text-stone-500">
              Ingresa el monto total contado sin detallar denominaciones.
            </span>
          </div>
        </div>
      )}

      {/* Reconciliation Summary Bar */}
      <div className="rounded-xl border border-stone-200 bg-stone-100/70 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-center">
          {/* Esperado */}
          <div>
            <span className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              Efectivo Esperado en Sistema
            </span>
            <span className="text-lg font-bold text-stone-900">
              {money.format(totalEsperado)}
            </span>
          </div>

          {/* Físico Contado */}
          <div>
            <span className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              Efectivo Físico Contado
            </span>
            <span className="text-lg font-bold text-stone-900">
              {money.format(totalEfectivoContado)}
            </span>
          </div>

          {/* Diferencia */}
          <div className="rounded-lg border border-stone-300 bg-white p-2.5">
            <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Estado de Cuadratura
            </span>
            <div className="mt-0.5 flex items-baseline justify-between gap-2">
              <span
                className={`text-sm font-black ${
                  Math.abs(diferencia) < 0.01
                    ? "text-stone-900"
                    : diferencia > 0
                    ? "text-amber-800"
                    : "text-red-700"
                }`}
              >
                {Math.abs(diferencia) < 0.01
                  ? "Caja Cuadrada Exacta"
                  : diferencia > 0
                  ? `Sobrante: +${money.format(diferencia)}`
                  : `Faltante: -${money.format(Math.abs(diferencia))}`}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  Math.abs(diferencia) < 0.01
                    ? "bg-emerald-100 text-emerald-800"
                    : diferencia > 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {Math.abs(diferencia) < 0.01 ? "OK" : diferencia > 0 ? "+SOBRA" : "-FALTA"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
