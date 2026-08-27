import Link from "next/link";
import {
  ShoppingCartIcon,
  BookOpenIcon,
  BanknotesIcon,
  RefreshCwIcon,
} from "@/components/pos/Icons";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
          Sistema POS & Inventario
        </span>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-stone-900 sm:text-4xl">
          Libreria San Rafael
        </h1>
        <p className="mt-2 text-sm text-stone-600 max-w-md mx-auto">
          Punto de venta, control de inventario y auditoría para útiles, papelería y libros.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Caja / POS */}
        <Link
          href="/pos"
          className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-900 text-white mb-4 transition group-hover:scale-105">
              <ShoppingCartIcon className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">Punto de Venta (Caja)</h2>
            <p className="mt-1 text-xs text-stone-500">
              Búsqueda rápida de productos, carrito de ventas, cobro en efectivo con cálculo de cambio e impresión de tickets.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-semibold text-stone-900">
            <span>Abrir caja</span>
            <span className="ml-1 transition group-hover:translate-x-1">&rarr;</span>
          </div>
        </Link>

        {/* Inventario */}
        <Link
          href="/inventario"
          className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-800 mb-4 transition group-hover:scale-105">
              <BookOpenIcon className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">Catálogo e Inventario</h2>
            <p className="mt-1 text-xs text-stone-500">
              Gestión de artículos, precios, alta de nuevos productos y control de existencias en tiempo real.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-semibold text-stone-900">
            <span>Ver inventario</span>
            <span className="ml-1 transition group-hover:translate-x-1">&rarr;</span>
          </div>
        </Link>

        {/* Historial de Ventas */}
        <Link
          href="/ventas"
          className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-800 mb-4 transition group-hover:scale-105">
              <BanknotesIcon className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">Historial de Ventas</h2>
            <p className="mt-1 text-xs text-stone-500">
              Consulta de tickets emitidos, ingresos del día, métricas por período y reimpresión de comprobantes.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-semibold text-stone-900">
            <span>Consultar ventas</span>
            <span className="ml-1 transition group-hover:translate-x-1">&rarr;</span>
          </div>
        </Link>

        {/* Auditoría de Stock */}
        <Link
          href="/inventario/historial"
          className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-800 mb-4 transition group-hover:scale-105">
              <RefreshCwIcon className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">Auditoría de Stock</h2>
            <p className="mt-1 text-xs text-stone-500">
              Registro continuo de entradas, salidas por venta, creaciones y ajustes de inventario.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-semibold text-stone-900">
            <span>Ver movimientos</span>
            <span className="ml-1 transition group-hover:translate-x-1">&rarr;</span>
          </div>
        </Link>
      </div>
    </main>
  );
}
