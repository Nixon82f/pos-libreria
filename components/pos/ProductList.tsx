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
  ChevronDownIcon,
  ChevronUpIcon,
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

  // State for Palomitas custom fast order
  const [palomitasPrecio, setPalomitasPrecio] = useState<string>("20.00");
  const [palomitasCantidad, setPalomitasCantidad] = useState<string>("1");
  const [palomitasColapsadas, setPalomitasColapsadas] = useState<boolean>(false);

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

  // Palomitas Service reference
  const srvPalomitas = useMemo(
    () =>
      servicios.find((s) => s.codigo === "palomitas_servicio") || {
        id: "mock-palomitas",
        codigo: "palomitas_servicio",
        categoria: "comida" as const,
        nombre: "Palomitas de Maíz",
        tipo_precio: "variable" as const,
        precio_actual: 0.0,
        version_precio: 1,
        activo: true,
      },
    [servicios]
  );

  const handleAddPalomitas = () => {
    const precioNum = Math.max(0, parseFloat(palomitasPrecio) || 0);
    const cantNum = Math.max(1, parseInt(palomitasCantidad, 10) || 1);

    onAddServiceToCart({
      tipo: "servicio",
      servicio: srvPalomitas,
      nombre: "Palomitas de Maíz",
      descripcion_personalizada: `${cantNum} porción(es) ($${precioNum}/u)`,
      cantidad: cantNum,
      precio_unitario: precioNum,
      opcion: "Preparadas",
    });
  };

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
            <span className="hidden sm:inline">+ Inventario Rápido</span>
            <span className="sm:hidden">+ Inv</span>
            <span className="hidden md:inline-block rounded bg-stone-700 px-1 py-0.2 text-[10px] text-stone-300">
              F2
            </span>
          </button>
        )}
      </div>

      {/* ================= Tab 1: Librería & Útiles ================= */}
      <div className={mainTab === "libreria" ? "flex flex-1 flex-col min-h-[250px] overflow-hidden" : "hidden"}>
        {/* Header & Search */}
        <div className="border-b border-stone-200 p-3 sm:p-5 space-y-2.5 sm:space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-stone-900 truncate">Catálogo de Librería</h2>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-stone-600 shrink-0">
                {productosLibreria.length}
              </span>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setFiltroLibreria("todos")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors shrink-0 ${
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
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors shrink-0 ${
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
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors shrink-0 ${
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
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors shrink-0 ${
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
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
              <SearchIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <input
              type="text"
              value={busquedaLibreria}
              onChange={(e) => setBusquedaLibreria(e.target.value)}
              placeholder="Buscar por nombre de producto de librería..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 sm:pl-10 pr-10 text-xs sm:text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
            />
            {busquedaLibreria && (
              <button
                type="button"
                onClick={() => setBusquedaLibreria("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <XMarkIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Product List Content */}
        <div className="flex-1 min-h-[250px] overflow-y-auto p-3 sm:p-5">
          {cargando ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-stone-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
              <p className="text-sm">Cargando productos de librería...</p>
            </div>
          ) : filtradosLibreria.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 p-8 text-center text-stone-500">
              <BookOpenIcon className="h-10 w-10 text-stone-300 mb-2" />
              <p className="text-base font-medium text-stone-700">No se encontraron productos</p>
              <p className="mt-1 text-xs text-stone-500">
                {busquedaLibreria
                  ? `No hay resultados para "${busquedaLibreria}"`
                  : "No hay productos registrados en esta categoría"}
              </p>
              {onOpenQuickInventory && (
                <button
                  type="button"
                  onClick={() => onOpenQuickInventory()}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-stone-800 transition"
                >
                  <PackagePlusIcon className="h-3.5 w-3.5" />
                  <span>Registrar Primer Producto</span>
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
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200">
                              Agotado
                            </span>
                          ) : producto.stock <= 5 ? (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold text-stone-900 bg-stone-100 border border-stone-300">
                              Stock: {producto.stock} ud.
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-stone-700 bg-stone-50 border border-stone-200">
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
        <div className="border-t border-stone-100 bg-stone-50/70 px-4 py-2 text-xs text-stone-500 shrink-0">
          Mostrando {filtradosLibreria.length} de {productosLibreria.length} artículos de librería
        </div>
      </div>

      {/* ================= Tab 2: Comida & Snacks ================= */}
      <div className={mainTab === "comida" ? "flex flex-1 flex-col min-h-[250px] overflow-hidden" : "hidden"}>
        {/* Header & Search (Compact & Responsive) */}
        <div className="border-b border-stone-200 p-3 sm:p-5 space-y-2.5 sm:space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-stone-900 truncate">
                Comida & Snacks
              </h2>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-stone-600 shrink-0">
                {productosComida.length} empaquetados
              </span>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setFiltroComida("todos")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors shrink-0 ${
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
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors shrink-0 ${
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
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors shrink-0 ${
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
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors shrink-0 ${
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
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
              <SearchIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <input
              type="text"
              value={busquedaComida}
              onChange={(e) => setBusquedaComida(e.target.value)}
              placeholder="Buscar bebidas, refrescos, frituras, galletas, dulces..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 sm:pl-10 pr-10 text-xs sm:text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:bg-white focus:ring-2 focus:ring-stone-200"
            />
            {busquedaComida && (
              <button
                type="button"
                onClick={() => setBusquedaComida("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <XMarkIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Product List Content (Spacious & Scrollable) */}
        <div className="flex-1 min-h-[250px] overflow-y-auto p-3 sm:p-5 space-y-3.5">
          {/* Fast Order Widget: Palomitas de Maíz (Compact sober flat bar) */}
          {(!busquedaComida ||
            busquedaComida.toLowerCase().includes("palo") ||
            busquedaComida.toLowerCase().includes("maiz")) && (
            <div className="rounded-xl border border-stone-200 bg-stone-50/90 p-2 sm:p-2.5 shadow-2xs transition-all shrink-0">
              <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-stone-900 text-white text-xs shrink-0">
                    🍿
                  </span>
                  <span className="text-xs font-bold text-stone-900 truncate">Palomitas</span>
                  <span className="rounded bg-stone-200 px-1.5 py-0.2 text-[10px] font-bold text-stone-800 shrink-0">
                    ${palomitasPrecio}
                  </span>
                </div>

                {/* Quick Price Buttons */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 shrink min-w-0">
                  {["10", "15", "20", "25", "30", "35"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPalomitasPrecio(val)}
                      className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                        palomitasPrecio === val
                          ? "bg-stone-900 text-white shadow-xs"
                          : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>

                {/* Fast Add & Expand Controls */}
                <div className="flex items-center gap-1.5 ml-auto sm:ml-0 shrink-0">
                  <button
                    type="button"
                    onClick={handleAddPalomitas}
                    className="flex items-center gap-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-white px-2.5 py-1.2 text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                  >
                    <PlusIcon className="h-3 w-3" />
                    <span>
                      Añadir ({money.format((parseFloat(palomitasPrecio) || 0) * (parseInt(palomitasCantidad, 10) || 1))})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPalomitasColapsadas(!palomitasColapsadas)}
                    className="p-1 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition cursor-pointer"
                    title={palomitasColapsadas ? "Cerrar ajustes" : "Ajustar cantidad / precio libre"}
                  >
                    {palomitasColapsadas ? (
                      <ChevronUpIcon className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDownIcon className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Collapsible custom quantity & custom price */}
              {palomitasColapsadas && (
                <div className="mt-2 pt-2 border-t border-stone-200 flex items-center justify-between gap-3 flex-wrap text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-stone-600">Precio libre:</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={palomitasPrecio}
                      onChange={(e) => setPalomitasPrecio(e.target.value)}
                      className="w-16 rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs font-bold text-stone-900 outline-none focus:border-stone-600"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-stone-600">Porciones:</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={palomitasCantidad}
                      onChange={(e) => setPalomitasCantidad(e.target.value)}
                      className="w-12 rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs font-bold text-stone-900 text-center outline-none focus:border-stone-600"
                    />
                    <div className="flex gap-1">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setPalomitasCantidad(n.toString())}
                          className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                            palomitasCantidad === n.toString()
                              ? "bg-stone-900 text-white"
                              : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section header for Packaged goods */}
          <div className="flex items-center justify-between pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Artículos Empaquetados ({filtradosComida.length})
            </h3>
            {onOpenQuickInventory && (
              <button
                type="button"
                onClick={() => onOpenQuickInventory()}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-700 hover:text-stone-950 transition cursor-pointer"
              >
                <PackagePlusIcon className="h-3 w-3" />
                <span>+ Nuevo producto</span>
              </button>
            )}
          </div>

          {/* Packaged Goods Cards Grid */}
          {cargando ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-stone-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
              <p className="text-sm">Cargando snacks y bebidas...</p>
            </div>
          ) : filtradosComida.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 p-6 text-center text-stone-500">
              <UtensilsIcon className="h-8 w-8 text-stone-300 mb-2" />
              <p className="text-sm font-medium text-stone-700">No hay productos empaquetados registrados</p>
              <p className="mt-1 text-xs text-stone-500">
                {busquedaComida
                  ? `No hay resultados para "${busquedaComida}"`
                  : "Registra refrescos, botanas o dulces en Comida & Snacks con su stock."}
              </p>
              {onOpenQuickInventory && (
                <button
                  type="button"
                  onClick={() => onOpenQuickInventory()}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-stone-800 transition"
                >
                  <PackagePlusIcon className="h-3.5 w-3.5" />
                  <span>Agregar Producto Físico</span>
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
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200">
                              Agotado
                            </span>
                          ) : producto.stock <= 5 ? (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold text-stone-900 bg-stone-100 border border-stone-300">
                              Stock: {producto.stock} ud.
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-stone-700 bg-stone-50 border border-stone-200">
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
        <div className="border-t border-stone-100 bg-stone-50/70 px-4 py-2 text-xs text-stone-500 shrink-0">
          Mostrando {filtradosComida.length} de {productosComida.length} artículos empaquetados
        </div>
      </div>

      {/* ================= Tab 3: Servicios Rápidos ================= */}
      <div className={mainTab === "servicios" ? "flex flex-1 flex-col min-h-[250px] overflow-hidden" : "hidden"}>
        <ServicesSelector
          servicios={servicios}
          onAddServiceToCart={onAddServiceToCart}
        />
      </div>
    </div>
  );
}

