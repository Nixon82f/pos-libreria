"use client";

import type { CartItem } from "@/types/database";
import {
  ShoppingCartIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  SparklesIcon,
} from "./Icons";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

interface CartProps {
  cartItems: CartItem[];
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onSetQuantity: (itemId: string, cantidad: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onOpenCheckout: () => void;
  isProcessing: boolean;
}

export function Cart({
  cartItems,
  onUpdateQuantity,
  onSetQuantity,
  onRemoveItem,
  onClearCart,
  onOpenCheckout,
  isProcessing,
}: CartProps) {
  const totalArticulos = cartItems.reduce((acc, item) => acc + item.cantidad, 0);
  const totalPagar = cartItems.reduce((acc, item) => {
    if (item.tipo === "servicio") {
      return acc + item.precio_unitario * item.cantidad;
    }
    return acc + item.producto.precio * item.cantidad;
  }, 0);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      {/* Cart Header */}
      <div className="flex items-center justify-between border-b border-stone-200 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <ShoppingCartIcon className="h-5 w-5 text-stone-700" />
          <h2 className="text-lg font-semibold text-stone-900">Carrito de Venta</h2>
          {totalArticulos > 0 && (
            <span className="rounded-full bg-stone-900 px-2 py-0.5 text-xs font-bold text-white">
              {totalArticulos}
            </span>
          )}
        </div>

        {cartItems.length > 0 && (
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClearCart}
            className="text-xs font-medium text-stone-500 hover:text-red-600 transition disabled:opacity-50 cursor-pointer"
          >
            Vaciar todo
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {cartItems.length === 0 ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 p-8 text-center text-stone-400">
            <ShoppingCartIcon className="h-12 w-12 text-stone-300 mb-3" />
            <p className="text-base font-medium text-stone-700">El carrito está vacío</p>
            <p className="mt-1 text-xs text-stone-500 max-w-xs">
              Selecciona productos del catálogo o agrega servicios rápidos a la venta.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {cartItems.map((item) => {
              const isServicio = item.tipo === "servicio";
              const itemId = item.id;
              const nombre = isServicio ? item.nombre : item.producto.nombre;
              const precioUnitario = isServicio
                ? item.precio_unitario
                : item.producto.precio;
              const subtotal = precioUnitario * item.cantidad;
              const maxAlcanzado = !isServicio && item.cantidad >= item.producto.stock;

              return (
                <li key={itemId} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isServicio && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60">
                            <SparklesIcon className="h-2.5 w-2.5" />
                            Servicio
                          </span>
                        )}
                        <h4 className="text-sm font-semibold text-stone-900 truncate">
                          {nombre}
                        </h4>
                      </div>

                      {isServicio && item.descripcion_personalizada && (
                        <p className="text-xs text-indigo-900/80 font-medium mt-0.5">
                          {item.descripcion_personalizada}
                        </p>
                      )}

                      <p className="text-xs text-stone-500 mt-0.5">
                        {money.format(precioUnitario)} c/u &middot;{" "}
                        {isServicio ? (
                          <span className="text-indigo-600 font-medium">
                            Tarifa de servicio
                          </span>
                        ) : (
                          <span className="text-stone-400">
                            (Stock disp: {item.producto.stock})
                          </span>
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => onRemoveItem(itemId)}
                      className="text-stone-400 hover:text-red-600 transition p-1 cursor-pointer"
                      aria-label={`Eliminar ${nombre}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between">
                    {/* Stepper controls */}
                    <div className="flex items-center rounded-lg border border-stone-200 bg-stone-50 p-0.5">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => onUpdateQuantity(itemId, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-stone-600 hover:bg-white hover:shadow-xs active:scale-95 disabled:opacity-40 cursor-pointer"
                        aria-label="Disminuir cantidad"
                      >
                        <MinusIcon className="h-3.5 w-3.5" />
                      </button>

                      <input
                        type="number"
                        min="1"
                        max={!isServicio ? item.producto.stock : undefined}
                        value={item.cantidad}
                        disabled={isProcessing}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            onSetQuantity(itemId, val);
                          }
                        }}
                        className="w-12 bg-transparent text-center text-xs font-semibold text-stone-900 outline-none"
                      />

                      <button
                        type="button"
                        disabled={isProcessing || maxAlcanzado}
                        onClick={() => onUpdateQuantity(itemId, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-stone-600 hover:bg-white hover:shadow-xs active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                        aria-label="Aumentar cantidad"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right">
                      <span className="text-sm font-bold text-stone-900">
                        {money.format(subtotal)}
                      </span>
                    </div>
                  </div>

                  {maxAlcanzado && (
                    <p className="mt-1 text-[11px] text-amber-600 font-medium">
                      Stock máximo disponible ({item.producto.stock} un.)
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Cart Summary & Checkout Button */}
      <div className="border-t border-stone-200 bg-stone-50/50 p-4 sm:p-5 space-y-4">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-stone-600">
            <span>Líneas / Artículos ({totalArticulos} un.)</span>
            <span>{money.format(totalPagar)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-stone-200 pt-2">
            <span className="text-base font-bold text-stone-900">Total</span>
            <span className="text-2xl font-extrabold text-stone-900 tracking-tight">
              {money.format(totalPagar)}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={cartItems.length === 0 || isProcessing}
          onClick={onOpenCheckout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 cursor-pointer"
        >
          <span>Cobrar {totalPagar > 0 ? money.format(totalPagar) : ""}</span>
        </button>
      </div>
    </div>
  );
}

