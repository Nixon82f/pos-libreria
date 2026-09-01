"use client";

import type { OperadorRecarga, RecargaBolsa, RecargaMovimiento } from "@/types/database";

const STORAGE_KEY_BOLSAS = "pos_recargas_bolsas_cache_v1";
const STORAGE_KEY_MOVIMIENTOS = "pos_recargas_movimientos_cache_v1";

export const DEFAULT_BOLSAS: RecargaBolsa[] = [
  {
    id: "local-bolsa-tigo",
    operador: "tigo",
    nombre_display: "Tigo",
    saldo_actual: 0.0,
    color_hex: "#00377B",
  },
  {
    id: "local-bolsa-claro",
    operador: "claro",
    nombre_display: "Claro",
    saldo_actual: 0.0,
    color_hex: "#DA291C",
  },
];

export function getLocalBolsas(): RecargaBolsa[] {
  if (typeof window === "undefined") return DEFAULT_BOLSAS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOLSAS);
    if (!raw) return DEFAULT_BOLSAS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error("Error reading local bolsas:", err);
  }
  return DEFAULT_BOLSAS;
}

export function saveLocalBolsas(bolsas: RecargaBolsa[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_BOLSAS, JSON.stringify(bolsas));
  } catch (err) {
    console.error("Error saving local bolsas:", err);
  }
}

export function getLocalRecargasMovimientos(): RecargaMovimiento[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MOVIMIENTOS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {
    console.error("Error reading local recargas movimientos:", err);
  }
  return [];
}

export function addLocalRecargaMovimiento(mov: RecargaMovimiento): void {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalRecargasMovimientos();
    const updated = [mov, ...current].slice(0, 200); // keep recent 200
    localStorage.setItem(STORAGE_KEY_MOVIMIENTOS, JSON.stringify(updated));
  } catch (err) {
    console.error("Error saving local recarga movimiento:", err);
  }
}
