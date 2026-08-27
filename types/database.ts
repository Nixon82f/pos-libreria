export type ItemVendido = {
  producto_id: string;
  nombre: string;
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

export type CartItem = {
  producto: Producto;
  cantidad: number;
};

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
