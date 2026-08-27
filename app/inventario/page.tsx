"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Producto, CategoriaProducto } from "@/types/database";
import {
  SearchIcon,
  XMarkIcon,
  BookOpenIcon,
  UtensilsIcon,
  TrashIcon,
} from "@/components/pos/Icons";
import { resolveProductCategory, saveLocalProductCategory } from "@/lib/categoryStorage";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function toProducto(row: {
  id: string;
  nombre: string;
  precio: number | string;
  stock: number | string;
  categoria?: string;
}): Producto {
  return {
    id: row.id,
    nombre: row.nombre,
    precio: Number(row.precio),
    stock: Number(row.stock),
    categoria: resolveProductCategory(row.categoria, row.id, row.nombre),
  };
}

type TabFiltroInventario = "todos" | "libreria" | "comida";

export default function InventarioPage() {
  const supabase = useMemo(() => createClient(), []);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Search and Category tab filter
  const [busqueda, setBusqueda] = useState("");
  const [tabFiltro, setTabFiltro] = useState<TabFiltroInventario>("todos");

  // New product form
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("0");
  const [categoria, setCategoria] = useState<CategoriaProducto>("libreria");

  // Edit product state
  const [productoEnEdicion, setProductoEnEdicion] = useState<Producto | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editPrecio, setEditPrecio] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editCategoria, setEditCategoria] = useState<CategoriaProducto>("libreria");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  // Delete product state
  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function cargarProductos() {
    setError(null);
    const { data, error: queryError } = await supabase
      .from("productos")
      .select("id, nombre, precio, stock, categoria")
      .order("nombre", { ascending: true });

    if (queryError) {
      // Fallback if categoria column not present yet
      if (queryError.message.includes("categoria")) {
        const { data: dataFallback, error: fallbackError } = await supabase
          .from("productos")
          .select("id, nombre, precio, stock")
          .order("nombre", { ascending: true });
        if (fallbackError) {
          setError(fallbackError.message);
          setProductos([]);
          return;
        }
        setProductos((dataFallback ?? []).map(toProducto));
        return;
      }
      setError(queryError.message);
      setProductos([]);
      return;
    }

    setProductos((data ?? []).map(toProducto));
  }

  useEffect(() => {
    let activo = true;

    async function iniciar() {
      setCargando(true);
      await cargarProductos();
      if (activo) setCargando(false);
    }

    void iniciar();
    return () => {
      activo = false;
    };
  }, [supabase]);

  async function crearProducto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAviso(null);
    setError(null);

    const nombreLimpio = nombre.trim();
    const precioNumero = Number(precio);
    const stockNumero = Number(stock);

    if (!nombreLimpio) {
      setError("Escribe el nombre del producto.");
      return;
    }
    if (!Number.isFinite(precioNumero) || precioNumero < 0) {
      setError("El precio debe ser un número mayor o igual a 0.");
      return;
    }
    if (!Number.isInteger(stockNumero) || stockNumero < 0) {
      setError("El stock debe ser un entero mayor o igual a 0.");
      return;
    }

    setGuardando(true);

    let insertRes = await supabase
      .from("productos")
      .insert({
        nombre: nombreLimpio,
        precio: precioNumero,
        stock: stockNumero,
        categoria: categoria,
      })
      .select("id, nombre, precio, stock, categoria")
      .single();

    if (insertRes.error && insertRes.error.message.includes("categoria")) {
      insertRes = await supabase
        .from("productos")
        .insert({
          nombre: nombreLimpio,
          precio: precioNumero,
          stock: stockNumero,
        })
        .select("id, nombre, precio, stock")
        .single();
    }

    setGuardando(false);

    if (insertRes.error || !insertRes.data) {
      setError(insertRes.error?.message ?? "No se pudo guardar el producto.");
      return;
    }

    saveLocalProductCategory(insertRes.data.id, categoria);
    saveLocalProductCategory(nombreLimpio, categoria);

    const nuevo = toProducto(insertRes.data);
    setProductos((actuales) =>
      [...actuales, nuevo].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
      )
    );
    setNombre("");
    setPrecio("");
    setStock("0");
    setAviso(`Se agregó “${nuevo.nombre}” (${nuevo.categoria === "comida" ? "Comida & Snacks" : "Librería"}).`);
  }

  // Open edit modal for a product
  function abrirEdicion(prod: Producto) {
    setProductoEnEdicion(prod);
    setEditNombre(prod.nombre);
    setEditPrecio(prod.precio.toString());
    setEditStock(prod.stock.toString());
    setEditCategoria((prod.categoria as CategoriaProducto) || "libreria");
    setErrorEdicion(null);
  }

  // Save product changes
  async function guardarEdicion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!productoEnEdicion) return;

    const nombreLimpio = editNombre.trim();
    const precioNumero = Number(editPrecio);
    const stockNumero = Number(editStock);

    if (!nombreLimpio) {
      setErrorEdicion("El nombre no puede estar vacío.");
      return;
    }
    if (!Number.isFinite(precioNumero) || precioNumero < 0) {
      setErrorEdicion("El precio debe ser un número mayor o igual a 0.");
      return;
    }
    if (!Number.isInteger(stockNumero) || stockNumero < 0) {
      setErrorEdicion("El stock debe ser un entero mayor o igual a 0.");
      return;
    }

    setGuardandoEdicion(true);
    setErrorEdicion(null);

    let updateRes = await supabase
      .from("productos")
      .update({
        nombre: nombreLimpio,
        precio: precioNumero,
        stock: stockNumero,
        categoria: editCategoria,
      })
      .eq("id", productoEnEdicion.id);

    if (updateRes.error && updateRes.error.message.includes("categoria")) {
      updateRes = await supabase
        .from("productos")
        .update({
          nombre: nombreLimpio,
          precio: precioNumero,
          stock: stockNumero,
        })
        .eq("id", productoEnEdicion.id);
    }

    setGuardandoEdicion(false);

    if (updateRes.error) {
      setErrorEdicion(updateRes.error.message);
      return;
    }

    saveLocalProductCategory(productoEnEdicion.id, editCategoria);
    saveLocalProductCategory(nombreLimpio, editCategoria);

    setProductos((actuales) =>
      actuales
        .map((p) =>
          p.id === productoEnEdicion.id
            ? {
                ...p,
                nombre: nombreLimpio,
                precio: precioNumero,
                stock: stockNumero,
                categoria: editCategoria,
              }
            : p
        )
        .sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
        )
    );

    setAviso(`Se actualizó el producto “${nombreLimpio}”.`);
    setProductoEnEdicion(null);
  }

  // Delete product permanently
  async function ejecutarEliminacion() {
    if (!productoAEliminar) return;

    setEliminando(true);
    setErrorEliminar(null);

    const { error: delError } = await supabase
      .from("productos")
      .delete()
      .eq("id", productoAEliminar.id);

    setEliminando(false);

    if (delError) {
      // Check foreign key constraint in sales details
      if (
        delError.message.includes("violates foreign key constraint") ||
        delError.code === "23503"
      ) {
        setErrorEliminar(
          `No se puede eliminar "${productoAEliminar.nombre}" porque ya tiene ventas registradas en el historial. Puedes editarlo para poner su stock en 0 o cambiar su nombre.`
        );
        return;
      }
      setErrorEliminar(delError.message);
      return;
    }

    const eliminadoId = productoAEliminar.id;
    const eliminadoNombre = productoAEliminar.nombre;

    setProductos((actuales) => actuales.filter((p) => p.id !== eliminadoId));
    setAviso(`Se eliminó permanentemente “${eliminadoNombre}”.`);
    setProductoAEliminar(null);

    if (productoEnEdicion?.id === eliminadoId) {
      setProductoEnEdicion(null);
    }
  }

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      const matchSearch = !q || p.nombre.toLowerCase().includes(q);
      if (!matchSearch) return false;

      if (tabFiltro === "libreria") return p.categoria !== "comida";
      if (tabFiltro === "comida") return p.categoria === "comida";

      return true;
    });
  }, [productos, busqueda, tabFiltro]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">
            <Link href="/" className="hover:text-stone-800">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            Inventario
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">
            Inventario y Catálogo
          </h1>
          <p className="mt-1 text-stone-600">
            {cargando
              ? "Cargando productos…"
              : `${productos.length} producto${productos.length === 1 ? "" : "s"} registrado(s)`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/pos"
            className="rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-stone-800 transition"
          >
            Ir a Caja (POS)
          </Link>
          <Link
            href="/servicios"
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
          >
            Tarifas de Servicios
          </Link>
          <Link
            href="/ventas"
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
          >
            Historial de Ventas
          </Link>
          <Link
            href="/inventario/historial"
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
          >
            Auditoría de Stock
          </Link>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {aviso && (
        <div className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200 flex justify-between items-center">
          <span>{aviso}</span>
          <button
            type="button"
            onClick={() => setAviso(null)}
            className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* New Product Form */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Nuevo producto</h2>
            <p className="mt-0.5 text-xs text-stone-500">
              Registra artículos físicos de librería o comida con su stock correspondiente.
            </p>
          </div>

          {/* Quick Category Toggle */}
          <div className="flex items-center rounded-xl bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setCategoria("libreria")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                categoria === "libreria"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <BookOpenIcon className="h-3.5 w-3.5" />
              <span>Librería</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoria("comida")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                categoria === "comida"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <UtensilsIcon className="h-3.5 w-3.5" />
              <span>Comida & Snacks</span>
            </button>
          </div>
        </div>

        <form
          onSubmit={crearProducto}
          className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem_auto]"
        >
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-stone-700">Nombre del artículo</span>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={
                categoria === "comida"
                  ? "Ej. Refresco 600ml, Agua 500ml, Papas..."
                  : "Ej. Cuaderno rayado 100h, Lapicero azul..."
              }
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-stone-700">Precio ($)</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-stone-700">
              Stock inicial
            </span>
            <input
              required
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-60 transition sm:w-auto cursor-pointer"
            >
              {guardando ? "Guardando…" : "Agregar"}
            </button>
          </div>
        </form>
      </section>

      {/* Inventory Table with Category Filters */}
      <section className="mt-8 rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-stone-900">Listado de artículos</h2>

            {/* Category Tab Filter */}
            <div className="flex items-center rounded-xl bg-stone-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTabFiltro("todos")}
                className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  tabFiltro === "todos"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Todos ({productos.length})
              </button>
              <button
                type="button"
                onClick={() => setTabFiltro("libreria")}
                className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  tabFiltro === "libreria"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Librería ({productos.filter((p) => p.categoria !== "comida").length})
              </button>
              <button
                type="button"
                onClick={() => setTabFiltro("comida")}
                className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  tabFiltro === "comida"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Comida & Snacks ({productos.filter((p) => p.categoria === "comida").length})
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative min-w-[240px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
              <SearchIcon className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en inventario..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-1.5 pl-9 pr-8 text-xs text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-stone-400 hover:text-stone-600"
                aria-label="Limpiar búsqueda"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {cargando ? (
          <p className="p-8 text-center text-sm text-stone-500">Cargando catálogo…</p>
        ) : productosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-stone-500">
            <p className="text-sm font-medium">No se encontraron productos.</p>
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="mt-2 text-xs font-semibold text-stone-900 underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500 border-b border-stone-200">
                <tr>
                  <th className="px-5 py-3 font-semibold">Producto</th>
                  <th className="px-5 py-3 font-semibold">Categoría</th>
                  <th className="px-5 py-3 font-semibold">Precio</th>
                  <th className="px-5 py-3 font-semibold">Stock</th>
                  <th className="px-5 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {productosFiltrados.map((p) => {
                  const esComida = p.categoria === "comida";

                  return (
                    <tr key={p.id} className="hover:bg-stone-50/70 transition">
                      <td className="px-5 py-3 font-medium text-stone-900">{p.nombre}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                          esComida
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-stone-100 text-stone-700 border border-stone-200"
                        }`}>
                          {esComida ? "🍿 Comida / Snack" : "📚 Librería"}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-stone-900">{money.format(p.precio)}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            p.stock === 0
                              ? "bg-red-100 text-red-800"
                              : p.stock <= 5
                              ? "bg-amber-100 text-amber-800"
                              : "bg-stone-100 text-stone-800"
                          }`}
                        >
                          {p.stock} unidad{p.stock === 1 ? "" : "es"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirEdicion(p)}
                            className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-200 transition cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setErrorEliminar(null);
                              setProductoAEliminar(p);
                            }}
                            className="rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/60 p-1 transition cursor-pointer"
                            title={`Eliminar "${p.nombre}"`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Edit Product Modal */}
      {productoEnEdicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !guardandoEdicion && setProductoEnEdicion(null)}
          />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                Editar Producto
              </h3>
              <button
                type="button"
                disabled={guardandoEdicion}
                onClick={() => setProductoEnEdicion(null)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {errorEdicion && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {errorEdicion}
              </div>
            )}

            <form onSubmit={guardarEdicion} className="mt-4 space-y-4">
              {/* Category Select */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Categoría
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCategoria("libreria")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl p-2 text-xs font-bold border transition cursor-pointer ${
                      editCategoria === "libreria"
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <BookOpenIcon className="h-3.5 w-3.5" />
                    <span>Librería</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCategoria("comida")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl p-2 text-xs font-bold border transition cursor-pointer ${
                      editCategoria === "comida"
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <UtensilsIcon className="h-3.5 w-3.5" />
                    <span>Comida & Snacks</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Precio ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={editPrecio}
                    onChange={(e) => setEditPrecio(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 outline-none focus:border-stone-600"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={guardandoEdicion}
                  onClick={() => setProductoEnEdicion(null)}
                  className="flex-1 rounded-xl border border-stone-300 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdicion}
                  className="flex-1 rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition cursor-pointer"
                >
                  {guardandoEdicion ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>

              {/* Delete button inside edit modal */}
              <div className="pt-2 border-t border-stone-100 flex justify-center">
                <button
                  type="button"
                  disabled={guardandoEdicion}
                  onClick={() => {
                    setErrorEliminar(null);
                    setProductoAEliminar(productoEnEdicion);
                  }}
                  className="flex items-center gap-1 text-xs text-red-600 font-semibold hover:text-red-800 hover:underline cursor-pointer"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  <span>Eliminar este producto definitivamente</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !eliminando && setProductoAEliminar(null)}
          />

          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-center gap-3 text-red-700 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <TrashIcon className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Eliminar Producto
                </h3>
                <p className="text-xs text-stone-500">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-700 leading-relaxed mb-4">
              ¿Estás seguro de que deseas eliminar{" "}
              <strong className="text-stone-900 font-bold">“{productoAEliminar.nombre}”</strong>?
            </p>

            {errorEliminar && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {errorEliminar}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={eliminando}
                onClick={() => setProductoAEliminar(null)}
                className="flex-1 rounded-xl border border-stone-300 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={eliminando}
                onClick={ejecutarEliminacion}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
              >
                {eliminando ? "Eliminando..." : "Sí, Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
