"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Producto, CategoriaProducto } from "@/types/database";
import { saveLocalProductCategory } from "@/lib/categoryStorage";
import {
  BookOpenIcon,
  XMarkIcon,
  PlusIcon,
  SearchIcon,
  CheckCircleIcon,
  PackagePlusIcon,
  UtensilsIcon,
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
  const [categoria, setCategoria] = useState<CategoriaProducto>("libreria");

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
      setCategoria("libreria");
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
    if (!q) return productos.slice(0, 10);
    return productos
      .filter((p) => p.nombre.toLowerCase().includes(q))
      .slice(0, 12);
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
      // Save locally to cache immediately
      saveLocalProductCategory(nombreLimpio, categoria);

      // Try insert with categoria
      let res = await supabase.from("productos").insert({
        nombre: nombreLimpio,
        precio: precioNum,
        stock: stockNum,
        categoria: categoria,
      }).select("id, nombre, categoria").single();

      // Fallback if categoria column is missing in older schema
      if (res.error && res.error.message.includes("categoria")) {
        res = await supabase.from("productos").insert({
          nombre: nombreLimpio,
          precio: precioNum,
          stock: stockNum,
        }).select("id, nombre").single();
      }

      if (res.data?.id) {
        saveLocalProductCategory(res.data.id, categoria);
      }

      if (res.error) {
        throw new Error(res.error.message);
      }

      setMensajeExito(
        `Producto "${nombreLimpio}" (${categoria === "comida" ? "Comida/Snack" : "Librería"}) creado con ${stockNum} un. en stock.`
      );
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
      setError("Ingresa una cantidad válida mayor a 0 para sumar.");
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
        `Se sumaron +${cantidadNum} unidades a "${productoSeleccionado.nombre}". Nuevo stock: ${nuevoStock}`
      );

      // Update local selection
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

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-900">
              <PackagePlusIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Inventario Rápido
              </h2>
              <p className="text-xs text-stone-500">
                Registra o suma stock a productos físicos sin salir de la caja.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={guardando}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="mt-4 flex rounded-xl bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => {
              setTab("nuevo");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
              tab === "nuevo"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            + Registrar Nuevo Producto
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("sumar_stock");
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
              tab === "sumar_stock"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Sumar Stock a Existente
          </button>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}
        {mensajeExito && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-50 p-3 text-xs text-stone-800 font-medium">
            <CheckCircleIcon className="h-4 w-4 text-stone-800" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {/* ================= TAB 1: NUEVO PRODUCTO ================= */}
        {tab === "nuevo" && (
          <form onSubmit={handleCrearProducto} className="mt-4 space-y-4">
            {/* Category Selector */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Categoría del Producto
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCategoria("libreria")}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold border transition cursor-pointer ${
                    categoria === "libreria"
                      ? "border-stone-900 bg-stone-900 text-white shadow-xs"
                      : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <BookOpenIcon className="h-4 w-4" />
                  <span>Librería & Útiles</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategoria("comida")}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold border transition cursor-pointer ${
                    categoria === "comida"
                      ? "border-stone-900 bg-stone-900 text-white shadow-xs"
                      : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <UtensilsIcon className="h-4 w-4" />
                  <span>Comida & Snacks</span>
                </button>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-stone-500">
                Sugerencias rápidas ({categoria === "comida" ? "Snacks" : "Papelería"}):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(categoria === "comida"
                  ? [
                      { nom: "Palomitas de Maíz", pre: "15.00" },
                      { nom: "Refresco 600ml", pre: "18.00" },
                      { nom: "Agua Embotellada 500ml", pre: "12.00" },
                      { nom: "Papas Fritas", pre: "17.00" },
                      { nom: "Galletas de Chocolate", pre: "16.00" },
                    ]
                  : [
                      { nom: "Cuaderno Profesional", pre: "28.00" },
                      { nom: "Bolígrafo Tinta Negra", pre: "7.00" },
                      { nom: "Pegamento en Barra", pre: "14.00" },
                      { nom: "Tijeras Escolares", pre: "22.00" },
                      { nom: "Cartulina Blanca", pre: "8.00" },
                    ]
                ).map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setNombre(tpl.nom);
                      setPrecio(tpl.pre);
                    }}
                    className="rounded-lg bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-200 transition cursor-pointer"
                  >
                    {tpl.nom}
                  </button>
                ))}
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Nombre del Producto
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder={
                  categoria === "comida"
                    ? "Ej. Palomitas con mantequilla, Coca Cola 600ml, Jugo..."
                    : "Ej. Cuaderno rayado 100 hojas, Lapicero negro..."
                }
                className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs text-stone-900 outline-none focus:border-stone-600"
              />
            </div>

            {/* Precio y Stock Inicial */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Precio de Venta ($)
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  required
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-sm font-bold text-stone-900 outline-none focus:border-stone-600"
                />
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
                  className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-sm font-bold text-stone-900 outline-none focus:border-stone-600 text-center"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={guardando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-xs font-bold text-white shadow-xs hover:bg-stone-800 active:scale-95 disabled:opacity-50 transition cursor-pointer"
              >
                <PlusIcon className="h-4 w-4" />
                <span>{guardando ? "Guardando..." : "Guardar y Registrar Producto"}</span>
              </button>
            </div>
          </form>
        )}

        {/* ================= TAB 2: SUMAR STOCK ================= */}
        {tab === "sumar_stock" && (
          <form onSubmit={handleSumarStock} className="mt-4 space-y-4">
            {/* Search or Select Existing Product */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Buscar Producto Físico
              </label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  placeholder="Escribe el nombre del producto..."
                  className="w-full rounded-xl border border-stone-300 bg-white py-2 pl-9 pr-3 text-xs text-stone-900 outline-none focus:border-stone-600"
                />
              </div>
            </div>

            {/* List of matching products */}
            <div className="max-h-36 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50/50 p-1.5 space-y-1">
              {productosFiltrados.map((prod) => {
                const esSeleccionado = productoSeleccionado?.id === prod.id;
                const esComida = prod.categoria === "comida";

                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      setProductoSeleccionado(prod);
                      setError(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition cursor-pointer ${
                      esSeleccionado
                        ? "bg-stone-900 text-white font-bold"
                        : "bg-white text-stone-800 hover:bg-stone-100 border border-stone-200/60"
                    }`}
                  >
                    <div className="truncate mr-2 flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        esSeleccionado
                          ? "bg-stone-700 text-white"
                          : esComida
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-stone-100 text-stone-600 border border-stone-200"
                      }`}>
                        {esComida ? "Comida" : "Librería"}
                      </span>
                      <span className="truncate">{prod.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={esSeleccionado ? "text-stone-300" : "text-stone-500"}>
                        {money.format(prod.precio)}
                      </span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                        esSeleccionado
                          ? "bg-stone-800 text-white"
                          : "bg-stone-200 text-stone-800"
                      }`}>
                        Stock: {prod.stock}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Product Stock Card */}
            {productoSeleccionado && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-stone-500">Producto Seleccionado:</span>
                    <h3 className="text-xs font-bold text-stone-900">
                      {productoSeleccionado.nombre}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-stone-500">Stock Actual:</span>
                    <div className="text-sm font-black text-stone-900">
                      {productoSeleccionado.stock} unidades
                    </div>
                  </div>
                </div>

                {/* Amount to add */}
                <div className="pt-2 border-t border-stone-200">
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Cantidad de Unidades a Sumar (+):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={cantidadSumar}
                      onChange={(e) => setCantidadSumar(e.target.value)}
                      className="w-24 rounded-xl border border-stone-300 bg-white p-2 text-center text-base font-black text-stone-900 outline-none focus:border-stone-600"
                    />

                    {/* Quick increment buttons */}
                    <div className="flex flex-wrap gap-1">
                      {[1, 5, 10, 20, 50].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setCantidadSumar(num.toString())}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                            cantidadSumar === num.toString()
                              ? "bg-stone-900 text-white"
                              : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                          }`}
                        >
                          +{num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview new stock */}
                  <div className="mt-2 text-xs text-stone-600">
                    Nuevo stock resultante:{" "}
                    <strong className="text-stone-900">
                      {productoSeleccionado.stock + (parseInt(cantidadSumar, 10) || 0)} unidades
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={guardando || !productoSeleccionado}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-xs font-bold text-white shadow-xs hover:bg-stone-800 active:scale-95 disabled:opacity-50 transition cursor-pointer"
              >
                <PackagePlusIcon className="h-4 w-4" />
                <span>{guardando ? "Sumando stock..." : "Confirmar y Sumar Stock"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
