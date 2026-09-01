"use client";

import { useState } from "react";
import type { Servicio, CartItemServicio } from "@/types/database";
import {
  CopyIcon,
  PrinterIcon,
  BookOpenIcon,
  LayersIcon,
  TagIcon,
  PlusIcon,
  MoreHorizontalIcon,
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
  | "laminados"
  | "encolochados"
  | "sublimados"
  | "otros";

export function ServicesSelector({
  servicios,
  onAddServiceToCart,
}: ServicesSelectorProps) {
  const [tabActiva, setTabActiva] = useState<TabServicio>("fotocopias");

  // Helper to find service by code
  const getServicio = (codigo: string): Servicio | undefined => {
    return servicios.find((s) => s.codigo === codigo);
  };

  // State 1: Fotocopias (Color has variable price per page)
  const [fotocopiaModalidad, setFotocopiaModalidad] = useState<"bn" | "color">("bn");
  const [fotocopiaPaginas, setFotocopiaPaginas] = useState<string>("1");
  const [fotocopiaColorPrecioPorPagina, setFotocopiaColorPrecioPorPagina] = useState<string>("5.00");

  // State 2: Impresiones (Color has variable price per page)
  const [impresionModalidad, setImpresionModalidad] = useState<"bn" | "color">("bn");
  const [impresionPaginas, setImpresionPaginas] = useState<string>("1");
  const [impresionColorPrecioPorPagina, setImpresionColorPrecioPorPagina] = useState<string>("6.00");

  // State 3: Encolochados (Variable price)
  const [encolochadoPrecio, setEncolochadoPrecio] = useState<string>("25.00");
  const [encolochadoHojas, setEncolochadoHojas] = useState<string>("50");
  const [encolochadoCantidad, setEncolochadoCantidad] = useState<string>("1");
  const [encolochadoDetalle, setEncolochadoDetalle] = useState<string>("");

  // State 4: Laminados & Emplasticados (Variable price)
  const [laminadoTipo, setLaminadoTipo] = useState<"carta" | "media_carta" | "oficio" | "doble_carta" | "otro">("carta");
  const [laminadoPrecioUnitario, setLaminadoPrecioUnitario] = useState<string>("15.00");
  const [laminadoCantidad, setLaminadoCantidad] = useState<string>("1");

  // State 5: Sublimados
  const [sublimadoDesc, setSublimadoDesc] = useState<string>("Taza blanca personalizada");
  const [sublimadoPrecioUnitario, setSublimadoPrecioUnitario] = useState<string>("65.00");
  const [sublimadoCantidad, setSublimadoCantidad] = useState<string>("1");

  // State 6: Otro Servicio (Extra / Personalizado)
  const [otroNombre, setOtroNombre] = useState<string>("Escaneo de documentos");
  const [otroPrecioUnitario, setOtroPrecioUnitario] = useState<string>("10.00");
  const [otroCantidad, setOtroCantidad] = useState<string>("1");

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
    tipo_precio: "variable",
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
    tipo_precio: "variable",
    precio_actual: 6.0,
    version_precio: 1,
    activo: true,
  };

  const srvEncolochado = getServicio("encolochado_hoja") || {
    id: "mock-enc",
    codigo: "encolochado_hoja",
    categoria: "encolochados",
    nombre: "Encolochado de Documento",
    tipo_precio: "variable",
    precio_actual: 25.0,
    version_precio: 1,
    activo: true,
  };

  const srvLaminadoCarta = getServicio("laminado_carta") || {
    id: "mock-lam-c",
    codigo: "laminado_carta",
    categoria: "laminados",
    nombre: "Laminado Carta",
    tipo_precio: "variable",
    precio_actual: 15.0,
    version_precio: 1,
    activo: true,
  };
  const srvLaminadoMedia = getServicio("laminado_media_carta") || {
    id: "mock-lam-mc",
    codigo: "laminado_media_carta",
    categoria: "laminados",
    nombre: "Laminado Media Carta",
    tipo_precio: "variable",
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

  const srvOtro = getServicio("servicio_otro") || {
    id: "mock-otro",
    codigo: "servicio_otro",
    categoria: "otros",
    nombre: "Otro Servicio",
    tipo_precio: "variable",
    precio_actual: 0.0,
    version_precio: 1,
    activo: true,
  };

  // Handlers for adding services to cart
  const handleAddFotocopia = () => {
    const paginas = Math.max(1, parseInt(fotocopiaPaginas, 10) || 1);
    const esColor = fotocopiaModalidad === "color";
    const srv = esColor ? srvFotocopiaColor : srvFotocopiaBn;
    const precioUnitario = esColor
      ? Math.max(0, parseFloat(fotocopiaColorPrecioPorPagina) || 0)
      : srvFotocopiaBn.precio_actual;

    onAddServiceToCart({
      tipo: "servicio",
      servicio: srv,
      nombre: srv.nombre,
      descripcion_personalizada: `${paginas} pág(s) ${esColor ? `Color ($${precioUnitario}/pág)` : "B&N"}`,
      cantidad: paginas,
      precio_unitario: precioUnitario,
      opcion: esColor ? "Color" : "B&N",
    });
  };

  const handleAddImpresion = () => {
    const paginas = Math.max(1, parseInt(impresionPaginas, 10) || 1);
    const esColor = impresionModalidad === "color";
    const srv = esColor ? srvImpresionColor : srvImpresionBn;
    const precioUnitario = esColor
      ? Math.max(0, parseFloat(impresionColorPrecioPorPagina) || 0)
      : srvImpresionBn.precio_actual;

    onAddServiceToCart({
      tipo: "servicio",
      servicio: srv,
      nombre: srv.nombre,
      descripcion_personalizada: `${paginas} pág(s) ${esColor ? `Color ($${precioUnitario}/pág)` : "B&N"}`,
      cantidad: paginas,
      precio_unitario: precioUnitario,
      opcion: esColor ? "Color" : "B&N",
    });
  };

  const handleAddEncolochado = () => {
    const precioUnitario = Math.max(0, parseFloat(encolochadoPrecio) || 0);
    const cant = Math.max(1, parseInt(encolochadoCantidad, 10) || 1);
    const hojas = parseInt(encolochadoHojas, 10) || 0;
    const detalle = encolochadoDetalle.trim()
      ? encolochadoDetalle.trim()
      : hojas > 0
      ? `Encolochado (~${hojas} hojas)`
      : "Encolochado de documento";

    onAddServiceToCart({
      tipo: "servicio",
      servicio: srvEncolochado,
      nombre: "Encolochado de Documento",
      descripcion_personalizada: `${cant} unidad(es) - ${detalle} ($${precioUnitario}/u)`,
      cantidad: cant,
      precio_unitario: precioUnitario,
      opcion: "Variable",
    });
  };

  const handleAddLaminado = () => {
    const srv = laminadoTipo === "media_carta" ? srvLaminadoMedia : srvLaminadoCarta;
    const cant = Math.max(1, parseInt(laminadoCantidad, 10) || 1);
    const precioUnitario = Math.max(0, parseFloat(laminadoPrecioUnitario) || 0);
    const formatoLabel =
      laminadoTipo === "carta"
        ? "Carta"
        : laminadoTipo === "media_carta"
        ? "Media Carta / Carné"
        : laminadoTipo === "oficio"
        ? "Oficio"
        : laminadoTipo === "doble_carta"
        ? "Doble Carta"
        : "Personalizado";

    onAddServiceToCart({
      tipo: "servicio",
      servicio: srv,
      nombre: "Laminado / Emplasticado",
      descripcion_personalizada: `${cant} unidad(es) - Formato ${formatoLabel} ($${precioUnitario}/u)`,
      cantidad: cant,
      precio_unitario: precioUnitario,
      opcion: formatoLabel,
    });
  };

  const handleAddSublimado = () => {
    const pUni = parseFloat(sublimadoPrecioUnitario) || 0;
    const cant = Math.max(1, parseInt(sublimadoCantidad, 10) || 1);
    const desc = sublimadoDesc.trim() || "Artículo personalizado";

    onAddServiceToCart({
      tipo: "servicio",
      servicio: srvSublimado,
      nombre: "Artículo Sublimado",
      descripcion_personalizada: `${desc} (x${cant})`,
      cantidad: cant,
      precio_unitario: pUni,
    });
  };

  const handleAddOtroServicio = () => {
    const pUni = parseFloat(otroPrecioUnitario) || 0;
    const cant = Math.max(1, parseInt(otroCantidad, 10) || 1);
    const nombre = otroNombre.trim() || "Otro Servicio";

    onAddServiceToCart({
      tipo: "servicio",
      servicio: srvOtro,
      nombre: nombre,
      descripcion_personalizada: `${nombre} (x${cant})`,
      cantidad: cant,
      precio_unitario: pUni,
      opcion: "Personalizado",
    });
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Services Category Tabs */}
      <div className="flex items-center border-b border-stone-200 bg-stone-50/80 p-2 gap-1.5 overflow-x-auto shrink-0">
        <button
          type="button"
          onClick={() => setTabActiva("fotocopias")}
          className={`flex items-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            tabActiva === "fotocopias"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80"
          }`}
        >
          <CopyIcon className="h-4 w-4" />
          <span>Fotocopias</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("impresiones")}
          className={`flex items-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            tabActiva === "impresiones"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80"
          }`}
        >
          <PrinterIcon className="h-4 w-4" />
          <span>Impresiones</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("laminados")}
          className={`flex items-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            tabActiva === "laminados"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80"
          }`}
        >
          <LayersIcon className="h-4 w-4" />
          <span>Laminados</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("encolochados")}
          className={`flex items-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            tabActiva === "encolochados"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80"
          }`}
        >
          <BookOpenIcon className="h-4 w-4" />
          <span>Encolochados</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("sublimados")}
          className={`flex items-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            tabActiva === "sublimados"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80"
          }`}
        >
          <TagIcon className="h-4 w-4" />
          <span>Sublimados</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("otros")}
          className={`flex items-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            tabActiva === "otros"
              ? "bg-stone-900 text-white shadow-xs"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80"
          }`}
        >
          <MoreHorizontalIcon className="h-4 w-4" />
          <span>Otro</span>
        </button>
      </div>

      {/* Main Tab Body */}
      <div className="flex-1 min-h-[250px] overflow-y-auto p-3.5 sm:p-5 space-y-6">
        {/* ================= 1. FOTOCOPIAS ================= */}
        {tabActiva === "fotocopias" && (
          <div className="max-w-xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Servicio de Fotocopiado
                </h3>
                <p className="text-xs text-stone-500">
                  B&N con tarifa de catálogo y Color con tarifa libre en caja.
                </p>
              </div>
            </div>

            {/* Modalidad Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFotocopiaModalidad("bn")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  fotocopiaModalidad === "bn"
                    ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900/10"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase text-stone-600">
                    Blanco y Negro
                  </span>
                  <span className="font-extrabold text-sm text-stone-900">
                    {money.format(srvFotocopiaBn.precio_actual)} / pág
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  Tarifa fija de catálogo.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFotocopiaModalidad("color")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  fotocopiaModalidad === "color"
                    ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900/10"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase text-stone-700">
                    A Todo Color
                  </span>
                  <span className="font-extrabold text-xs text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                    Tarifa Variable
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  Precio editable según cobertura de tinta.
                </p>
              </button>
            </div>

            {/* Color Price per Page Input if Color selected */}
            {fotocopiaModalidad === "color" && (
              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2">
                <label className="block text-xs font-bold text-stone-700">
                  Costo por Página a Color ($)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={fotocopiaColorPrecioPorPagina}
                    onChange={(e) => setFotocopiaColorPrecioPorPagina(e.target.value)}
                    className="w-28 rounded-xl border border-stone-300 bg-white p-2.5 text-center text-base font-bold text-stone-900 outline-none focus:border-stone-600"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {["3.00", "5.00", "7.00", "10.00"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFotocopiaColorPrecioPorPagina(p)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                          fotocopiaColorPrecioPorPagina === p
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
            )}

            {/* Pages Input & Quick Steppers */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
              <label className="block text-xs font-bold text-stone-700">
                Número de Páginas / Copias
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={fotocopiaPaginas}
                  onChange={(e) => setFotocopiaPaginas(e.target.value)}
                  onBlur={() => {
                    if (!fotocopiaPaginas || parseInt(fotocopiaPaginas, 10) < 1) {
                      setFotocopiaPaginas("1");
                    }
                  }}
                  className="w-28 rounded-xl border border-stone-300 bg-white p-2.5 text-center text-lg font-black text-stone-900 outline-none focus:border-stone-600"
                />

                {/* Quick Add Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[1, 5, 10, 20, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFotocopiaPaginas(num.toString())}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                        fotocopiaPaginas === num.toString()
                          ? "bg-stone-900 text-white"
                          : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subtotal & Add Button */}
            <div className="flex items-center justify-between rounded-xl bg-stone-100/70 p-4 border border-stone-200">
              <div>
                <span className="text-xs text-stone-500">Subtotal del servicio:</span>
                <div className="text-xl font-black text-stone-900">
                  {money.format(
                    (fotocopiaModalidad === "bn"
                      ? srvFotocopiaBn.precio_actual
                      : Math.max(0, parseFloat(fotocopiaColorPrecioPorPagina) || 0)) *
                      Math.max(1, parseInt(fotocopiaPaginas, 10) || 1)
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddFotocopia}
                className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-xs font-bold text-white shadow-xs hover:bg-stone-800 active:scale-95 transition cursor-pointer"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Agregar al Carrito</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= 2. IMPRESIONES ================= */}
        {tabActiva === "impresiones" && (
          <div className="max-w-xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Servicio de Impresión Digital
                </h3>
                <p className="text-xs text-stone-500">
                  B&N con tarifa de catálogo y Color con tarifa libre en caja.
                </p>
              </div>
            </div>

            {/* Modalidad Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setImpresionModalidad("bn")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  impresionModalidad === "bn"
                    ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900/10"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase text-stone-600">
                    Blanco y Negro
                  </span>
                  <span className="font-extrabold text-sm text-stone-900">
                    {money.format(srvImpresionBn.precio_actual)} / pág
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  Documentos, tareas, guías.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setImpresionModalidad("color")}
                className={`p-4 rounded-xl border text-left transition-all ${
                  impresionModalidad === "color"
                    ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900/10"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase text-stone-700">
                    Color HD
                  </span>
                  <span className="font-extrabold text-xs text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                    Tarifa Variable
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  Precio según cantidad de color y tipo de papel.
                </p>
              </button>
            </div>

            {/* Color Price per Page Input if Color selected */}
            {impresionModalidad === "color" && (
              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2">
                <label className="block text-xs font-bold text-stone-700">
                  Costo por Página a Color ($)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={impresionColorPrecioPorPagina}
                    onChange={(e) => setImpresionColorPrecioPorPagina(e.target.value)}
                    className="w-28 rounded-xl border border-stone-300 bg-white p-2.5 text-center text-base font-bold text-stone-900 outline-none focus:border-stone-600"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {["4.00", "6.00", "8.00", "12.00", "15.00"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setImpresionColorPrecioPorPagina(p)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                          impresionColorPrecioPorPagina === p
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
            )}

            {/* Pages Input & Quick Steppers */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
              <label className="block text-xs font-bold text-stone-700">
                Cantidad de Páginas Impresas
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={impresionPaginas}
                  onChange={(e) => setImpresionPaginas(e.target.value)}
                  onBlur={() => {
                    if (!impresionPaginas || parseInt(impresionPaginas, 10) < 1) {
                      setImpresionPaginas("1");
                    }
                  }}
                  className="w-28 rounded-xl border border-stone-300 bg-white p-2.5 text-center text-lg font-black text-stone-900 outline-none focus:border-stone-600"
                />

                {/* Quick Add Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[1, 5, 10, 20, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setImpresionPaginas(num.toString())}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                        impresionPaginas === num.toString()
                          ? "bg-stone-900 text-white"
                          : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subtotal & Add Button */}
            <div className="flex items-center justify-between rounded-xl bg-stone-100/70 p-4 border border-stone-200">
              <div>
                <span className="text-xs text-stone-500">Subtotal del servicio:</span>
                <div className="text-xl font-black text-stone-900">
                  {money.format(
                    (impresionModalidad === "bn"
                      ? srvImpresionBn.precio_actual
                      : Math.max(0, parseFloat(impresionColorPrecioPorPagina) || 0)) *
                      Math.max(1, parseInt(impresionPaginas, 10) || 1)
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddImpresion}
                className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-xs font-bold text-white shadow-xs hover:bg-stone-800 active:scale-95 transition cursor-pointer"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Agregar al Carrito</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= 3. LAMINADOS / EMPLASTICADOS ================= */}
        {tabActiva === "laminados" && (
          <div className="max-w-xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Laminado / Emplasticado
                </h3>
                <p className="text-xs text-stone-500">
                  Protección térmica para credenciales, carnés, diplomas y documentos con precio variable en caja.
                </p>
              </div>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700 border border-stone-200">
                Tarifa Variable
              </span>
            </div>

            {/* Format Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: "carta" as const, label: "Carta", def: "15.00", desc: "Diplomas, certificados, hojas" },
                { id: "media_carta" as const, label: "Media Carta / Carné", def: "10.00", desc: "Credenciales, tarjetas" },
                { id: "oficio" as const, label: "Oficio", def: "20.00", desc: "Hojas tamaño oficio" },
                { id: "doble_carta" as const, label: "Doble Carta / A3", def: "30.00", desc: "Planos, carteles" },
                { id: "otro" as const, label: "Personalizado", def: "15.00", desc: "Formato a la medida" },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => {
                    setLaminadoTipo(fmt.id);
                    if (fmt.id !== "otro") {
                      setLaminadoPrecioUnitario(fmt.def);
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    laminadoTipo === fmt.id
                      ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900/10 shadow-2xs"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-stone-800">
                      {fmt.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 line-clamp-1">
                    {fmt.desc}
                  </p>
                </button>
              ))}
            </div>

            {/* Variable Unit Price Input */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                Precio Unitario del Laminado / Emplasticado ($)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={laminadoPrecioUnitario}
                  onChange={(e) => setLaminadoPrecioUnitario(e.target.value)}
                  className="w-28 rounded-xl border border-stone-300 bg-white p-2.5 text-center text-lg font-bold text-stone-900 outline-none focus:border-stone-600"
                />
                <div className="flex flex-wrap gap-1.5">
                  {["10.00", "15.00", "20.00", "25.00", "30.00", "40.00"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setLaminadoPrecioUnitario(p)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                        laminadoPrecioUnitario === p
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

            {/* Quantity */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                Cantidad de Micas a Laminar
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={laminadoCantidad}
                  onChange={(e) => setLaminadoCantidad(e.target.value)}
                  onBlur={() => {
                    if (!laminadoCantidad || parseInt(laminadoCantidad, 10) < 1) {
                      setLaminadoCantidad("1");
                    }
                  }}
                  className="w-28 rounded-xl border border-stone-300 bg-white p-2.5 text-center text-lg font-black text-stone-900 outline-none focus:border-stone-600"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setLaminadoCantidad(num.toString())}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                        laminadoCantidad === num.toString()
                          ? "bg-stone-900 text-white"
                          : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subtotal & Add Button */}
            <div className="flex items-center justify-between rounded-xl bg-stone-100/70 p-4 border border-stone-200">
              <div>
                <span className="text-xs text-stone-500">Subtotal del servicio:</span>
                <div className="text-xl font-black text-stone-900">
                  {money.format(
                    Math.max(0, parseFloat(laminadoPrecioUnitario) || 0) *
                      Math.max(1, parseInt(laminadoCantidad, 10) || 1)
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddLaminado}
                className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-xs font-bold text-white shadow-xs hover:bg-stone-800 active:scale-95 transition cursor-pointer"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Agregar al Carrito</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= 4. ENCOLOCHADOS ================= */}
        {tabActiva === "encolochados" && (
          <div className="max-w-xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Encolochado de Documentos
                </h3>
                <p className="text-xs text-stone-500">
                  Encuadernación con resorte plástico y pastas con precio variable en caja.
                </p>
              </div>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700 border border-stone-200">
                Tarifa Variable
              </span>
            </div>

            {/* Variable Price Input with quick suggestion buttons */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                Precio del Encolochado ($)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="1.00"
                  min="0"
                  value={encolochadoPrecio}
                  onChange={(e) => setEncolochadoPrecio(e.target.value)}
                  className="w-28 rounded-xl border border-stone-300 bg-white p-2.5 text-center text-lg font-bold text-stone-900 outline-none focus:border-stone-600"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "$15 (Chico)", val: "15.00" },
                    { label: "$25 (Mediano)", val: "25.00" },
                    { label: "$35 (Grande)", val: "35.00" },
                    { label: "$50 (Extra)", val: "50.00" },
                    { label: "$75", val: "75.00" },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setEncolochadoPrecio(p.val)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                        encolochadoPrecio === p.val
                          ? "bg-stone-900 text-white"
                          : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet Count or Custom description */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-stone-700">
                  Hojas aproximadas / Detalles del cuaderno
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={encolochadoHojas}
                  onChange={(e) => setEncolochadoHojas(e.target.value)}
                  onBlur={() => {
                    if (!encolochadoHojas || parseInt(encolochadoHojas, 10) < 1) {
                      setEncolochadoHojas("1");
                    }
                  }}
                  className="w-28 rounded-xl border border-stone-300 bg-white p-2.5 text-center text-lg font-black text-stone-900 outline-none focus:border-stone-600"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[10, 25, 50, 80, 100, 150, 200].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setEncolochadoHojas(num.toString())}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                        encolochadoHojas === num.toString()
                          ? "bg-stone-900 text-white"
                          : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {num} h.
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={encolochadoDetalle}
                  onChange={(e) => setEncolochadoDetalle(e.target.value)}
                  placeholder="Nota opcional (ej. Resorte negro 1/2 pulgada, pasta azul...)"
                  className="w-full rounded-xl border border-stone-300 bg-white p-2 text-xs text-stone-900 outline-none focus:border-stone-600"
                />
              </div>
            </div>

            {/* Quantity */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                Cantidad de Encolochados
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={encolochadoCantidad}
                  onChange={(e) => setEncolochadoCantidad(e.target.value)}
                  onBlur={() => {
                    if (!encolochadoCantidad || parseInt(encolochadoCantidad, 10) < 1) {
                      setEncolochadoCantidad("1");
                    }
                  }}
                  className="w-28 rounded-xl border border-stone-300 bg-white p-2.5 text-center text-lg font-black text-stone-900 outline-none focus:border-stone-600"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setEncolochadoCantidad(num.toString())}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                        encolochadoCantidad === num.toString()
                          ? "bg-stone-900 text-white"
                          : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Subtotal & Add Button */}
            <div className="flex items-center justify-between rounded-xl bg-stone-100/70 p-4 border border-stone-200">
              <div>
                <span className="text-xs text-stone-500">Subtotal del servicio:</span>
                <div className="text-xl font-black text-stone-900">
                  {money.format(
                    Math.max(0, parseFloat(encolochadoPrecio) || 0) *
                      Math.max(1, parseInt(encolochadoCantidad, 10) || 1)
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddEncolochado}
                className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-xs font-bold text-white shadow-xs hover:bg-stone-800 active:scale-95 transition cursor-pointer"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Agregar al Carrito</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= 5. SUBLIMADOS ================= */}
        {tabActiva === "sublimados" && (
          <div className="max-w-xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Artículos Sublimados y Personalizados
                </h3>
                <p className="text-xs text-stone-500">
                  Tazas, playeras, termos, gorras y artículos bajo pedido.
                </p>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                Atajos de Artículos Comunes
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { desc: "Taza blanca personalizada 11oz", precio: "65.00" },
                  { desc: "Taza mágica negra 11oz", precio: "110.00" },
                  { desc: "Playera blanca sublimada", precio: "120.00" },
                  { desc: "Termo de aluminio 500ml", precio: "145.00" },
                  { desc: "Gorra trucker personalizada", precio: "75.00" },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSublimadoDesc(item.desc);
                      setSublimadoPrecioUnitario(item.precio);
                    }}
                    className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200 border border-stone-200 transition cursor-pointer"
                  >
                    {item.desc.split(" ")[0]} ({money.format(parseFloat(item.precio))})
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Description */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">
                Descripción del Artículo / Pedido
              </label>
              <input
                type="text"
                value={sublimadoDesc}
                onChange={(e) => setSublimadoDesc(e.target.value)}
                placeholder="Ej. Taza mágica negra con foto familiar..."
                className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs text-stone-900 outline-none focus:border-stone-600"
              />
            </div>

            {/* Unit Price & Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Precio Unitario ($)
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={sublimadoPrecioUnitario}
                  onChange={(e) => setSublimadoPrecioUnitario(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-sm font-bold text-stone-900 outline-none focus:border-stone-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={sublimadoCantidad}
                  onChange={(e) => setSublimadoCantidad(e.target.value)}
                  onBlur={() => {
                    if (!sublimadoCantidad || parseInt(sublimadoCantidad, 10) < 1) {
                      setSublimadoCantidad("1");
                    }
                  }}
                  className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-sm font-bold text-stone-900 outline-none focus:border-stone-600 text-center"
                />
              </div>
            </div>

            {/* Subtotal & Add Button */}
            <div className="flex items-center justify-between rounded-xl bg-stone-100/70 p-4 border border-stone-200">
              <div>
                <span className="text-xs text-stone-500">Subtotal del servicio:</span>
                <div className="text-xl font-black text-stone-900">
                  {money.format(
                    (parseFloat(sublimadoPrecioUnitario) || 0) *
                      Math.max(1, parseInt(sublimadoCantidad, 10) || 1)
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddSublimado}
                className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-xs font-bold text-white shadow-xs hover:bg-stone-800 active:scale-95 transition cursor-pointer"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Agregar al Carrito</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= 6. OTRO SERVICIO ================= */}
        {tabActiva === "otros" && (
          <div className="max-w-xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Otro Servicio / Cobro Extra
                </h3>
                <p className="text-xs text-stone-500">
                  Registra trámites, escaneos, asesorías o cualquier servicio adicional.
                </p>
              </div>
            </div>

            {/* Quick Templates for other services */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                Atajos Frecuentes
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { nom: "Escaneo de documentos", precio: "10.00" },
                  { nom: "Trámite / Consulta por internet", precio: "25.00" },
                  { nom: "Descarga e impresión de archivo", precio: "15.00" },
                  { nom: "Diseño gráfico / Edición rápida", precio: "50.00" },
                  { nom: "Recarga de tóner / cartucho", precio: "80.00" },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setOtroNombre(item.nom);
                      setOtroPrecioUnitario(item.precio);
                    }}
                    className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200 border border-stone-200 transition cursor-pointer"
                  >
                    {item.nom} ({money.format(parseFloat(item.precio))})
                  </button>
                ))}
              </div>
            </div>

            {/* Service Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">
                Nombre / Concepto del Servicio
              </label>
              <input
                type="text"
                value={otroNombre}
                onChange={(e) => setOtroNombre(e.target.value)}
                placeholder="Ej. Escaneo de 10 hojas, Trámite CURP/Acta, Formato digital..."
                className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs text-stone-900 outline-none focus:border-stone-600"
              />
            </div>

            {/* Unit Price & Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Precio / Monto ($)
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={otroPrecioUnitario}
                  onChange={(e) => setOtroPrecioUnitario(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-sm font-bold text-stone-900 outline-none focus:border-stone-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={otroCantidad}
                  onChange={(e) => setOtroCantidad(e.target.value)}
                  onBlur={() => {
                    if (!otroCantidad || parseInt(otroCantidad, 10) < 1) {
                      setOtroCantidad("1");
                    }
                  }}
                  className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-sm font-bold text-stone-900 outline-none focus:border-stone-600 text-center"
                />
              </div>
            </div>

            {/* Subtotal & Add Button */}
            <div className="flex items-center justify-between rounded-xl bg-stone-100/70 p-4 border border-stone-200">
              <div>
                <span className="text-xs text-stone-500">Subtotal del servicio:</span>
                <div className="text-xl font-black text-stone-900">
                  {money.format(
                    (parseFloat(otroPrecioUnitario) || 0) *
                      Math.max(1, parseInt(otroCantidad, 10) || 1)
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddOtroServicio}
                className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-xs font-bold text-white shadow-xs hover:bg-stone-800 active:scale-95 transition cursor-pointer"
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
