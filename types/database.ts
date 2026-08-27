export type CategoriaServicio =
  | "fotocopias"
  | "impresiones"
  | "laminados"
  | "encolochados"
  | "sublimados";

export type TipoPrecioServicio = "fijo" | "por_unidad" | "variable";

export type Servicio = {
  id: string;
  codigo: string;
  categoria: CategoriaServicio;
  nombre: string;
  descripcion?: string | null;
  tipo_precio: TipoPrecioServicio;
  precio_actual: number;
  version_precio: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ServicioHistorialPrecio = {
  id: string;
  servicio_id: string;
  version: number;
  precio: number;
  fecha_inicio: string;
  fecha_fin?: string | null;
  motivo_cambio?: string | null;
  created_at?: string;
};

export type VentaServicioDetalle = {
  id: string;
  venta_id: string;
  servicio_id?: string | null;
  codigo_servicio: string;
  nombre_servicio: string;
  tipo_servicio: string;
  descripcion_personalizada?: string | null;
  cantidad: number;
  precio_unitario_aplicado: number;
  subtotal: number;
  version_precio?: number | null;
  fecha: string;
};

export type ItemVendido = {
  tipo?: "producto" | "servicio";
  producto_id?: string;
  servicio_id?: string;
  codigo_servicio?: string;
  nombre: string;
  descripcion_personalizada?: string | null;
  cantidad: number;
  precio_unitario: number;
};

export type Producto = {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
};

export type Venta = {
  id: string;
  fecha: string;
  total: number;
  items_vendidos: ItemVendido[];
};

export type CartItemProducto = {
  tipo: "producto";
  id: string; // unique item id in cart (producto.id)
  producto: Producto;
  cantidad: number;
};

export type CartItemServicio = {
  tipo: "servicio";
  id: string; // unique item id in cart
  servicio: Servicio;
  nombre: string;
  descripcion_personalizada?: string;
  cantidad: number;
  precio_unitario: number;
  opcion?: string; // e.g. "B&N", "Color", "Carta", "Media Carta"
};

export type CartItem = CartItemProducto | CartItemServicio;

export type MetodoPago = "efectivo" | "tarjeta" | "transferencia";

export type TipoMovimiento =
  | "venta"
  | "ajuste_manual"
  | "creacion"
  | "recepcion_stock";

export type MovimientoInventario = {
  id: string;
  producto_id: string | null;
  nombre_producto: string;
  tipo: TipoMovimiento;
  cantidad_cambio: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo?: string | null;
  fecha: string;
};
