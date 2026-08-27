"use client";

import { useState } from "react";
import type { Servicio, CartItemServicio } from "@/types/database";
import {
  CopyIcon,
  PrinterIcon,
  BookOpenIcon,
  LayersIcon,
  SparklesIcon,
  PlusIcon,
} from "./Icons";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

interface ServicesSelectorProps {
  servicios: Servicio[];
  onAddServiceToCart: (item: Omit<CartItemServicio, "id">) => void;
}

type TabServicio =
  | "fotocopias"
  | "impresiones"
  | "encolochados"
  | "laminados"
  | "sublimados";

export function ServicesSelector({
  servicios,
  onAddServiceToCart,
}: ServicesSelectorProps) {
  const [tabActiva, setTabActiva] = useState<TabServicio>("fotocopias");

  // Helper to find service by code
  const getServicio = (codigo: string): Servicio | undefined => {
    return servicios.find((s) => s.codigo === codigo);
  };

  // State 1: Fotocopias
  const [fotocopiaModalidad, setFotocopiaModalidad] = useState<"bn" | "color">("bn");
  const [fotocopiaPaginas, setFotocopiaPaginas] = useState<number>(1);

  // State 2: Impresiones
  const [impresionModalidad, setImpresionModalidad] = useState<"bn" | "color">("bn");
  const [impresionPaginas, setImpresionPaginas] = useState<number>(1);

  // State 3: Encolochados
  const [encolochadoHojas, setEncolochadoHojas] = useState<number>(20);

  // State 4: Laminados
  const [laminadoTipo, setLaminadoTipo] = useState<"carta" | "media_carta">("carta");
  const [laminadoCantidad, setLaminadoCantidad] = useState<number>(1);

  // State 5: Sublimados
  const [sublimadoDesc, setSublimadoDesc] = useState<string>("");
  const [sublimadoPrecioUnitario, setSublimadoPrecioUnitario] = useState<string>("85.00");
  const [sublimadoCantidad, setSublimadoCantidad] = useState<number>(1);

  // Service lookup references with fallback prices
  const srvFotocopiaBn = getServicio("fotocopia_bn") || {
    id: "mock-fc-bn",
    codigo: "fotocopia_bn",
    categoria: "fotocopias",
    nombre: "Fotocopia B&N",
    tipo_precio: "por_unidad",
    precio_actual: 1.0,
    version_precio: 1,
    activo: true,
  };
  const srvFotocopiaColor = getServicio("fotocopia_color") || {
    id: "mock-fc-col",
    codigo: "fotocopia_color",
    categoria: "fotocopias",
    nombre: "Fotocopia Color",
    tipo_precio: "por_unidad",
    precio_actual: 5.0,
    version_precio: 1,
    activo: true,
  };

  const srvImpresionBn = getServicio("impresion_bn") || {
    id: "mock-imp-bn",
    codigo: "impresion_bn",
    categoria: "impresiones",
    nombre: "Impresión B&N",
    tipo_precio: "por_unidad",
    precio_actual: 2.0,
    version_precio: 1,
    activo: true,
  };
  const srvImpresionColor = getServicio("impresion_color") || {
    id: "mock-imp-col",
    codigo: "impresion_color",
    categoria: "impresiones",
    nombre: "Impresión Color",
    tipo_precio: "por_unidad",
    precio_actual: 6.0,
    version_precio: 1,
    activo: true,
  };

  const srvEncolochado = getServicio("encolochado_hoja") || {
    id: "mock-enc",
    codigo: "encolochado_hoja",
    categoria: "encolochados",
    nombre: "Encolochado por Hoja",
    tipo_precio: "por_unidad",
    precio_actual: 0.5,
    version_precio: 1,
    activo: true,
  };

  const srvLaminadoCarta = getServicio("laminado_carta") || {
    id: "mock-lam-c",
    codigo: "laminado_carta",
    categoria: "laminados",
    nombre: "Laminado Carta",
    tipo_precio: "fijo",
    precio_actual: 15.0,
    version_precio: 1,
    activo: true,
  };
  const srvLaminadoMedia = getServicio("laminado_media_carta") || {
    id: "mock-lam-mc",
    codigo: "laminado_media_carta",
    categoria: "laminados",
    nombre: "Laminado Media Carta",
    tipo_precio: "fijo",
    precio_actual: 10.0,
    version_precio: 1,
    activo: true,
  };

  const srvSublimado = getServicio("sublimado_articulo") || {
    id: "mock-sub",
    codigo: "sublimado_articulo",
    categoria: "sublimados",
    nombre: "Artículo Sublimado",
    tipo_precio: "variable",
    precio_actual: 0.0,
    version_precio: 1,
    activo: true,
  };

  // Handlers for adding services to cart
  const handleAddFotocopia = () => {
    const srv = fotocopiaModalidad === "bn" ? srvFotocopiaBn : srvFotocopiaColor;
    const paginas = Math.max(1, fotocopiaPaginas || 1);
    const etiquetaModalidad = fotocopiaModalidad === "bn" ? "B&N" : "Color";

    onAddServiceToCart({
      tipo: "servicio",
      servicio: srv,
      nombre: srv.nombre,
      descripcion_personalizada: `${paginas} pág(s) ${etiquetaModalidad}`,
      cantidad: paginas,
      precio_unitario: srv.precio_actual,
      opcion: etiquetaModalidad,
    });
  };

  const handleAddImpresion = () => {
    const srv = impresionModalidad === "bn" ? srvImpresionBn : srvImpresionColor;
    const paginas = Math.max(1, impresionPaginas || 1);
    const etiquetaModalidad = impresionModalidad === "bn" ? "B&N" : "Color";

    onAddServiceToCart({
      tipo: "servicio",
      servicio: srv,
      nombre: srv.nombre,
      descripcion_personalizada: `${paginas} pág(s) ${etiquetaModalidad}`,
      cantidad: paginas,
      precio_unitario: srv.precio_actual,
      opcion: etiquetaModalidad,
    });
  };

  const handleAddEncolochado = () => {
    const hojas = Math.max(1, encolochadoHojas || 1);
    onAddServiceToCart({
      tipo: "servicio",
      servicio: srvEncolochado,
      nombre: "Encolochado de Documento",
      descripcion_personalizada: `${hojas} hojas`,
      cantidad: hojas,
      precio_unitario: srvEncolochado.precio_actual,
    });
  };

  const handleAddLaminado = () => {
    const srv = laminadoTipo === "carta" ? srvLaminadoCarta : srvLaminadoMedia;
    const cant = Math.max(1, laminadoCantidad || 1);
    const tamano = laminadoTipo === "carta" ? "Carta" : "Media Carta";

    onAddServiceToCart({
      tipo: "servicio",
      servicio: srv,
      nombre: srv.nombre,
      descripcion_personalizada: `${cant} mica(s) ${tamano}`,
      cantidad: cant,
      precio_unitario: srv.precio_actual,
      opcion: tamano,
    });
  };

  const handleAddSublimado = () => {
    const desc = sublimadoDesc.trim() || "Personalización personalizada";
    const precio = Math.max(0, parseFloat(sublimadoPrecioUnitario) || 0);
    const cant = Math.max(1, sublimadoCantidad || 1);

    onAddServiceToCart({
      tipo: "servicio",
      servicio: srvSublimado,
      nombre: "Artículo Sublimado",
      descripcion_personalizada: desc,
      cantidad: cant,
      precio_unitario: precio,
    });

    // Reset description for next sublimation
    setSublimadoDesc("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Category selector pills */}
      <div className="border-b border-stone-200 bg-stone-50/70 p-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTabActiva("fotocopias")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 transition-all ${
              tabActiva === "fotocopias"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <CopyIcon className="h-4 w-4" />
            <span>Fotocopias</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva("impresiones")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 transition-all ${
              tabActiva === "impresiones"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <PrinterIcon className="h-4 w-4" />
            <span>Impresiones</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva("laminados")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 transition-all ${
              tabActiva === "laminados"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <LayersIcon className="h-4 w-4" />
            <span>Laminados</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva("encolochados")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 transition-all ${
              tabActiva === "encolochados"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <BookOpenIcon className="h-4 w-4" />
            <span>Encolochado</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva("sublimados")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 transition-all ${
              tabActiva === "sublimados"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <SparklesIcon className="h-4 w-4" />
            <span>Sublimados</span>
          </button>
        </div>
      </div>

      {/* Active Service Form Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* ================= 1. FOTOCOPIAS ================= */}
        {tabActiva === "fotocopias" && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <CopyIcon className="h-5 w-5 text-indigo-600" />
                  Servicio de Fotocopiado
                </h3>
                <p className="text-xs text-stone-500">
                  Selecciona la modalidad de copiado e ingresa el número de páginas.
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
                Tarifa automática
              </span>
            </div>

            {/* Modalidad Selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFotocopiaModalidad("bn")}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                  fotocopiaModalidad === "bn"
                    ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Modalidad
                </span>
                <span className="text-sm font-bold text-stone-900 mt-1">
                  Blanco y Negro (B&N)
                </span>
                <span className="text-lg font-extrabold text-indigo-700 mt-2">
                  {money.format(srvFotocopiaBn.precio_actual)}{" "}
                  <span className="text-xs font-normal text-stone-500">/ pág</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFotocopiaModalidad("color")}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                  fotocopiaModalidad === "color"
                    ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Modalidad
                </span>
                <span className="text-sm font-bold text-stone-900 mt-1">
                  A Color
                </span>
                <span className="text-lg font-extrabold text-indigo-700 mt-2">
                  {money.format(srvFotocopiaColor.precio_actual)}{" "}
                  <span className="text-xs font-normal text-stone-500">/ pág</span>
                </span>
              </button>
            </div>

            {/* Pages Input & Quick Presets */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
              <label className="block text-xs font-bold text-stone-700">
                Número de Páginas
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={fotocopiaPaginas}
                  onChange={(e) =>
                    setFotocopiaPaginas(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="w-32 rounded-xl border border-stone-300 bg-white px-3 py-2 text-center text-lg font-bold text-stone-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[1, 5, 10, 20, 50, 100].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFotocopiaPaginas(n)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                        fotocopiaPaginas === n
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total and Action */}
            <div className="flex items-center justify-between rounded-xl bg-indigo-50/80 border border-indigo-100 p-4">
              <div>
                <span className="text-xs font-medium text-indigo-900">Total a cobrar:</span>
                <div className="text-2xl font-black text-indigo-950 tracking-tight">
                  {money.format(
                    (fotocopiaModalidad === "bn"
                      ? srvFotocopiaBn.precio_actual
                      : srvFotocopiaColor.precio_actual) * (fotocopiaPaginas || 1)
                  )}
                </div>
                <span className="text-[11px] text-indigo-700">
                  {fotocopiaPaginas} pág(s) ×{" "}
                  {money.format(
                    fotocopiaModalidad === "bn"
                      ? srvFotocopiaBn.precio_actual
                      : srvFotocopiaColor.precio_actual
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddFotocopia}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Agregar al Carrito</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= 2. IMPRESIONES ================= */}
        {tabActiva === "impresiones" && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <PrinterIcon className="h-5 w-5 text-indigo-600" />
                  Servicio de Impresiones
                </h3>
                <p className="text-xs text-stone-500">
                  Impresión digital de documentos desde USB, correo o teléfono.
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
                Tarifa automática
              </span>
            </div>

            {/* Modalidad Selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setImpresionModalidad("bn")}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                  impresionModalidad === "bn"
                    ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Tipo de Impresión
                </span>
                <span className="text-sm font-bold text-stone-900 mt-1">
                  Blanco y Negro (B&N)
                </span>
                <span className="text-lg font-extrabold text-indigo-700 mt-2">
                  {money.format(srvImpresionBn.precio_actual)}{" "}
                  <span className="text-xs font-normal text-stone-500">/ pág</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setImpresionModalidad("color")}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                  impresionModalidad === "color"
                    ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Tipo de Impresión
                </span>
                <span className="text-sm font-bold text-stone-900 mt-1">
                  A Color / Imágenes
                </span>
                <span className="text-lg font-extrabold text-indigo-700 mt-2">
                  {money.format(srvImpresionColor.precio_actual)}{" "}
                  <span className="text-xs font-normal text-stone-500">/ pág</span>
                </span>
              </button>
            </div>

            {/* Pages Input & Quick Presets */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
              <label className="block text-xs font-bold text-stone-700">
                Número de Páginas a Imprimir
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={impresionPaginas}
                  onChange={(e) =>
                    setImpresionPaginas(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="w-32 rounded-xl border border-stone-300 bg-white px-3 py-2 text-center text-lg font-bold text-stone-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[1, 3, 5, 10, 25, 50].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setImpresionPaginas(n)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                        impresionPaginas === n
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total and Action */}
            <div className="flex items-center justify-between rounded-xl bg-indigo-50/80 border border-indigo-100 p-4">
              <div>
                <span className="text-xs font-medium text-indigo-900">Total a cobrar:</span>
                <div className="text-2xl font-black text-indigo-950 tracking-tight">
                  {money.format(
                    (impresionModalidad === "bn"
                      ? srvImpresionBn.precio_actual
                      : srvImpresionColor.precio_actual) * (impresionPaginas || 1)
                  )}
                </div>
                <span className="text-[11px] text-indigo-700">
                  {impresionPaginas} pág(s) ×{" "}
                  {money.format(
                    impresionModalidad === "bn"
                      ? srvImpresionBn.precio_actual
                      : srvImpresionColor.precio_actual
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddImpresion}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Agregar al Carrito</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= 3. LAMINADOS ================= */}
        {tabActiva === "laminados" && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <LayersIcon className="h-5 w-5 text-indigo-600" />
                  Servicio de Laminado / Termolaminación
                </h3>
                <p className="text-xs text-stone-500">
                  Plastificado térmico de documentos, credenciales y títulos.
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
                Tarifa fija
              </span>
            </div>

            {/* Size Selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLaminadoTipo("carta")}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                  laminadoTipo === "carta"
                    ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Formato
                </span>
                <span className="text-sm font-bold text-stone-900 mt-1">
                  Tamaño Carta
                </span>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Mica térmica estándar (8.5 x 11 in)
                </p>
                <span className="text-lg font-extrabold text-indigo-700 mt-2">
                  {money.format(srvLaminadoCarta.precio_actual)}{" "}
                  <span className="text-xs font-normal text-stone-500">c/u</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLaminadoTipo("media_carta")}
                className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                  laminadoTipo === "media_carta"
                    ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Formato
                </span>
                <span className="text-sm font-bold text-stone-900 mt-1">
                  Media Carta / Credencial
                </span>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Mica para gafetes y credenciales
                </p>
                <span className="text-lg font-extrabold text-indigo-700 mt-2">
                  {money.format(srvLaminadoMedia.precio_actual)}{" "}
                  <span className="text-xs font-normal text-stone-500">c/u</span>
                </span>
              </button>
            </div>

            {/* Quantity Input */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
              <label className="block text-xs font-bold text-stone-700">
                Cantidad de Micas / Piezas
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={laminadoCantidad}
                  onChange={(e) =>
                    setLaminadoCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="w-32 rounded-xl border border-stone-300 bg-white px-3 py-2 text-center text-lg font-bold text-stone-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 5, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLaminadoCantidad(n)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                        laminadoCantidad === n
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      {n} un.
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total and Action */}
            <div className="flex items-center justify-between rounded-xl bg-indigo-50/80 border border-indigo-100 p-4">
              <div>
                <span className="text-xs font-medium text-indigo-900">Total a cobrar:</span>
                <div className="text-2xl font-black text-indigo-950 tracking-tight">
                  {money.format(
                    (laminadoTipo === "carta"
                      ? srvLaminadoCarta.precio_actual
                      : srvLaminadoMedia.precio_actual) * (laminadoCantidad || 1)
                  )}
                </div>
                <span className="text-[11px] text-indigo-700">
                  {laminadoCantidad} pieza(s) {laminadoTipo === "carta" ? "Carta" : "Media Carta"}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddLaminado}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Agregar al Carrito</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= 4. ENCOLOCHADOS ================= */}
        {tabActiva === "encolochados" && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <BookOpenIcon className="h-5 w-5 text-indigo-600" />
                  Servicio de Encolochado / Espiral
                </h3>
                <p className="text-xs text-stone-500">
                  Encuadernación con espiral de plástico y pastas transparentes/negras.
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
                Tarifa por hoja
              </span>
            </div>

            {/* Tariff overview banner */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-900">
                  Tarifa configurada por hoja:
                </span>
                <p className="text-xs text-indigo-700 mt-0.5">
                  Multiplica el número exacto de hojas por la cuota vigente.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-indigo-900">
                  {money.format(srvEncolochado.precio_actual)}
                </span>
                <span className="text-xs text-indigo-600 block">/ hoja</span>
              </div>
            </div>

            {/* Sheets Input */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
              <label className="block text-xs font-bold text-stone-700">
                Cantidad de Hojas del Documento
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={encolochadoHojas}
                  onChange={(e) =>
                    setEncolochadoHojas(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="w-32 rounded-xl border border-stone-300 bg-white px-3 py-2 text-center text-lg font-bold text-stone-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[20, 50, 100, 150, 200].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEncolochadoHojas(n)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                        encolochadoHojas === n
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      {n} hojas
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total and Action */}
            <div className="flex items-center justify-between rounded-xl bg-indigo-50/80 border border-indigo-100 p-4">
              <div>
                <span className="text-xs font-medium text-indigo-900">Total a cobrar:</span>
                <div className="text-2xl font-black text-indigo-950 tracking-tight">
                  {money.format(srvEncolochado.precio_actual * (encolochadoHojas || 1))}
                </div>
                <span className="text-[11px] text-indigo-700">
                  {encolochadoHojas} hojas × {money.format(srvEncolochado.precio_actual)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddEncolochado}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Agregar al Carrito</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= 5. SUBLIMADOS ================= */}
        {tabActiva === "sublimados" && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-indigo-600" />
                  Artículos Sublimados / Personalizados
                </h3>
                <p className="text-xs text-stone-500">
                  Precio libre y descripción personalizada para tazas, playeras, termos, etc.
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                Precio abierto
              </span>
            </div>

            {/* Description input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                Descripción del Artículo / Personalización
              </label>
              <input
                type="text"
                value={sublimadoDesc}
                onChange={(e) => setSublimadoDesc(e.target.value)}
                placeholder="Ej. Taza mágica 11oz con diseño graduación, Playera Blanca M..."
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Unit Price and Quantity in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700">
                  Precio Unitario Manual ($)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400 font-bold text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sublimadoPrecioUnitario}
                    onChange={(e) => setSublimadoPrecioUnitario(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-7 pr-3 text-base font-bold text-stone-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700">
                  Cantidad de Artículos
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={sublimadoCantidad}
                  onChange={(e) =>
                    setSublimadoCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base font-bold text-stone-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-center"
                />
              </div>
            </div>

            {/* Presets suggestions for common sublimation items */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-stone-500">
                Plantillas rápidas sugeridas:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { desc: "Taza blanca 11oz personalizada", precio: "65.00" },
                  { desc: "Taza mágica negra 11oz", precio: "120.00" },
                  { desc: "Playera sublimada blanca", precio: "150.00" },
                  { desc: "Termo de aluminio 500ml", precio: "180.00" },
                  { desc: "Gorra personalizada", precio: "90.00" },
                ].map((item) => (
                  <button
                    key={item.desc}
                    type="button"
                    onClick={() => {
                      setSublimadoDesc(item.desc);
                      setSublimadoPrecioUnitario(item.precio);
                    }}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition"
                  >
                    {item.desc} (${item.precio})
                  </button>
                ))}
              </div>
            </div>

            {/* Total and Action */}
            <div className="flex items-center justify-between rounded-xl bg-indigo-50/80 border border-indigo-100 p-4">
              <div>
                <span className="text-xs font-medium text-indigo-900">Total a cobrar:</span>
                <div className="text-2xl font-black text-indigo-950 tracking-tight">
                  {money.format(
                    (parseFloat(sublimadoPrecioUnitario) || 0) * (sublimadoCantidad || 1)
                  )}
                </div>
                <span className="text-[11px] text-indigo-700">
                  {sublimadoCantidad} un. ×{" "}
                  {money.format(parseFloat(sublimadoPrecioUnitario) || 0)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddSublimado}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Agregar al Carrito</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
