"use client";

import { useMemo, useState } from "react";
import type { CartItem, CartItemServicio, Producto, Servicio } from "@/types/database";
import {
  SearchIcon,
  XMarkIcon,
  PlusIcon,
  BookOpenIcon,
  LayersIcon,
  PackagePlusIcon,
  UtensilsIcon,
} from "./Icons";
import { ServicesSelector } from "./ServicesSelector";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

interface ProductListProps {
  productos: Producto[];
  servicios: Servicio[];
  cargando: boolean;
  cartItems: CartItem[];
  onAddToCart: (producto: Producto) => void;
  onAddServiceToCart: (item: Omit<CartItemServicio, "id">) => void;
  onOpenQuickInventory?: (producto?: Producto) => void;
}

type MainTab = "libreria" | "comida" | "servicios";
type FilterOption = "todos" | "disponibles" | "bajo_stock" | "agotados";

export function ProductList({
  productos,
  servicios,
  cargando,
  cartItems,
  onAddToCart,
  onAddServiceToCart,
  onOpenQuickInventory,
}: ProductListProps) {
  const [mainTab, setMainTab] = useState<MainTab>("libreria");
  
  // Search & Filter state for Librería
  const [busquedaLibreria, setBusquedaLibreria] = useState("");
  const [filtroLibreria, setFiltroLibreria] = useState<FilterOption>("todos");

  // Search & Filter state for Comida
  const [busquedaComida, setBusquedaComida] = useState("");
  const [filtroComida, setFiltroComida] = useState<FilterOption>("todos");

  // Map to quickly look up quantity in cart for products
  const cartQuantities = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cartItems) {
      if (item.tipo === "producto") {
        map.set(item.producto.id, item.cantidad);
      }
    }
    return map;
  }, [cartItems]);

  // Separate library vs food products
  const productosLibreria = useMemo(() => {
    return productos.filter((p) => p.categoria !== "comida");
  }, [productos]);

  const productosComida = useMemo(() => {
    return productos.filter((p) => p.categoria === "comida");
  }, [productos]);

  // Filtered lists
  const filtradosLibreria = useMemo(() => {
    const query = busquedaLibreria.trim().toLowerCase();
    return productosLibreria.filter((prod) => {
      const coincideBusqueda = !query || prod.nombre.toLowerCase().includes(query);
      if (!coincideBusqueda) return false;

      if (filtroLibreria === "disponibles") return prod.stock > 0;
      if (filtroLibreria === "bajo_stock") return prod.stock > 0 && prod.stock <= 5;
      if (filtroLibreria === "agotados") return prod.stock === 0;

      return true;
    });
  }, [productosLibreria, busquedaLibreria, filtroLibreria]);

  const filtradosComida = useMemo(() => {
    const query = busquedaComida.trim().toLowerCase();
    return productosComida.filter((prod) => {
      const coincideBusqueda = !query || prod.nombre.toLowerCase().includes(query);
      if (!coincideBusqueda) return false;

      if (filtroComida === "disponibles") return prod.stock > 0;
      if (filtroComida === "bajo_stock") return prod.stock > 0 && prod.stock <= 5;
      if (filtroComida === "agotados") return prod.stock === 0;

      return true;
    });
  }, [productosComida, busquedaComida, filtroComida]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      {/* Top Main Mode Switcher + Quick Inventory Shortcut */}
      <div className="flex items-center border-b border-stone-200 bg-stone-100/70 p-1.5 gap-1.5 overflow-x-auto">
        {/* Tab 1: Librería & Papelería */}
        <button
          type="button"
          onClick={() => setMainTab("libreria")}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            mainTab === "libreria"
              ? "bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5"
              : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
          }`}
        >
          <BookOpenIcon className="h-4 w-4" />
          <span>Librería & Útiles</span>
          <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
            {productosLibreria.length}
          </span>
        </button>

        {/* Tab 2: Comida & Snacks */}
        <button
          type="button"
          onClick={() => setMainTab("comida")}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            mainTab === "comida"
              ? "bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5"
              : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
          }`}
        >
          <UtensilsIcon className="h-4 w-4 text-stone-700" />
          <span>Comida & Snacks</span>
          <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
            {productosComida.length}
          </span>
        </button>

        {/* Tab 3: Servicios */}
        <button
          type="button"
          onClick={() => setMainTab("servicios")}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            mainTab === "servicios"
              ? "bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5"
              : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
          }`}
        >
          <LayersIcon className="h-4 w-4 text-stone-700" />
          <span>Servicios</span>
        </button>

        {/* Global shortcut to add inventory directly from any tab */}
        {onOpenQuickInventory && (
          <button
            type="button"
            onClick={() => onOpenQuickInventory()}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white px-3 py-2 text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer shrink-0"
            title="Atajo para agregar inventario o registrar nuevo producto (Alt+I / F2)"
          >
            <PackagePlusIcon className="h-3.5 w-3.5" />
            <span className="hidden md:inline">+ Inventario</span>
          </button>
        )}
      </div>

      {/* ================= Tab 1: Librería & Papelería ================= */}
      <div className={mainTab === "libreria" ? "flex flex-1 flex-col overflow-hidden" : "hidden"}>
        {/* Header & Search */}
        <div className="border-b border-stone-200 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-stone-900">Artículos de Librería</h2>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                {productosLibreria.length}
              </span>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFiltroLibreria("todos")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filtroLibreria === "todos"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroLibreria("disponibles")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filtroLibreria === "disponibles"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Disponibles
              </button>
              <button
                type="button"
                onClick={() => setFiltroLibreria("bajo_stock")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filtroLibreria === "bajo_stock"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Bajo stock (≤5)
              </button>
              <button
                type="button"
                onClick={() => setFiltroLibreria("agotados")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filtroLibreria === "agotados"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Agotados
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mt-3">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
              <SearchIcon className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={busquedaLibreria}
              onChange={(e) => setBusquedaLibreria(e.target.value)}
              placeholder="Buscar útiles, cuadernos, papelería (ej. Cuaderno, Lapicero)..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-10 pr-10 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
            />
            {busquedaLibreria && (
              <button
                type="button"
                onClick={() => setBusquedaLibreria("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-600"
                aria-label="Limpiar búsqueda"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Product List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {cargando ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-stone-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
              <p className="text-sm">Cargando catálogo...</p>
            </div>
          ) : filtradosLibreria.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 p-8 text-center text-stone-500">
              <BookOpenIcon className="h-10 w-10 text-stone-300 mb-2" />
              <p className="text-base font-medium text-stone-700">No se encontraron productos de librería</p>
              <p className="mt-1 text-xs text-stone-500">
                {busquedaLibreria
                  ? `No hay resultados para "${busquedaLibreria}"`
                  : "No hay productos registrados en esta categoría"}
              </p>
              {busquedaLibreria && (
                <button
                  type="button"
                  onClick={() => setBusquedaLibreria("")}
                  className="mt-3 text-xs font-semibold text-stone-800 hover:underline"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {filtradosLibreria.map((producto) => {
                const enCarrito = cartQuantities.get(producto.id) || 0;
                const sinStock = producto.stock === 0;
                const maxAlcanzado = enCarrito >= producto.stock;
                const deshabilitado = sinStock || maxAlcanzado;

                return (
                  <div
                    key={producto.id}
                    className={`group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                      sinStock
                        ? "border-stone-200 bg-stone-50/60 opacity-60"
                        : maxAlcanzado
                        ? "border-amber-200 bg-amber-50/30"
                        : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs"
                    }`}
                  >
                    <div>
                      {/* Stock badge, quick stock shortcut & Cart indicator */}
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {sinStock ? (
                            <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                              Agotado
                            </span>
                          ) : producto.stock <= 5 ? (
                            <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              Stock bajo: {producto.stock} un.
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                              Stock: {producto.stock}
                            </span>
                          )}

                          {/* Direct shortcut to add stock to this specific product */}
                          {onOpenQuickInventory && (
                            <button
                              type="button"
                              onClick={() => onOpenQuickInventory(producto)}
                              className="inline-flex items-center gap-0.5 rounded-md bg-stone-100 hover:bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 border border-stone-200 transition cursor-pointer"
                              title={`Sumar stock rápido a "${producto.nombre}"`}
                            >
                              <PackagePlusIcon className="h-2.5 w-2.5" />
                              <span>+Stock</span>
                            </button>
                          )}
                        </div>

                        {enCarrito > 0 && (
                          <span className="inline-flex items-center rounded-full bg-stone-900 px-2 py-0.5 text-xs font-bold text-white">
                            {enCarrito} en carrito
                          </span>
                        )}
                      </div>

                      {/* Product title */}
                      <h3 className="line-clamp-2 text-sm font-semibold text-stone-900">
                        {producto.nombre}
                      </h3>
                    </div>

                    {/* Price & Add button (ONLY way to add to cart) */}
                    <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2.5">
                      <span className="text-base font-bold text-stone-900">
                        {money.format(producto.precio)}
                      </span>

                      <button
                        type="button"
                        disabled={deshabilitado}
                        onClick={() => onAddToCart(producto)}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                          deshabilitado
                            ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                            : "bg-stone-900 text-white hover:bg-stone-800 active:scale-95 cursor-pointer shadow-xs"
                        }`}
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        <span>{maxAlcanzado ? "Máx" : "Añadir"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer count indicator */}
        <div className="border-t border-stone-100 bg-stone-50/70 px-4 py-2 text-xs text-stone-500">
          Mostrando {filtradosLibreria.length} de {productosLibreria.length} artículos de librería
        </div>
      </div>

      {/* ================= Tab 2: Comida & Snacks ================= */}
      <div className={mainTab === "comida" ? "flex flex-1 flex-col overflow-hidden" : "hidden"}>
        {/* Header & Search */}
        <div className="border-b border-stone-200 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-stone-900">Comida, Snacks & Bebidas</h2>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                {productosComida.length}
              </span>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFiltroComida("todos")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filtroComida === "todos"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroComida("disponibles")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filtroComida === "disponibles"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Disponibles
              </button>
              <button
                type="button"
                onClick={() => setFiltroComida("bajo_stock")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filtroComida === "bajo_stock"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Bajo stock (≤5)
              </button>
              <button
                type="button"
                onClick={() => setFiltroComida("agotados")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  filtroComida === "agotados"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Agotados
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mt-3">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
              <SearchIcon className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={busquedaComida}
              onChange={(e) => setBusquedaComida(e.target.value)}
              placeholder="Buscar palomitas, bebidas, refrescos, frituras, dulces..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-10 pr-10 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
            />
            {busquedaComida && (
              <button
                type="button"
                onClick={() => setBusquedaComida("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-600"
                aria-label="Limpiar búsqueda"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Product List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {cargando ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-stone-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
              <p className="text-sm">Cargando snacks y bebidas...</p>
            </div>
          ) : filtradosComida.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 p-8 text-center text-stone-500">
              <UtensilsIcon className="h-10 w-10 text-stone-300 mb-2" />
              <p className="text-base font-medium text-stone-700">No se encontraron productos de comida</p>
              <p className="mt-1 text-xs text-stone-500">
                {busquedaComida
                  ? `No hay resultados para "${busquedaComida}"`
                  : "Aún no has registrado productos en la categoría de Comida & Snacks"}
              </p>
              {onOpenQuickInventory && (
                <button
                  type="button"
                  onClick={() => onOpenQuickInventory()}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-stone-800 transition"
                >
                  <PackagePlusIcon className="h-3.5 w-3.5" />
                  <span>Agregar Producto de Comida</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {filtradosComida.map((producto) => {
                const enCarrito = cartQuantities.get(producto.id) || 0;
                const sinStock = producto.stock === 0;
                const maxAlcanzado = enCarrito >= producto.stock;
                const deshabilitado = sinStock || maxAlcanzado;

                return (
                  <div
                    key={producto.id}
                    className={`group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                      sinStock
                        ? "border-stone-200 bg-stone-50/60 opacity-60"
                        : maxAlcanzado
                        ? "border-amber-200 bg-amber-50/30"
                        : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs"
                    }`}
                  >
                    <div>
                      {/* Stock badge, quick stock shortcut & Cart indicator */}
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {sinStock ? (
                            <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                              Agotado
                            </span>
                          ) : producto.stock <= 5 ? (
                            <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              Stock bajo: {producto.stock} un.
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                              Stock: {producto.stock}
                            </span>
                          )}

                          {/* Direct shortcut to add stock to this specific product */}
                          {onOpenQuickInventory && (
                            <button
                              type="button"
                              onClick={() => onOpenQuickInventory(producto)}
                              className="inline-flex items-center gap-0.5 rounded-md bg-stone-100 hover:bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 border border-stone-200 transition cursor-pointer"
                              title={`Sumar stock rápido a "${producto.nombre}"`}
                            >
                              <PackagePlusIcon className="h-2.5 w-2.5" />
                              <span>+Stock</span>
                            </button>
                          )}
                        </div>

                        {enCarrito > 0 && (
                          <span className="inline-flex items-center rounded-full bg-stone-900 px-2 py-0.5 text-xs font-bold text-white">
                            {enCarrito} en carrito
                          </span>
                        )}
                      </div>

                      {/* Product title */}
                      <h3 className="line-clamp-2 text-sm font-semibold text-stone-900">
                        {producto.nombre}
                      </h3>
                    </div>

                    {/* Price & Add button */}
                    <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2.5">
                      <span className="text-base font-bold text-stone-900">
                        {money.format(producto.precio)}
                      </span>

                      <button
                        type="button"
                        disabled={deshabilitado}
                        onClick={() => onAddToCart(producto)}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                          deshabilitado
                            ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                            : "bg-stone-900 text-white hover:bg-stone-800 active:scale-95 cursor-pointer shadow-xs"
                        }`}
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        <span>{maxAlcanzado ? "Máx" : "Añadir"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer count indicator */}
        <div className="border-t border-stone-100 bg-stone-50/70 px-4 py-2 text-xs text-stone-500">
          Mostrando {filtradosComida.length} de {productosComida.length} artículos de comida y snacks
        </div>
      </div>

      {/* ================= Tab 3: Servicios Rápidos ================= */}
      <div className={mainTab === "servicios" ? "flex-1 overflow-hidden" : "hidden"}>
        <ServicesSelector
          servicios={servicios}
          onAddServiceToCart={onAddServiceToCart}
          onOpenQuickInventory={onOpenQuickInventory}
        />
      </div>
    </div>
  );
}
