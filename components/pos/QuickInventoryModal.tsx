"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Producto } from "@/types/database";
import {
  BookOpenIcon,
  XMarkIcon,
  PlusIcon,
  SearchIcon,
  CheckCircleIcon,
  PackagePlusIcon,
} from "./Icons";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

interface QuickInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productos: Producto[];
  initialProduct?: Producto | null;
  initialTab?: "nuevo" | "sumar_stock";
  onProductCreatedOrUpdated: () => Promise<void>;
}

type ModalTab = "nuevo" | "sumar_stock";

export function QuickInventoryModal({
  isOpen,
  onClose,
  productos,
  initialProduct = null,
  initialTab = "nuevo",
  onProductCreatedOrUpdated,
}: QuickInventoryModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<ModalTab>(initialTab);

  // Form 1: New Product
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("10");

  // Form 2: Add Stock to Existing
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(initialProduct);
  const [cantidadSumar, setCantidadSumar] = useState("5");

  // Status
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setMensajeExito(null);
      setNombre("");
      setPrecio("");
      setStock("10");
      setBusquedaProducto("");
      setProductoSeleccionado(initialProduct);
      setTab(initialProduct ? "sumar_stock" : initialTab);
      setCantidadSumar("5");
    }
  }, [isOpen, initialProduct, initialTab]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !guardando) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, guardando, onClose]);

  // Filter existing products for adding stock
  const productosFiltrados = useMemo(() => {
    const q = busquedaProducto.trim().toLowerCase();
    if (!q) return productos.slice(0, 8);
    return productos
      .filter((p) => p.nombre.toLowerCase().includes(q))
      .slice(0, 10);
  }, [productos, busquedaProducto]);

  if (!isOpen) return null;

  // Handler: Create new product
  async function handleCrearProducto(e: React.FormEvent) {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    const precioNum = parseFloat(precio);
    const stockNum = parseInt(stock, 10);

    if (!nombreLimpio) {
      setError("El nombre del producto es requerido.");
      return;
    }
    if (isNaN(precioNum) || precioNum < 0) {
      setError("Ingresa un precio válido (0 o mayor).");
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setError("El stock inicial debe ser 0 o mayor.");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from("productos").insert({
        nombre: nombreLimpio,
        precio: precioNum,
        stock: stockNum,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setMensajeExito(`Producto "${nombreLimpio}" creado con ${stockNum} un. en stock.`);
      setNombre("");
      setPrecio("");
      setStock("10");

      await onProductCreatedOrUpdated();
      setTimeout(() => {
        setMensajeExito(null);
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar el producto.";
      setError(msg);
    } finally {
      setGuardando(false);
    }
  }

  // Handler: Add stock to existing product
  async function handleSumarStock(e: React.FormEvent) {
    e.preventDefault();
    if (!productoSeleccionado) {
      setError("Selecciona un producto de la lista.");
      return;
    }

    const cantidadNum = parseInt(cantidadSumar, 10);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      setError("Ingresa una cantidad válida a sumar mayor a 0.");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const nuevoStock = productoSeleccionado.stock + cantidadNum;

      const { error: updateError } = await supabase
        .from("productos")
        .update({ stock: nuevoStock })
        .eq("id", productoSeleccionado.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setMensajeExito(
        `Se sumaron ${cantidadNum} un. a "${productoSeleccionado.nombre}" (Nuevo stock: ${nuevoStock} un.).`
      );

      // Update local selected state
      setProductoSeleccionado({
        ...productoSeleccionado,
        stock: nuevoStock,
      });
      setCantidadSumar("5");

      await onProductCreatedOrUpdated();
      setTimeout(() => {
        setMensajeExito(null);
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar el stock.";
      setError(msg);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => !guardando && onClose()}
      />

      {/* Modal Box */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white">
              <PackagePlusIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">
                Agregar Inventario Rápido
              </h3>
              <p className="text-xs text-stone-500">
                Registra o suma existencias sin salir de la caja.
              </p>
            </div>
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

        {/* Tab switch */}
        <div className="mt-4 flex rounded-xl bg-stone-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setTab("nuevo");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === "nuevo"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Nuevo Producto
          </button>

          <button
            type="button"
            onClick={() => {
              setTab("sumar_stock");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === "sumar_stock"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Sumar Stock a Existente
          </button>
        </div>

        {/* Notifications */}
        {mensajeExito && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Tab 1: Formulario Nuevo Producto */}
        {tab === "nuevo" ? (
          <form onSubmit={handleCrearProducto} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Nombre del Producto / Artículo
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Cuaderno Universitario Raya 100h, Lapicero Azul..."
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-stone-600 focus:ring-1 focus:ring-stone-600"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Precio de Venta ($)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400 font-bold text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-7 pr-3 text-sm font-bold text-stone-900 outline-none focus:border-stone-600 focus:ring-1 focus:ring-stone-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Stock Inicial (Unidades)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-bold text-stone-900 outline-none focus:border-stone-600 focus:ring-1 focus:ring-stone-600 text-center"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={guardando}
                onClick={onClose}
                className="w-1/3 rounded-xl border border-stone-300 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="w-2/3 flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-stone-800 active:scale-[0.99] transition disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4" />
                <span>{guardando ? "Registrando…" : "Guardar Producto en Catálogo"}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Tab 2: Sumar Stock a Existente */
          <form onSubmit={handleSumarStock} className="mt-4 space-y-4">
            {/* Search existing product */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Buscar Producto en Catálogo
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                  <SearchIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="w-full rounded-xl border border-stone-300 bg-white py-2 pl-9 pr-3 text-xs text-stone-900 outline-none focus:border-stone-600"
                />
              </div>

              {/* Product quick list selection */}
              <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50 divide-y divide-stone-200/70">
                {productosFiltrados.length === 0 ? (
                  <div className="p-3 text-center text-xs text-stone-500">
                    No se encontraron productos.
                  </div>
                ) : (
                  productosFiltrados.map((p) => {
                    const isSelected = productoSeleccionado?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProductoSeleccionado(p)}
                        className={`w-full text-left p-2.5 text-xs flex items-center justify-between transition ${
                          isSelected
                            ? "bg-stone-900 text-white font-semibold"
                            : "hover:bg-stone-100 text-stone-800"
                        }`}
                      >
                        <span className="truncate flex-1 mr-2">{p.nombre}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                              isSelected
                                ? "bg-stone-800 text-stone-200"
                                : "bg-stone-200/80 text-stone-600"
                            }`}
                          >
                            Stock: {p.stock}
                          </span>
                          <span className="font-bold">{money.format(p.precio)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Product summary and quantity to add */}
            {productoSeleccionado ? (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-stone-500">
                      Producto seleccionado
                    </span>
                    <h4 className="text-sm font-bold text-stone-900">
                      {productoSeleccionado.nombre}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-500 block">Stock actual:</span>
                    <span className="text-base font-black text-stone-900">
                      {productoSeleccionado.stock} un.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Cantidad de Unidades a Sumar (+)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={cantidadSumar}
                      onChange={(e) => setCantidadSumar(e.target.value)}
                      className="w-24 rounded-xl border border-stone-300 bg-white py-2 text-center text-sm font-bold text-stone-900 outline-none focus:border-stone-600"
                    />
                    <div className="flex flex-wrap gap-1">
                      {[1, 5, 10, 20, 50].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setCantidadSumar(n.toString())}
                          className={`rounded-lg border px-2 py-1 text-xs font-medium transition ${
                            cantidadSumar === n.toString()
                              ? "border-stone-900 bg-stone-900 text-white"
                              : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
                          }`}
                        >
                          +{n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200 flex justify-between text-xs font-semibold text-stone-700">
                  <span>Stock resultante estimado:</span>
                  <span className="font-bold text-stone-900">
                    {productoSeleccionado.stock + (parseInt(cantidadSumar, 10) || 0)} un.
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-stone-200 p-4 text-center text-xs text-stone-500">
                Selecciona un producto del catálogo para sumarle stock.
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={guardando}
                onClick={onClose}
                className="w-1/3 rounded-xl border border-stone-300 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={!productoSeleccionado || guardando}
                className="w-2/3 flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-stone-800 active:scale-[0.99] transition disabled:opacity-40"
              >
                <PlusIcon className="h-4 w-4" />
                <span>{guardando ? "Sumando…" : "Sumar al Inventario"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
