"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CartItem, MetodoPago, Producto, Venta } from "@/types/database";
import { ProductList } from "@/components/pos/ProductList";
import { Cart } from "@/components/pos/Cart";
import { CheckoutModal } from "@/components/pos/CheckoutModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { RefreshCwIcon } from "@/components/pos/Icons";

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

export default function PosPage() {
  const supabase = useMemo(() => createClient(), []);

  // Products and inventory state
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Checkout and sale state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Receipt modal state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Venta | null>(null);
  const [lastMetodoPago, setLastMetodoPago] = useState<MetodoPago>("efectivo");
  const [lastMontoRecibido, setLastMontoRecibido] = useState<number>(0);

  // Fetch products from Supabase
  const cargarProductos = useCallback(async () => {
    setErrorGeneral(null);
    const { data, error } = await supabase
      .from("productos")
      .select("id, nombre, precio, stock")
      .order("nombre", { ascending: true });

    if (error) {
      setErrorGeneral(error.message);
      return;
    }

    const lista = (data ?? []).map(toProducto);
    setProductos(lista);

    // Synchronize current cart quantities with fresh stock
    setCartItems((prevItems) => {
      return prevItems
        .map((item) => {
          const freshProd = lista.find((p) => p.id === item.producto.id);
          if (!freshProd || freshProd.stock <= 0) return null;
          return {
            producto: freshProd,
            cantidad: Math.min(item.cantidad, freshProd.stock),
          };
        })
        .filter((item): item is CartItem => item !== null);
    });
  }, [supabase]);

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
  }, [cargarProductos]);

  // Cart operations
  const handleAddToCart = useCallback((producto: Producto) => {
    if (producto.stock <= 0) return;

    setCartItems((prev) => {
      const index = prev.findIndex((item) => item.producto.id === producto.id);
      if (index === -1) {
        return [...prev, { producto, cantidad: 1 }];
      }

      const itemExistente = prev[index];
      if (itemExistente.cantidad >= producto.stock) {
        return prev; // Reached maximum available stock
      }

      const copia = [...prev];
      copia[index] = {
        ...itemExistente,
        cantidad: itemExistente.cantidad + 1,
      };
      return copia;
    });
  }, []);

  const handleUpdateQuantity = useCallback(
    (productoId: string, delta: number) => {
      setCartItems((prev) => {
        return prev
          .map((item) => {
            if (item.producto.id !== productoId) return item;
            const nuevaCantidad = item.cantidad + delta;
            if (nuevaCantidad <= 0) return null;
            if (nuevaCantidad > item.producto.stock) {
              return { ...item, cantidad: item.producto.stock };
            }
            return { ...item, cantidad: nuevaCantidad };
          })
          .filter((item): item is CartItem => item !== null);
      });
    },
    []
  );

  const handleSetQuantity = useCallback(
    (productoId: string, cantidad: number) => {
      setCartItems((prev) => {
        return prev
          .map((item) => {
            if (item.producto.id !== productoId) return item;
            if (cantidad <= 0) return null;
            const cantidadAjustada = Math.min(cantidad, item.producto.stock);
            return { ...item, cantidad: cantidadAjustada };
          })
          .filter((item): item is CartItem => item !== null);
      });
    },
    []
  );

  const handleRemoveItem = useCallback((productoId: string) => {
    setCartItems((prev) =>
      prev.filter((item) => item.producto.id !== productoId)
    );
  }, []);

  const handleClearCart = useCallback(() => {
    if (cartItems.length === 0) return;
    if (window.confirm("¿Seguro que deseas vaciar el carrito?")) {
      setCartItems([]);
    }
  }, [cartItems.length]);

  const totalPagar = useMemo(() => {
    return cartItems.reduce(
      (acc, item) => acc + item.producto.precio * item.cantidad,
      0
    );
  }, [cartItems]);

  // Sale execution
  const handleConfirmSale = async (
    metodo: MetodoPago,
    montoRecibido?: number
  ) => {
    if (cartItems.length === 0) return;

    setIsProcessingSale(true);
    setCheckoutError(null);

    try {
      const itemsPayload = cartItems.map((item) => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad,
      }));

      // Call API /api/ventas route which triggers registrar_venta RPC
      const response = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsPayload }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo registrar la venta.");
      }

      // Success
      setLastSale(data as Venta);
      setLastMetodoPago(metodo);
      setLastMontoRecibido(montoRecibido ?? totalPagar);

      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
      setCartItems([]);

      // Refresh stock from Supabase
      await cargarProductos();
    } catch (err: unknown) {
      const mensaje =
        err instanceof Error ? err.message : "Error inesperado al cobrar.";
      setCheckoutError(mensaje);
    } finally {
      setIsProcessingSale(false);
    }
  };

  const handleNewSale = () => {
    setIsReceiptOpen(false);
    setLastSale(null);
    setCheckoutError(null);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col p-4 sm:p-6 lg:p-8">
      {/* Top Navbar */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <nav className="flex items-center gap-2 text-xs font-medium text-stone-500">
            <Link href="/" className="hover:text-stone-900 transition">
              Inicio
            </Link>
            <span>/</span>
            <span className="text-stone-900">Caja (POS)</span>
          </nav>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              Punto de Venta
            </h1>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              En línea
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => cargarProductos()}
            disabled={cargando}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 active:scale-95 transition disabled:opacity-50"
            title="Recargar catálogo"
          >
            <RefreshCwIcon
              className={`h-3.5 w-3.5 ${cargando ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Actualizar stock</span>
          </button>

          <Link
            href="/ventas"
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
          >
            Historial de Ventas
          </Link>

          <Link
            href="/inventario"
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
          >
            Inventario &rarr;
          </Link>
        </div>
      </header>

      {errorGeneral && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error de conexión:</strong> {errorGeneral}
        </div>
      )}

      {/* Two column layout: Catalog on left, Cart on right */}
      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Product Search & Catalog */}
        <div className="lg:col-span-7 xl:col-span-8 h-[calc(100vh-12rem)] min-h-[500px]">
          <ProductList
            productos={productos}
            cargando={cargando}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* Right: Cart & Checkout */}
        <div className="lg:col-span-5 xl:col-span-4 h-[calc(100vh-12rem)] min-h-[500px]">
          <Cart
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onSetQuantity={handleSetQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onOpenCheckout={() => {
              setCheckoutError(null);
              setIsCheckoutOpen(true);
            }}
            isProcessing={isProcessingSale}
          />
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        total={totalPagar}
        onConfirmSale={handleConfirmSale}
        isProcessing={isProcessingSale}
        error={checkoutError}
      />

      {/* Receipt / Success Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        venta={lastSale}
        metodoPago={lastMetodoPago}
        montoRecibido={lastMontoRecibido}
        onNewSale={handleNewSale}
      />
    </main>
  );
}
