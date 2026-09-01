"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OperadorRecarga, RecargaBolsa, RecargaMovimiento } from "@/types/database";
import {
  XMarkIcon,
  WalletIcon,
  PlusIcon,
  CheckCircleIcon,
  SmartphoneIcon,
  RefreshCwIcon,
} from "@/components/pos/Icons";
import {
  getLocalBolsas,
  saveLocalBolsas,
  getLocalRecargasMovimientos,
  addLocalRecargaMovimiento,
} from "@/lib/recargasStorage";

const money = new Intl.NumberFormat("es-NI", {
  style: "currency",
  currency: "NIO",
  minimumFractionDigits: 2,
});

interface BolsasSaldoModalProps {
  isOpen: boolean;
  onClose: () => void;
  bolsas: RecargaBolsa[];
  onBolsasUpdated: (nuevasBolsas: RecargaBolsa[]) => void;
}

export function BolsasSaldoModal({
  isOpen,
  onClose,
  bolsas,
  onBolsasUpdated,
}: BolsasSaldoModalProps) {
  const supabase = useMemo(() => createClient(), []);

  // Form State
  const [modo, setModo] = useState<"compra" | "ajuste">("compra");
  const [operador, setOperador] = useState<OperadorRecarga>("tigo");
  const [monto, setMonto] = useState<string>("");
  const [pagoConEfectivoCaja, setPagoConEfectivoCaja] = useState<boolean>(true);
  const [notas, setNotas] = useState<string>("");
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // History State
  const [movimientos, setMovimientos] = useState<RecargaMovimiento[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState<boolean>(false);

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

  const cargarMovimientos = async () => {
    setCargandoHistorial(true);
    try {
      const { data, error } = await supabase
        .from("recargas_movimientos")
        .select("*")
        .order("fecha", { ascending: false })
        .limit(20);

      if (!error && data) {
        setMovimientos(data as RecargaMovimiento[]);
      } else {
        setMovimientos(getLocalRecargasMovimientos().slice(0, 20));
      }
    } catch {
      setMovimientos(getLocalRecargasMovimientos().slice(0, 20));
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setMonto("");
      setNotas("");
      void cargarMovimientos();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorMsg("Por favor ingresa un monto válido mayor a 0");
      return;
    }

    setGuardando(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const tipoRpc = modo === "compra" ? "compra_saldo" : "apertura_saldo";
    const notasTexto = notas.trim() || (modo === "compra" ? "Compra / Recarga de Saldo" : "Ajuste de Saldo Inicial");

    try {
      const { data, error } = await supabase.rpc("gestionar_saldo_bolsa", {
        p_operador: operador,
        p_tipo: tipoRpc,
        p_monto: montoNum,
        p_pago_con_efectivo_caja: modo === "compra" ? pagoConEfectivoCaja : false,
        p_notas: notasTexto,
      });

      if (error) {
        // Fallback local
        const currentBolsas = [...bolsas];
        const idx = currentBolsas.findIndex((b) => b.operador === operador);
        const saldoAnterior = idx >= 0 ? currentBolsas[idx].saldo_actual : 0;
        const saldoNuevo = modo === "compra" ? saldoAnterior + montoNum : montoNum;

        if (idx >= 0) {
          currentBolsas[idx] = {
            ...currentBolsas[idx],
            saldo_actual: saldoNuevo,
          };
        } else {
          currentBolsas.push({
            id: `local-${operador}`,
            operador,
            nombre_display: operador === "tigo" ? "Tigo" : "Claro",
            saldo_actual: saldoNuevo,
            color_hex: operador === "tigo" ? "#00377B" : "#DA291C",
          });
        }

        saveLocalBolsas(currentBolsas);
        onBolsasUpdated(currentBolsas);

        const newMov: RecargaMovimiento = {
          id: `mov-${Date.now()}`,
          operador,
          tipo: tipoRpc,
          monto_saldo: montoNum,
          comision: 0,
          total_cobrado_cliente: 0,
          pago_con_efectivo_caja: modo === "compra" ? pagoConEfectivoCaja : false,
          saldo_anterior: saldoAnterior,
          saldo_nuevo: saldoNuevo,
          notas: notasTexto,
          fecha: new Date().toISOString(),
        };
        addLocalRecargaMovimiento(newMov);
      } else {
        // Updated via RPC, fetch fresh bolsas
        const { data: dataBolsas } = await supabase
          .from("recargas_bolsas")
          .select("*");

        if (dataBolsas && dataBolsas.length > 0) {
          const mapped = dataBolsas as RecargaBolsa[];
          saveLocalBolsas(mapped);
          onBolsasUpdated(mapped);
        }
      }

      setSuccessMsg(
        modo === "compra"
          ? `¡Saldo de ${operador.toUpperCase()} recargado exitosamente con ${money.format(montoNum)}!`
          : `¡Saldo de ${operador.toUpperCase()} ajustado a ${money.format(montoNum)}!`
      );
      setMonto("");
      setNotas("");
      void cargarMovimientos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar el saldo";
      setErrorMsg(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => !guardando && onClose()}
      />

      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xl transition-all max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-900">
              <WalletIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Gestión de Bolsas de Recarga
              </h2>
              <p className="text-xs text-stone-500">
                Saldos disponibles, compra de saldo y apertura de turno
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Balance Cards Summary */}
          <div className="grid grid-cols-2 gap-3">
            {/* Tigo Card */}
            <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase text-blue-900 tracking-wider">
                  <SmartphoneIcon className="h-4 w-4 text-blue-700" />
                  Tigo
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-200/80 px-2 py-0.5 rounded-full">
                  Bolsa
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-950">
                {money.format(bolsaTigo.saldo_actual)}
              </div>
              <p className="text-[11px] text-blue-800/80 mt-0.5">Saldo disponible para recargas</p>
            </div>

            {/* Claro Card */}
            <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase text-red-900 tracking-wider">
                  <SmartphoneIcon className="h-4 w-4 text-red-700" />
                  Claro
                </span>
                <span className="text-[10px] font-bold text-red-700 bg-red-200/80 px-2 py-0.5 rounded-full">
                  Bolsa
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-red-950">
                {money.format(bolsaClaro.saldo_actual)}
              </div>
              <p className="text-[11px] text-red-800/80 mt-0.5">Saldo disponible para recargas</p>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
              <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Operation Form */}
          <form onSubmit={handleSubmit} className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3.5">
            {/* Mode selection tabs */}
            <div className="flex items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
              <div className="flex rounded-lg bg-stone-200/80 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModo("compra")}
                  className={`rounded-md px-3 py-1.5 transition cursor-pointer ${
                    modo === "compra"
                      ? "bg-white text-stone-900 shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  + Comprar / Ingresar Saldo
                </button>
                <button
                  type="button"
                  onClick={() => setModo("ajuste")}
                  className={`rounded-md px-3 py-1.5 transition cursor-pointer ${
                    modo === "ajuste"
                      ? "bg-white text-stone-900 shadow-2xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Ajustar Saldo Inicial
                </button>
              </div>

              <span className="text-[11px] text-stone-500 hidden sm:inline">
                {modo === "compra" ? "Suma al saldo actual" : "Reemplaza el saldo actual"}
              </span>
            </div>

            {/* Operator Selection */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Operador
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOperador("tigo")}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-black border transition cursor-pointer ${
                    operador === "tigo"
                      ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                      : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <SmartphoneIcon className="h-4 w-4" />
                  <span>TIGO (Saldo: {money.format(bolsaTigo.saldo_actual)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOperador("claro")}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-black border transition cursor-pointer ${
                    operador === "claro"
                      ? "border-red-600 bg-red-600 text-white shadow-xs"
                      : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <SmartphoneIcon className="h-4 w-4" />
                  <span>CLARO (Saldo: {money.format(bolsaClaro.saldo_actual)})</span>
                </button>
              </div>
            </div>

            {/* Amount input & presets */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                {modo === "compra" ? "Monto de saldo a ingresar ($)" : "Nuevo saldo inicial exacto ($)"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="Ej. 500"
                  className="w-36 rounded-xl border border-stone-300 bg-white p-2.5 text-center text-lg font-black text-stone-900 outline-none focus:border-stone-600"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[100, 200, 300, 500, 1000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMonto(val.toString())}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                        monto === val.toString()
                          ? "bg-stone-900 text-white"
                          : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cash Drawer payout checkbox (Only for Compra de saldo) */}
            {modo === "compra" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pagoConEfectivoCaja}
                    onChange={(e) => setPagoConEfectivoCaja(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">
                      Pagado con efectivo de la caja registradora
                    </span>
                    <span className="text-[11px] text-amber-800/90 block">
                      Se registrará una salida de efectivo de la gaveta, deduciéndose automáticamente en el Cierre de Caja.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Optional note */}
            <div>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Nota opcional (ej. Vendedor de ruta, depósito bancario, etc.)"
                className="w-full rounded-xl border border-stone-300 bg-white p-2 text-xs text-stone-900 outline-none focus:border-stone-600"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={guardando}
                className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-stone-800 active:scale-95 transition disabled:opacity-50 cursor-pointer"
              >
                {guardando ? (
                  <>
                    <RefreshCwIcon className="h-4 w-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4" />
                    <span>{modo === "compra" ? "Registrar Entrada de Saldo" : "Guardar Ajuste de Saldo"}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Recent movements list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Movimientos Recientes de Bolsas
              </h3>
              <button
                type="button"
                onClick={() => void cargarMovimientos()}
                className="text-[11px] font-bold text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCwIcon className={`h-3 w-3 ${cargandoHistorial ? "animate-spin" : ""}`} />
                <span>Actualizar</span>
              </button>
            </div>

            <div className="rounded-xl border border-stone-200 overflow-hidden text-xs">
              <div className="max-h-48 overflow-y-auto divide-y divide-stone-100">
                {movimientos.length === 0 ? (
                  <div className="p-4 text-center text-stone-400">
                    No hay movimientos registrados hoy.
                  </div>
                ) : (
                  movimientos.map((m) => {
                    const esTigo = m.operador === "tigo";
                    const esVenta = m.tipo === "venta_recarga";
                    const esCompra = m.tipo === "compra_saldo";

                    return (
                      <div
                        key={m.id}
                        className="p-2.5 flex items-center justify-between hover:bg-stone-50 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase text-white ${
                              esTigo ? "bg-blue-600" : "bg-red-600"
                            }`}
                          >
                            {m.operador}
                          </span>
                          <div>
                            <span className="font-bold text-stone-800 block">
                              {esVenta
                                ? `Venta Recarga ${m.numero_telefono ? `a ${m.numero_telefono}` : ""}`
                                : esCompra
                                ? "Compra / Recarga de Saldo"
                                : "Ajuste de Saldo"}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {new Date(m.fecha).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {m.pago_con_efectivo_caja ? " • Pagado con caja" : ""}
                              {m.notas ? ` • ${m.notas}` : ""}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-black block ${
                              esVenta ? "text-red-600" : "text-emerald-700"
                            }`}
                          >
                            {esVenta ? "-" : "+"}
                            {money.format(m.monto_saldo)}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            Saldo: {money.format(m.saldo_nuevo)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 pt-3 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
