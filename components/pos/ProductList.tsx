"use client";

import { useMemo, useState } from "react";
import type { CartItem, Producto } from "@/types/database";
import { SearchIcon, XMarkIcon, PlusIcon, BookOpenIcon } from "./Icons";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

interface ProductListProps {
  productos: Producto[];
  cargando: boolean;
  cartItems: CartItem[];
  onAddToCart: (producto: Producto) => void;
}

type FilterOption = "todos" | "disponibles" | "bajo_stock" | "agotados";

export function ProductList({
  productos,
  cargando,
  cartItems,
  onAddToCart,
}: ProductListProps) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FilterOption>("todos");

  // Map to quickly look up quantity in cart
  const cartQuantities = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cartItems) {
      map.set(item.producto.id, item.cantidad);
    }
    return map;
  }, [cartItems]);

  const productosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase();

    return productos.filter((prod) => {
      // Search text match
      const coincideBusqueda =
        !query || prod.nombre.toLowerCase().includes(query);
      if (!coincideBusqueda) return false;

      // Filter option match
      if (filtro === "disponibles") return prod.stock > 0;
      if (filtro === "bajo_stock") return prod.stock > 0 && prod.stock <= 5;
      if (filtro === "agotados") return prod.stock === 0;

      return true;
    });
  }, [productos, busqueda, filtro]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      {/* Header & Search */}
      <div className="border-b border-stone-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpenIcon className="h-5 w-5 text-stone-700" />
            <h2 className="text-lg font-semibold text-stone-900">Catálogo de Productos</h2>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
              {productos.length}
            </span>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFiltro("todos")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                filtro === "todos"
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFiltro("disponibles")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                filtro === "disponibles"
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Disponibles
            </button>
            <button
              type="button"
              onClick={() => setFiltro("bajo_stock")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                filtro === "bajo_stock"
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Bajo stock (≤5)
            </button>
            <button
              type="button"
              onClick={() => setFiltro("agotados")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                filtro === "agotados"
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Agotados
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-4">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
            <SearchIcon className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto, útiles, papelería (ej. Cuaderno, Lapicero, Novela)..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-10 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
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
        ) : productosFiltrados.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 p-8 text-center text-stone-500">
            <BookOpenIcon className="h-10 w-10 text-stone-300 mb-2" />
            <p className="text-base font-medium text-stone-700">No se encontraron productos</p>
            <p className="mt-1 text-xs text-stone-500">
              {busqueda
                ? `No hay resultados para "${busqueda}"`
                : "No hay productos en esta categoría"}
            </p>
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="mt-3 text-xs font-semibold text-stone-800 hover:underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {productosFiltrados.map((producto) => {
              const enCarrito = cartQuantities.get(producto.id) || 0;
              const sinStock = producto.stock === 0;
              const maxAlcanzado = enCarrito >= producto.stock;
              const deshabilitado = sinStock || maxAlcanzado;

              return (
                <div
                  key={producto.id}
                  onClick={() => !deshabilitado && onAddToCart(producto)}
                  className={`group relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
                    sinStock
                      ? "border-stone-200 bg-stone-50/60 opacity-60 cursor-not-allowed"
                      : maxAlcanzado
                      ? "border-amber-200 bg-amber-50/30 cursor-not-allowed"
                      : "border-stone-200 bg-white hover:border-stone-400 hover:shadow-sm cursor-pointer active:scale-[0.99]"
                  }`}
                >
                  <div>
                    {/* Stock badge & Cart indicator */}
                    <div className="mb-2 flex items-center justify-between gap-2">
                      {sinStock ? (
                        <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Agotado
                        </span>
                      ) : producto.stock <= 5 ? (
                        <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Stock bajo: {producto.stock} un.
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Stock: {producto.stock}
                        </span>
                      )}

                      {enCarrito > 0 && (
                        <span className="inline-flex items-center rounded-full bg-stone-900 px-2 py-0.5 text-xs font-bold text-white">
                          {enCarrito} en carrito
                        </span>
                      )}
                    </div>

                    {/* Book title */}
                    <h3 className="line-clamp-2 text-sm font-semibold text-stone-900 group-hover:text-stone-800">
                      {producto.nombre}
                    </h3>
                  </div>

                  {/* Price & Add button */}
                  <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                    <span className="text-base font-bold text-stone-900">
                      {money.format(producto.precio)}
                    </span>

                    <button
                      type="button"
                      disabled={deshabilitado}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(producto);
                      }}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        deshabilitado
                          ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                          : "bg-stone-900 text-white hover:bg-stone-800 active:scale-95"
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
        Mostrando {productosFiltrados.length} de {productos.length} productos
      </div>
    </div>
  );
}
