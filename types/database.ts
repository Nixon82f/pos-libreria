export type CategoriaServicio =
  | "fotocopias"
  | "impresiones"
  | "laminados"
  | "encolochados"
  | "sublimados"
  | "comida"
  | "otros";

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

export const DEFAULT_SERVICIOS: Servicio[] = [
  {
    id: "mock-fc-bn",
    codigo: "fotocopia_bn",
    categoria: "fotocopias",
    nombre: "Fotocopia B&N",
    descripcion: "Copia simple blanco y negro tamaño carta u oficio.",
    tipo_precio: "por_unidad",
    precio_actual: 1.0,
    version_precio: 1,
    activo: true,
  },
  {
    id: "mock-fc-col",
    codigo: "fotocopia_color",
    categoria: "fotocopias",
    nombre: "Fotocopia Color",
    descripcion: "Copia a color con tarifa variable según cobertura de tinta.",
    tipo_precio: "variable",
    precio_actual: 5.0,
    version_precio: 1,
    activo: true,
  },
  {
    id: "mock-imp-bn",
    codigo: "impresion_bn",
    categoria: "impresiones",
    nombre: "Impresión B&N",
    descripcion: "Impresión de documentos en blanco y negro.",
    tipo_precio: "por_unidad",
    precio_actual: 2.0,
    version_precio: 1,
    activo: true,
  },
  {
    id: "mock-imp-col",
    codigo: "impresion_color",
    categoria: "impresiones",
    nombre: "Impresión Color",
    descripcion: "Impresión a color con tarifa variable según tipo de archivo.",
    tipo_precio: "variable",
    precio_actual: 6.0,
    version_precio: 1,
    activo: true,
  },
  {
    id: "mock-lam-c",
    codigo: "laminado_carta",
    categoria: "laminados",
    nombre: "Laminado Carta",
    descripcion: "Enmicado térmico protector tamaño carta con tarifa variable.",
    tipo_precio: "variable",
    precio_actual: 15.0,
    version_precio: 1,
    activo: true,
  },
  {
    id: "mock-lam-mc",
    codigo: "laminado_media_carta",
    categoria: "laminados",
    nombre: "Laminado Media Carta",
    descripcion: "Enmicado térmico para credenciales o media carta con tarifa variable.",
    tipo_precio: "variable",
    precio_actual: 10.0,
    version_precio: 1,
    activo: true,
  },
  {
    id: "mock-enc",
    codigo: "encolochado_hoja",
    categoria: "encolochados",
    nombre: "Encolochado de Documento",
    descripcion: "Encuadernación con resorte plástico con precio variable en caja.",
    tipo_precio: "variable",
    precio_actual: 25.0,
    version_precio: 1,
    activo: true,
  },
  {
    id: "mock-sub",
    codigo: "sublimado_articulo",
    categoria: "sublimados",
    nombre: "Artículo Sublimado",
    descripcion: "Personalización de tazas, playeras, termos y gorras.",
    tipo_precio: "variable",
    precio_actual: 0.0,
    version_precio: 1,
    activo: true,
  },
  {
    id: "mock-palomitas",
    codigo: "palomitas_servicio",
    categoria: "comida",
    nombre: "Palomitas de Maíz",
    descripcion: "Palomitas recién preparadas con precio dinámico en caja.",
    tipo_precio: "variable",
    precio_actual: 0.0,
    version_precio: 1,
    activo: true,
  },
  {
    id: "mock-otro",
    codigo: "servicio_otro",
    categoria: "otros",
    nombre: "Otro Servicio",
    descripcion: "Servicio personalizado, trámite o cobro extra.",
    tipo_precio: "variable",
    precio_actual: 0.0,
    version_precio: 1,
    activo: true,
  },
];

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

export type OperadorRecarga = "tigo" | "claro";

export type TipoMovimientoRecarga =
  | "apertura_saldo"
  | "venta_recarga"
  | "compra_saldo"
  | "ajuste_manual";

export type RecargaBolsa = {
  id: string;
  operador: OperadorRecarga;
  nombre_display: string;
  saldo_actual: number;
  color_hex: string;
  updated_at?: string;
};

export type RecargaMovimiento = {
  id: string;
  operador: OperadorRecarga;
  tipo: TipoMovimientoRecarga;
  monto_saldo: number;
  comision: number;
  total_cobrado_cliente: number;
  numero_telefono?: string | null;
  venta_id?: string | null;
  pago_con_efectivo_caja: boolean;
  saldo_anterior: number;
  saldo_nuevo: number;
  notas?: string | null;
  fecha: string;
};

export type ItemVendido = {
  tipo?: "producto" | "servicio" | "recarga";
  producto_id?: string;
  servicio_id?: string;
  codigo_servicio?: string;
  operador?: OperadorRecarga;
  numero_telefono?: string;
  monto_recarga?: number;
  comision?: number;
  nombre: string;
  descripcion_personalizada?: string | null;
  cantidad: number;
  precio_unitario: number;
};

export type CategoriaProducto = "libreria" | "comida" | "variedades";

export type Producto = {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  categoria?: CategoriaProducto | string;
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

export type CartItemRecarga = {
  tipo: "recarga";
  id: string; // unique item id in cart
  operador: OperadorRecarga;
  numero_telefono: string;
  monto_recarga: number;
  comision: number;
  precio_unitario: number; // monto_recarga + comision
  cantidad: number;
  nombre: string;
  descripcion_personalizada?: string;
};

export type CartItem = CartItemProducto | CartItemServicio | CartItemRecarga;

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

export type EstadoDiferenciaCierre = "cuadrado" | "sobrante" | "faltante";

export type DesgloseServiciosCierre = {
  fotocopias: number;
  impresiones: number;
  laminados: number;
  encolochados: number;
  sublimados: number;
  otros: number;
};

export type ResumenOperadorRecarga = {
  saldo_inicial: number;
  ventas: number;
  comisiones: number;
  compras_saldo: number;
  compras_saldo_efectivo: number;
  saldo_final_esperado: number;
};

export type DesgloseRecargasCierre = {
  tigo: ResumenOperadorRecarga;
  claro: ResumenOperadorRecarga;
  total_ventas_saldo: number;
  total_comisiones: number;
  total_cobrado_recargas: number;
  total_compras_efectivo_caja: number;
};

export type DesgloseEfectivo = {
  b1000?: number;
  b500?: number;
  b200?: number;
  b100?: number;
  b50?: number;
  b20?: number;
  m10?: number;
  m5?: number;
  m2?: number;
  m1?: number;
  m05?: number;
};

export type CierreCaja = {
  id: string;
  fecha_cierre: string;
  fecha_inicio_turno: string;
  fecha_fin_turno: string;
  total_ventas: number;
  total_productos: number;
  total_servicios: number;
  desglose_servicios: DesgloseServiciosCierre;
  total_recargas?: number;
  total_comisiones_recargas?: number;
  total_compras_saldo_efectivo?: number;
  desglose_recargas?: DesgloseRecargasCierre;
  total_efectivo_esperado: number;
  total_transferencia_esperado: number;
  total_tarjeta_esperado: number;
  efectivo_contado: number;
  desglose_efectivo?: DesgloseEfectivo;
  diferencia: number;
  estado_diferencia: EstadoDiferenciaCierre;
  total_transacciones: number;
  cajero: string;
  notas?: string | null;
  created_at?: string;
};


