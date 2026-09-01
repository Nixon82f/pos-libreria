"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ItemVendido, Venta } from "@/types/database";
import {
  PrinterIcon,
  XMarkIcon,
  TrashIcon,
  PlusIcon,
} from "@/components/pos/Icons";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

interface DetalleVentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  venta: Venta | null;
  onSaleUpdated?: (ventaActualizada: Venta) => void;
}

export function DetalleVentaModal({
  isOpen,
  onClose,
  venta,
  onSaleUpdated,
}: DetalleVentaModalProps) {
  const supabase = useMemo(() => createClient(), []);

  const [modoEdicion, setModoEdicion] = useState(false);
  const [itemsEditables, setItemsEditables] = useState<ItemVendido[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  // Sync state when modal opens or venta changes
  useEffect(() => {
    if (venta) {
      setItemsEditables(
        venta.items_vendidos.map((it) => ({
          tipo: it.tipo,
          producto_id: it.producto_id,
          servicio_id: it.servicio_id,
          codigo_servicio: it.codigo_servicio,
          nombre: it.nombre,
          descripcion_personalizada: it.descripcion_personalizada,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
        }))
      );
      setModoEdicion(false);
      setErrorEdicion(null);
    }
  }, [venta, isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !guardando) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, guardando, onClose]);

  if (!isOpen || !venta) return null;

  const fechaFormateada = new Date(venta.fecha).toLocaleString("es-MX", {
    dateStyle: "full",
    timeStyle: "medium",
  });

  const totalArticulos = venta.items_vendidos.reduce(
    (acc, item) => acc + item.cantidad,
    0
  );

  // Recalculated total for edited items
  const nuevoTotal = itemsEditables.reduce(
    (acc, it) => acc + (it.cantidad || 0) * (it.precio_unitario || 0),
    0
  );

  function handlePrint() {
    window.print();
  }

  function handleItemChange(
    index: number,
    field: keyof ItemVendido,
    val: string | number
  ) {
    setItemsEditables((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: val,
      };
      return copy;
    });
  }

  function handleRemoveItem(index: number) {
    if (itemsEditables.length <= 1) {
      setErrorEdicion("La venta debe contener al menos un artículo.");
      return;
    }
    setErrorEdicion(null);
    setItemsEditables((prev) => prev.filter((_, idx) => idx !== index));
  }

  function handleAddItem() {
    setErrorEdicion(null);
    setItemsEditables((prev) => [
      ...prev,
      {
        producto_id: "",
        nombre: "Artículo adicional",
        cantidad: 1,
        precio_unitario: 0,
      },
    ]);
  }

  async function handleGuardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!venta) return;
    if (itemsEditables.length === 0) {
      setErrorEdicion("Debe haber al menos un artículo.");
      return;
    }

    for (const it of itemsEditables) {
      if (!it.nombre.trim()) {
        setErrorEdicion("Todos los artículos deben tener un nombre.");
        return;
      }
      if (it.cantidad <= 0) {
        setErrorEdicion("La cantidad debe ser mayor a 0.");
        return;
      }
      if (it.precio_unitario < 0) {
        setErrorEdicion("El precio no puede ser negativo.");
        return;
      }
    }

    setGuardando(true);
    setErrorEdicion(null);

    const payloadItems: ItemVendido[] = itemsEditables.map((it) => ({
      tipo: it.tipo,
      producto_id: it.producto_id || undefined,
      servicio_id: it.servicio_id || undefined,
      codigo_servicio: it.codigo_servicio || undefined,
      nombre: it.nombre.trim(),
      descripcion_personalizada: it.descripcion_personalizada || undefined,
      cantidad: Number(it.cantidad),
      precio_unitario: Number(it.precio_unitario),
    }));

    const { error: updateError } = await supabase
      .from("ventas")
      .update({
        total: nuevoTotal,
        items_vendidos: payloadItems,
      })
      .eq("id", venta.id);

    setGuardando(false);

    if (updateError) {
      setErrorEdicion(updateError.message);
      return;
    }

    const ventaActualizada: Venta = {
      ...venta,
      total: nuevoTotal,
      items_vendidos: payloadItems,
    };

    if (onSaleUpdated) {
      onSaleUpdated(ventaActualizada);
    }

    setModoEdicion(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => !guardando && onClose()}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl transition-all max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-stone-900">
                {modoEdicion ? "Editar Venta" : "Detalle de Venta"}
              </h3>
              <span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-xs font-semibold text-stone-700">
                #{venta.id.slice(0, 8)}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {modoEdicion
                ? "Modifica los artículos o precios en caso de error."
                : `${totalArticulos} artículo(s) &middot; ${money.format(venta.total)}`}
            </p>
          </div>
          <button
            type="button"
            disabled={guardando}
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {errorEdicion && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {errorEdicion}
          </div>
        )}

        {/* Mode 1: View / Print Mode */}
        {!modoEdicion ? (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              <div
                id="ticket-imprimible"
                className="rounded-xl border border-stone-200 bg-stone-50/70 p-5 font-mono text-xs text-stone-800 space-y-3"
              >
                {/* Ticket Header */}
                <div className="text-center space-y-0.5 border-b border-dashed border-stone-300 pb-3">
                  <p className="font-bold text-base tracking-wide text-stone-900">
                    Libreria San Rafael
                  </p>
                  <p className="text-[11px] text-stone-500">Comprobante de Venta</p>
                  <p className="text-[10px] text-stone-400">ID: {venta.id}</p>
                  <p className="text-[10px] text-stone-500 capitalize">{fechaFormateada}</p>
                </div>

                {/* Products Table */}
                <div className="space-y-2 border-b border-dashed border-stone-300 pb-3">
                  <div className="flex justify-between font-bold text-stone-500 text-[10px] uppercase">
                    <span>Cant. / Concepto</span>
                    <span>Total</span>
                  </div>
                  {venta.items_vendidos.map((item, idx) => {
                    const isRecarga = item.tipo === "recarga" || Boolean(item.operador);
                    const isServicio = item.tipo === "servicio" || (!item.producto_id && !isRecarga);
                    return (
                      <div key={idx} className="flex justify-between items-start gap-2 text-xs">
                        <div className="flex-1">
                          <span className="font-semibold text-stone-900">{item.cantidad}x </span>
                          <span className="text-stone-800">{item.nombre}</span>
                          {item.descripcion_personalizada && (
                            <div className="text-[10px] text-stone-600 font-sans italic">
                              {item.descripcion_personalizada}
                            </div>
                          )}
                          <div className="text-[10px] text-stone-400">
                            @{money.format(item.precio_unitario)} c/u {isRecarga ? "(Recarga)" : isServicio ? "(Servicio)" : ""}
                          </div>
                        </div>
                        <div className="font-semibold text-stone-900 whitespace-nowrap">
                          {money.format(item.precio_unitario * item.cantidad)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Total de artículos:</span>
                    <span>{totalArticulos} un.</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-stone-900 pt-1 border-t border-stone-200">
                    <span>TOTAL PAGADO</span>
                    <span>{money.format(venta.total)}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center pt-3 border-t border-dashed border-stone-300 text-[11px] text-stone-500">
                  ¡Gracias por su compra!
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-wrap gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setModoEdicion(true)}
                className="rounded-xl border border-stone-300 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
              >
                Editar Venta
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 transition"
              >
                <PrinterIcon className="h-4 w-4" />
                <span>Reimprimir Ticket</span>
              </button>
            </div>
          </>
        ) : (
          /* Mode 2: Edit Form */
          <form onSubmit={handleGuardarEdicion} className="flex-1 flex flex-col overflow-hidden py-3">
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {itemsEditables.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-stone-200 bg-stone-50/50 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-stone-500 uppercase">
                      Ítem #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-stone-400 hover:text-red-600 transition p-1"
                      title="Eliminar este artículo"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-0.5">
                      Nombre / Descripción
                    </label>
                    <input
                      required
                      type="text"
                      value={item.nombre}
                      onChange={(e) =>
                        handleItemChange(index, "nombre", e.target.value)
                      }
                      className="w-full rounded-lg border border-stone-300 bg-white p-1.5 text-xs text-stone-900 outline-none focus:border-stone-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-0.5">
                        Cantidad
                      </label>
                      <input
                        required
                        type="number"
                        min="1"
                        step="1"
                        value={item.cantidad}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "cantidad",
                            parseInt(e.target.value, 10) || 1
                          )
                        }
                        className="w-full rounded-lg border border-stone-300 bg-white p-1.5 text-xs text-stone-900 outline-none focus:border-stone-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-0.5">
                        Precio Unitario ($)
                      </label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precio_unitario}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "precio_unitario",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full rounded-lg border border-stone-300 bg-white p-1.5 text-xs text-stone-900 outline-none focus:border-stone-500"
                      />
                    </div>
                  </div>

                  <div className="text-right text-xs font-bold text-stone-800 pt-1 border-t border-stone-200/60">
                    Subtotal: {money.format(item.cantidad * item.precio_unitario)}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddItem}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                <span>Agregar otro artículo</span>
              </button>
            </div>

            {/* Edit Total and Actions */}
            <div className="pt-3 border-t border-stone-200 mt-2 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-stone-100 p-3">
                <span className="text-xs font-bold text-stone-700">Nuevo Total Calculado:</span>
                <span className="text-lg font-black text-stone-900">
                  {money.format(nuevoTotal)}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => setModoEdicion(false)}
                  className="flex-1 rounded-xl border border-stone-300 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 rounded-xl bg-stone-900 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 transition disabled:opacity-50"
                >
                  {guardando ? "Guardando…" : "Guardar Corrección"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
