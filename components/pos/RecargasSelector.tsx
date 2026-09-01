"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OperadorRecarga, RecargaBolsa, CartItemRecarga } from "@/types/database";
import {
  SmartphoneIcon,
  PlusIcon,
  WalletIcon,
  AlertTriangleIcon,
  PencilIcon,
  CheckCircleIcon,
  XMarkIcon,
  RefreshCwIcon,
} from "@/components/pos/Icons";
import { saveLocalBolsas, addLocalRecargaMovimiento } from "@/lib/recargasStorage";

const money = new Intl.NumberFormat("es-NI", {
  style: "currency",
  currency: "NIO",
  minimumFractionDigits: 2,
});

interface RecargasSelectorProps {
  bolsas: RecargaBolsa[];
  onAddRecargaToCart: (item: Omit<CartItemRecarga, "id">) => void;
  onOpenBolsasModal: () => void;
  onBolsasUpdated?: (nuevasBolsas: RecargaBolsa[]) => void;
}

export function RecargasSelector({
  bolsas,
  onAddRecargaToCart,
  onOpenBolsasModal,
  onBolsasUpdated,
}: RecargasSelectorProps) {
  const supabase = useMemo(() => createClient(), []);

  // Selection state
  const [operador, setOperador] = useState<OperadorRecarga>("tigo");
  const [telefono, setTelefono] = useState<string>("");
  const [montoRecarga, setMontoRecarga] = useState<string>("50");
  const [comision, setComision] = useState<string>("5");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Inline Quick Edit Balance State
  const [isEditingSaldos, setIsEditingSaldos] = useState<boolean>(false);
  const [modoEdicionSaldo, setModoEdicionSaldo] = useState<"fijar" | "sumar">("fijar");
  const [nuevoSaldoTigo, setNuevoSaldoTigo] = useState<string>("");
  const [nuevoSaldoClaro, setNuevoSaldoClaro] = useState<string>("");
  const [pagoEfectivoCaja, setPagoEfectivoCaja] = useState<boolean>(true);
  const [guardandoSaldos, setGuardandoSaldos] = useState<boolean>(false);
  const [avisoExitoEdicion, setAvisoExitoEdicion] = useState<string | null>(null);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

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

  const handleOpenEditSaldos = (op?: OperadorRecarga) => {
    setErrorEdicion(null);
    setAvisoExitoEdicion(null);
    setModoEdicionSaldo("fijar");
    setNuevoSaldoTigo(bolsaTigo.saldo_actual.toString());
    setNuevoSaldoClaro(bolsaClaro.saldo_actual.toString());
    if (op) {
      setOperador(op);
    }
    setIsEditingSaldos(true);
  };

  const handleGuardarSaldos = async (operadorEspecifico?: OperadorRecarga) => {
    setGuardandoSaldos(true);
    setErrorEdicion(null);
    setAvisoExitoEdicion(null);

    const operadoresAActualizar: OperadorRecarga[] = operadorEspecifico
      ? [operadorEspecifico]
      : ["tigo", "claro"];

    try {
      const nuevasBolsas = [...bolsas];

      for (const op of operadoresAActualizar) {
        const valStr = op === "tigo" ? nuevoSaldoTigo : nuevoSaldoClaro;
        const valNum = parseFloat(valStr);

        if (isNaN(valNum) || valNum < 0) {
          continue; // Skip if empty or invalid
        }

        const idx = nuevasBolsas.findIndex((b) => b.operador === op);
        const saldoAnterior = idx >= 0 ? nuevasBolsas[idx].saldo_actual : 0;
        let saldoNuevo = valNum;
        let tipoRpc: "apertura_saldo" | "compra_saldo" = "apertura_saldo";

        if (modoEdicionSaldo === "sumar") {
          tipoRpc = "compra_saldo";
          saldoNuevo = saldoAnterior + valNum;
        }

        // 1. Try Supabase RPC
        const { error } = await supabase.rpc("gestionar_saldo_bolsa", {
          p_operador: op,
          p_tipo: tipoRpc,
          p_monto: valNum,
          p_pago_con_efectivo_caja: modoEdicionSaldo === "sumar" ? pagoEfectivoCaja : false,
          p_notas: modoEdicionSaldo === "sumar" ? "Compra rápida desde POS" : "Ajuste de saldo desde POS",
        });

        // 2. Update local state
        if (idx >= 0) {
          nuevasBolsas[idx] = {
            ...nuevasBolsas[idx],
            saldo_actual: saldoNuevo,
          };
        } else {
          nuevasBolsas.push({
            id: `local-${op}`,
            operador: op,
            nombre_display: op === "tigo" ? "Tigo" : "Claro",
            saldo_actual: saldoNuevo,
            color_hex: op === "tigo" ? "#00377B" : "#DA291C",
          });
        }

        // Record movement locally if RPC failed
        if (error) {
          addLocalRecargaMovimiento({
            id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            operador: op,
            tipo: tipoRpc,
            monto_saldo: valNum,
            comision: 0,
            total_cobrado_cliente: 0,
            pago_con_efectivo_caja: modoEdicionSaldo === "sumar" ? pagoEfectivoCaja : false,
            saldo_anterior: saldoAnterior,
            saldo_nuevo: saldoNuevo,
            notas: "Ajuste directo desde POS",
            fecha: new Date().toISOString(),
          });
        }
      }

      saveLocalBolsas(nuevasBolsas);
      if (onBolsasUpdated) {
        onBolsasUpdated(nuevasBolsas);
      }

      setAvisoExitoEdicion("¡Saldos actualizados correctamente!");
      setTimeout(() => {
        setIsEditingSaldos(false);
        setAvisoExitoEdicion(null);
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar saldo";
      setErrorEdicion(msg);
    } finally {
      setGuardandoSaldos(false);
    }
  };

  const handleTelefonoChange = (val: string) => {
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
        `Saldo insuficiente en ${operador.toUpperCase()} (Disponible: ${money.format(saldoDisponible)}). Ajusta o recarga el saldo primero.`
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

    setTelefono("");
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Top Banner with Balances & Quick Edit Buttons */}
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

        {/* Live Balance Floats and Edit Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Tigo Pill */}
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

          {/* Claro Pill */}
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

          {/* Direct Edit Button right in the tab */}
          <button
            type="button"
            onClick={() => (isEditingSaldos ? setIsEditingSaldos(false) : handleOpenEditSaldos())}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-xs ${
              isEditingSaldos
                ? "bg-amber-400 text-stone-950 font-black ring-2 ring-amber-300"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
            title="Editar o ajustar saldos de Tigo y Claro directamente"
          >
            <PencilIcon className="h-3.5 w-3.5" />
            <span>{isEditingSaldos ? "Cerrar Edición" : "Editar Saldo"}</span>
          </button>

          {/* Full modal button for deep movements history */}
          <button
            type="button"
            onClick={onOpenBolsasModal}
            className="flex items-center gap-1 rounded-xl bg-white/15 hover:bg-white/25 px-2.5 py-1.5 text-xs font-semibold text-stone-300 hover:text-white transition cursor-pointer"
            title="Historial de Movimientos y Auditoría"
          >
            <WalletIcon className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Historial</span>
          </button>
        </div>
      </div>

      {/* Inline Balance Editor Panel (When Active) */}
      {isEditingSaldos && (
        <div className="bg-amber-50/90 border-b border-amber-200 p-4 sm:p-5 transition-all space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-2xs">
                <PencilIcon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide">
                  Editar / Ajustar Saldos de Bolsas
                </h3>
                <p className="text-[11px] text-amber-800">
                  Modifica directamente el saldo disponible para Tigo y Claro
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingSaldos(false)}
              className="rounded-lg p-1.5 text-amber-800 hover:bg-amber-200/60 transition cursor-pointer"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModoEdicionSaldo("fijar")}
              className={`flex-1 rounded-xl py-2 px-3 text-xs font-bold transition cursor-pointer ${
                modoEdicionSaldo === "fijar"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-white text-stone-700 border border-amber-300 hover:bg-amber-100/50"
              }`}
            >
              Fijar saldo exacto (Ajuste / Saldo Inicial)
            </button>
            <button
              type="button"
              onClick={() => setModoEdicionSaldo("sumar")}
              className={`flex-1 rounded-xl py-2 px-3 text-xs font-bold transition cursor-pointer ${
                modoEdicionSaldo === "sumar"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-white text-stone-700 border border-amber-300 hover:bg-amber-100/50"
              }`}
            >
              Sumar saldo (+ Compra / Reposición)
            </button>
          </div>

          {/* Form Grid for Both Operators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* TIGO Box */}
            <div className="rounded-xl border border-blue-200 bg-white p-3.5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  Bolsa TIGO
                </span>
                <span className="text-[11px] font-bold text-stone-500">
                  Actual: {money.format(bolsaTigo.saldo_actual)}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  {modoEdicionSaldo === "fijar" ? "Nuevo Saldo Total ($)" : "Monto a Sumar ($)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={nuevoSaldoTigo}
                  onChange={(e) => setNuevoSaldoTigo(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-blue-300 bg-blue-50/30 px-3 py-2 text-base font-black text-blue-950 outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={guardandoSaldos}
                  onClick={() => handleGuardarSaldos("tigo")}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  Guardar Tigo
                </button>
              </div>
            </div>

            {/* CLARO Box */}
            <div className="rounded-xl border border-red-200 bg-white p-3.5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-red-900 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                  Bolsa CLARO
                </span>
                <span className="text-[11px] font-bold text-stone-500">
                  Actual: {money.format(bolsaClaro.saldo_actual)}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  {modoEdicionSaldo === "fijar" ? "Nuevo Saldo Total ($)" : "Monto a Sumar ($)"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={nuevoSaldoClaro}
                  onChange={(e) => setNuevoSaldoClaro(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-red-300 bg-red-50/30 px-3 py-2 text-base font-black text-red-950 outline-none focus:border-red-600 focus:bg-white"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={guardandoSaldos}
                  onClick={() => handleGuardarSaldos("claro")}
                  className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  Guardar Claro
                </button>
              </div>
            </div>
          </div>

          {/* Cash drawer checkbox if mode is 'sumar' */}
          {modoEdicionSaldo === "sumar" && (
            <label className="flex items-center gap-2 text-xs font-medium text-amber-900 bg-amber-100/60 p-2.5 rounded-xl border border-amber-200/80 cursor-pointer">
              <input
                type="checkbox"
                checked={pagoEfectivoCaja}
                onChange={(e) => setPagoEfectivoCaja(e.target.checked)}
                className="h-4 w-4 rounded text-stone-900 accent-stone-900"
              />
              <span>
                <strong>Registrar como salida de efectivo de caja</strong> (se descontará del arqueo en el Cierre de Caja)
              </span>
            </label>
          )}

          {errorEdicion && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 font-semibold">
              {errorEdicion}
            </div>
          )}

          {avisoExitoEdicion && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
              <span>{avisoExitoEdicion}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setIsEditingSaldos(false)}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={guardandoSaldos}
              onClick={() => handleGuardarSaldos()}
              className="flex items-center gap-1.5 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-black text-white shadow-xs hover:bg-stone-800 active:scale-95 transition disabled:opacity-50 cursor-pointer"
            >
              <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
              <span>{guardandoSaldos ? "Guardando..." : "Guardar Ambos Saldos"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Body Form for Selling Recharges */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 max-w-xl mx-auto w-full">
        {/* Operator Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-stone-700">
              1. Selecciona el Operador
            </label>
            <button
              type="button"
              onClick={() => handleOpenEditSaldos()}
              className="text-[11px] font-bold text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer transition"
            >
              <PencilIcon className="h-3 w-3 text-stone-400" />
              <span>Editar saldos</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tigo Card */}
            <div
              onClick={() => setOperador("tigo")}
              className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer relative group ${
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

              {/* Quick Edit pill */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditSaldos("tigo");
                }}
                className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-100 hover:bg-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800 transition"
                title="Editar saldo de Tigo"
              >
                <PencilIcon className="h-2.5 w-2.5" />
                <span>Editar</span>
              </button>
            </div>

            {/* Claro Card */}
            <div
              onClick={() => setOperador("claro")}
              className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer relative group ${
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

              {/* Quick Edit pill */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditSaldos("claro");
                }}
                className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-100 hover:bg-red-200 px-2 py-0.5 text-[10px] font-bold text-red-800 transition"
                title="Editar saldo de Claro"
              >
                <PencilIcon className="h-2.5 w-2.5" />
                <span>Editar</span>
              </button>
            </div>
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
              onClick={() => handleOpenEditSaldos(operador)}
              className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-700 transition cursor-pointer"
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
