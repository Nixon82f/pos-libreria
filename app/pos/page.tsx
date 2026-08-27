"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  CartItem,
  CartItemProducto,
  CartItemServicio,
  MetodoPago,
  Producto,
  CategoriaProducto,
  Servicio,
  Venta,
} from "@/types/database";
import { DEFAULT_SERVICIOS } from "@/types/database";
import { ProductList } from "@/components/pos/ProductList";
import { Cart } from "@/components/pos/Cart";
import { CheckoutModal } from "@/components/pos/CheckoutModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { QuickInventoryModal } from "@/components/pos/QuickInventoryModal";
import { RefreshCwIcon, LayersIcon, PackagePlusIcon } from "@/components/pos/Icons";
import { resolveProductCategory } from "@/lib/categoryStorage";

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

export default function PosPage() {
  const supabase = useMemo(() => createClient(), []);

  // Products and inventory state (servicios pre-initialized for instant 0ms render)
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>(DEFAULT_SERVICIOS);
  const [cargando, setCargando] = useState(true);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  // Quick Inventory Modal state
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [selectedProductForInventory, setSelectedProductForInventory] = useState<Producto | null>(null);

  const handleOpenQuickInventory = useCallback((producto?: Producto) => {
    setSelectedProductForInventory(producto || null);
    setIsInventoryModalOpen(true);
  }, []);

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

  // Keyboard shortcut listener (Alt+I or F2 to open Quick Inventory)
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      // F2 or Alt+I
      if (e.key === "F2" || (e.altKey && e.key.toLowerCase() === "i")) {
        e.preventDefault();
        handleOpenQuickInventory();
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleOpenQuickInventory]);

  // Fetch products and services concurrently from Supabase
  const cargarCatalogo = useCallback(async () => {
    setErrorGeneral(null);

    try {
      const [resProd, resServ] = await Promise.all([
        supabase
          .from("productos")
          .select("id, nombre, precio, stock, categoria")
          .order("nombre", { ascending: true }),
        supabase
          .from("servicios")
          .select("*")
          .eq("activo", true)
          .order("categoria", { ascending: true }),
      ]);

      let prodRows: Array<{ id: string; nombre: string; precio: number | string; stock: number | string; categoria?: string }> = [];

      if (resProd.error && resProd.error.message.includes("categoria")) {
        const { data: dataFallback, error: errFallback } = await supabase
          .from("productos")
          .select("id, nombre, precio, stock")
          .order("nombre", { ascending: true });

        if (errFallback) {
          setErrorGeneral(errFallback.message);
        } else if (dataFallback) {
          prodRows = dataFallback;
        }
      } else if (resProd.error) {
        setErrorGeneral(resProd.error.message);
      } else if (resProd.data) {
        prodRows = resProd.data;
      }

      if (prodRows.length > 0) {
        const listaProd = prodRows.map(toProducto);
        setProductos(listaProd);

        // Synchronize current cart quantities with fresh stock for products
        setCartItems((prevItems) => {
          return prevItems
            .map((item) => {
              if (item.tipo === "servicio") {
                return item;
              }
              const prodActualizado = listaProd.find(
                (p) => p.id === item.producto.id
              );
              if (!prodActualizado || prodActualizado.stock === 0) {
                return null;
              }
              return {
                ...item,
                producto: prodActualizado,
                cantidad: Math.min(item.cantidad, prodActualizado.stock),
              };
            })
            .filter((item): item is CartItem => item !== null);
        });
      }

      if (!resServ.error && resServ.data && resServ.data.length > 0) {
        setServicios(
          resServ.data.map((s) => ({
            id: s.id,
            codigo: s.codigo,
            categoria: s.categoria,
            nombre: s.nombre,
            descripcion: s.descripcion,
            tipo_precio: s.tipo_precio,
            precio_actual: Number(s.precio_actual),
            version_precio: Number(s.version_precio),
            activo: Boolean(s.activo),
            created_at: s.created_at,
            updated_at: s.updated_at,
          }))
        );
      }
    } catch (err: unknown) {
      console.error("Error al cargar catálogo:", err);
    } finally {
      setCargando(false);
    }
  }, [supabase]);

  useEffect(() => {
    let activo = true;

    async function iniciar() {
      setCargando(true);
      await cargarCatalogo();
      if (activo) setCargando(false);
    }

    void iniciar();
    return () => {
      activo = false;
    };
  }, [cargarCatalogo]);

  // Cart operations
  const handleAddToCart = useCallback((producto: Producto) => {
    if (producto.stock <= 0) return;

    setCartItems((prev) => {
      const index = prev.findIndex(
        (item) => item.tipo === "producto" && item.producto.id === producto.id
      );

      if (index === -1) {
        const newItem: CartItemProducto = {
          tipo: "producto",
          id: `prod-${producto.id}`,
          producto,
          cantidad: 1,
        };
        return [...prev, newItem];
      }

      const itemExistente = prev[index] as CartItemProducto;
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

  const handleAddServiceToCart = useCallback(
    (itemData: Omit<CartItemServicio, "id">) => {
      const newItem: CartItemServicio = {
        ...itemData,
        id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      };
      setCartItems((prev) => [...prev, newItem]);
    },
    []
  );

  const handleUpdateQuantity = useCallback((itemId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.id !== itemId) return item;
          const nuevaCantidad = item.cantidad + delta;
          if (nuevaCantidad <= 0) return null;
          if (item.tipo === "producto" && nuevaCantidad > item.producto.stock) {
            return { ...item, cantidad: item.producto.stock };
          }
          return { ...item, cantidad: nuevaCantidad };
        })
        .filter((item): item is CartItem => item !== null);
    });
  }, []);

  const handleSetQuantity = useCallback((itemId: string, cantidad: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.id !== itemId) return item;
          if (cantidad <= 0) return null;
          if (item.tipo === "producto") {
            const cantidadAjustada = Math.min(cantidad, item.producto.stock);
            return { ...item, cantidad: cantidadAjustada };
          }
          return { ...item, cantidad };
        })
        .filter((item): item is CartItem => item !== null);
    });
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const handleClearCart = useCallback(() => {
    if (cartItems.length === 0) return;
    if (window.confirm("¿Seguro que deseas vaciar el carrito?")) {
      setCartItems([]);
    }
  }, [cartItems.length]);

  const totalPagar = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      if (item.tipo === "servicio") {
        return acc + item.precio_unitario * item.cantidad;
      }
      return acc + item.producto.precio * item.cantidad;
    }, 0);
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
      const itemsPayload = cartItems.map((item) => {
        if (item.tipo === "servicio") {
          return {
            tipo: "servicio",
            servicio_id: item.servicio.id.startsWith("mock-") ? undefined : item.servicio.id,
            codigo_servicio: item.servicio.codigo,
            nombre: item.nombre,
            descripcion_personalizada: item.descripcion_personalizada,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
          };
        }
        return {
          tipo: "producto",
          producto_id: item.producto.id,
          cantidad: item.cantidad,
        };
      });

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

      // Refresh stock and services from Supabase
      await cargarCatalogo();
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
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              <span>En línea</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => cargarCatalogo()}
            disabled={cargando}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 shadow-2xs hover:bg-stone-50 active:scale-95 transition disabled:opacity-50 cursor-pointer"
            title="Recargar catálogo y tarifas"
          >
            <RefreshCwIcon
              className={`h-3.5 w-3.5 ${cargando ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* Quick Add Inventory directly from POS */}
          <button
            type="button"
            onClick={() => setIsInventoryModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-stone-800 active:scale-95 transition cursor-pointer"
          >
            <PackagePlusIcon className="h-3.5 w-3.5" />
            <span>Agregar inventario</span>
          </button>

          <Link
            href="/servicios"
            className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
          >
            <LayersIcon className="h-3.5 w-3.5 text-stone-600" />
            <span>Tarifas de Servicios</span>
          </Link>

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

      {/* Two column layout: Catalog & Services on left, Cart on right */}
      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Product Search & Services Selector */}
        <div className="lg:col-span-7 xl:col-span-8 h-[calc(100vh-12rem)] min-h-[500px]">
          <ProductList
            productos={productos}
            servicios={servicios}
            cargando={cargando}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
            onAddServiceToCart={handleAddServiceToCart}
            onOpenQuickInventory={handleOpenQuickInventory}
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

      {/* Quick Inventory Modal */}
      <QuickInventoryModal
        isOpen={isInventoryModalOpen}
        onClose={() => {
          setIsInventoryModalOpen(false);
          setSelectedProductForInventory(null);
        }}
        productos={productos}
        initialProduct={selectedProductForInventory}
        onProductCreatedOrUpdated={cargarCatalogo}
      />

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

