"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Producto } from "@/types/database";
import { SearchIcon, XMarkIcon } from "@/components/pos/Icons";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function toProducto(row: {
  id: string;
  nombre: string;
  precio: number | string;
  stock: number | string;
}): Producto {
  return {
    id: row.id,
    nombre: row.nombre,
    precio: Number(row.precio),
    stock: Number(row.stock),
  };
}

export default function InventarioPage() {
  const supabase = useMemo(() => createClient(), []);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Search in inventory
  const [busqueda, setBusqueda] = useState("");

  // New product form
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("0");

  // Edit product state
  const [productoEnEdicion, setProductoEnEdicion] = useState<Producto | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editPrecio, setEditPrecio] = useState("");
  const [editStock, setEditStock] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  async function cargarProductos() {
    setError(null);
    const { data, error: queryError } = await supabase
      .from("productos")
      .select("id, nombre, precio, stock")
      .order("nombre", { ascending: true });

    if (queryError) {
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
    const { data, error: insertError } = await supabase
      .from("productos")
      .insert({
        nombre: nombreLimpio,
        precio: precioNumero,
        stock: stockNumero,
      })
      .select("id, nombre, precio, stock")
      .single();

    setGuardando(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "No se pudo guardar el producto.");
      return;
    }

    const nuevo = toProducto(data);
    setProductos((actuales) =>
      [...actuales, nuevo].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
      )
    );
    setNombre("");
    setPrecio("");
    setStock("0");
    setAviso(`Se agregó “${nuevo.nombre}”.`);
  }

  // Open edit modal for a product
  function abrirEdicion(prod: Producto) {
    setProductoEnEdicion(prod);
    setEditNombre(prod.nombre);
    setEditPrecio(prod.precio.toString());
    setEditStock(prod.stock.toString());
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

    const { error: updateError } = await supabase
      .from("productos")
      .update({
        nombre: nombreLimpio,
        precio: precioNumero,
        stock: stockNumero,
      })
      .eq("id", productoEnEdicion.id);

    setGuardandoEdicion(false);

    if (updateError) {
      setErrorEdicion(updateError.message);
      return;
    }

    // Update local state
    setProductos((prev) =>
      prev
        .map((p) =>
          p.id === productoEnEdicion.id
            ? {
                ...p,
                nombre: nombreLimpio,
                precio: precioNumero,
                stock: stockNumero,
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

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productos, busqueda]);

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
            className="text-xs text-emerald-700 font-semibold hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* New Product Form */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Nuevo producto</h2>
        <p className="mt-1 text-xs text-stone-500">
          Nombre, precio y stock inicial. Se guarda en el sistema al instante.
        </p>

        <form
          onSubmit={crearProducto}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_8rem_8rem_auto]"
        >
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-stone-700">Nombre del artículo</span>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Cuaderno rayado, Lapicero azul..."
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
              className="w-full rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-60 transition sm:w-auto"
            >
              {guardando ? "Guardando…" : "Agregar"}
            </button>
          </div>
        </form>
      </section>

      {/* Inventory Table with Edit action */}
      <section className="mt-8 rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Listado de artículos</h2>

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
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {cargando ? (
          <p className="p-6 text-stone-500 text-center">Cargando catálogo...</p>
        ) : productosFiltrados.length === 0 ? (
          <p className="p-6 text-stone-500 text-center">
            {busqueda ? `No hay productos que coincidan con "${busqueda}".` : "No hay productos registrados todavía."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs font-semibold">
                  <th className="p-3.5 pl-5">Nombre</th>
                  <th className="p-3.5">Precio</th>
                  <th className="p-3.5">Stock Actual</th>
                  <th className="p-3.5 pr-5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {productosFiltrados.map((prod) => (
                  <tr key={prod.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="p-3.5 pl-5 text-stone-900 font-semibold">{prod.nombre}</td>
                    <td className="p-3.5 text-stone-700 font-medium">{money.format(prod.precio)}</td>
                    <td className="p-3.5 text-stone-600">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                          prod.stock === 0
                            ? "bg-red-100 text-red-700"
                            : prod.stock <= 5
                            ? "bg-amber-100 text-amber-800"
                            : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {prod.stock} un.
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <button
                        type="button"
                        onClick={() => abrirEdicion(prod)}
                        className="rounded-lg border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-100 hover:text-stone-900 transition"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-stone-100 bg-stone-50/60 px-5 py-2.5 text-xs text-stone-500">
          Mostrando {productosFiltrados.length} de {productos.length} artículos
        </div>
      </section>

      {/* Edit Product Modal */}
      {productoEnEdicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !guardandoEdicion && setProductoEnEdicion(null)}
          />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900">Editar Producto</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Modifica los datos del artículo en el catálogo.
                </p>
              </div>
              <button
                type="button"
                disabled={guardandoEdicion}
                onClick={() => setProductoEnEdicion(null)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {errorEdicion && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {errorEdicion}
              </div>
            )}

            <form onSubmit={guardarEdicion} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nombre del artículo
                </label>
                <input
                  required
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-sm text-stone-900 outline-none focus:border-stone-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Precio ($)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPrecio}
                    onChange={(e) => setEditPrecio(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 p-2.5 text-sm text-stone-900 outline-none focus:border-stone-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Stock Disponible
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 p-2.5 text-sm text-stone-900 outline-none focus:border-stone-600"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-stone-100">
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
                  className="flex-1 rounded-xl bg-stone-900 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 transition disabled:opacity-50"
                >
                  {guardandoEdicion ? "Guardando…" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
