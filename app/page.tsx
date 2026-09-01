import Link from "next/link";
import {
  ShoppingCartIcon,
  BookOpenIcon,
  BanknotesIcon,
  RefreshCwIcon,
  LayersIcon,
  CalculatorIcon,
} from "@/components/pos/Icons";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <span className="rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700">
          Sistema POS & Inventario
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
          Librería San Rafael
        </h1>
        <p className="mt-2 text-sm text-stone-600 max-w-xl mx-auto">
          Control de ventas en mostrador, inventario físico en tiempo real, servicios independientes de copistería y arqueo de caja.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Caja / POS */}
        <Link
          href="/pos"
          className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md sm:col-span-2 lg:col-span-1"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-900 text-white mb-4 transition group-hover:scale-105">
              <ShoppingCartIcon className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">Punto de Venta (Caja)</h2>
            <p className="mt-1 text-xs text-stone-500">
              Librería, comidas, variedades, copistería y recargas telefónicas Tigo & Claro con comisiones variables.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-semibold text-stone-900">
            <span>Abrir caja</span>
            <span className="ml-1 transition group-hover:translate-x-1">&rarr;</span>
          </div>
        </Link>

        {/* Cierre de Caja y Arqueo */}
        <Link
          href="/cierre"
          className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-800 mb-4 transition group-hover:scale-105">
              <CalculatorIcon className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">Cierre de Caja y Arqueo</h2>
            <p className="mt-1 text-xs text-stone-500">
              Arqueo de efectivo en gaveta, conciliación de turno, desglose de productos vs servicios y cortes diarios.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-semibold text-stone-900">
            <span>Corte de caja</span>
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
              Gestión de artículos físicos (librería y comida), precios, alta de nuevos productos y control de existencias.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-semibold text-stone-900">
            <span>Ver inventario</span>
            <span className="ml-1 transition group-hover:translate-x-1">&rarr;</span>
          </div>
        </Link>

        {/* Servicios & Tarifas */}
        <Link
          href="/servicios"
          className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-800 mb-4 transition group-hover:scale-105">
              <LayersIcon className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">Tarifas de Servicios</h2>
            <p className="mt-1 text-xs text-stone-500">
              Configuración de precios de fotocopias, impresiones, laminados, encolochados y sublimados.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-semibold text-stone-900">
            <span>Administrar tarifas</span>
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
              Registro continuo de entradas, salidas por venta, creaciones y ajustes de inventario de productos físicos.
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
