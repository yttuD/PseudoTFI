export const PRICING = {
  BASE_PRICE_PER_UNIT_ARS: 9900,
  TRIAL_DAYS: 7,
  TRIAL_MAX_UNITS: 3,
};

/**
 * Calcula el porcentaje de descuento por volumen sobre el total de unidades:
 * - 1-4 unidades: 0% descuento
 * - 5-9 unidades: 10% descuento
 * - 10-14 unidades: 15% descuento
 * - 15-19 unidades: 20% descuento
 * - Cada 5 unidades adicionales: +5% de descuento sin techo.
 */
export function calcularDescuentoPorVolumen(unidades: number): number {
  if (unidades < 5) return 0;
  return 10 + 5 * Math.floor((unidades - 5) / 5);
}

export interface CalculoPrecioCupo {
  precioBasePorUnidad: number;
  unidades: number;
  porcentajeDescuento: number;
  precioSubtotal: number;
  montoDescuento: number;
  precioFinal: number;
}

export function calcularPrecioTotalCupo(unidades: number): CalculoPrecioCupo {
  const cant = Math.max(1, Math.floor(unidades || 1));
  const precioBasePorUnidad = PRICING.BASE_PRICE_PER_UNIT_ARS;
  const porcentajeDescuento = calcularDescuentoPorVolumen(cant);
  const precioSubtotal = cant * precioBasePorUnidad;
  const montoDescuento = Math.round(precioSubtotal * (porcentajeDescuento / 100));
  const precioFinal = precioSubtotal - montoDescuento;

  return {
    precioBasePorUnidad,
    unidades: cant,
    porcentajeDescuento,
    precioSubtotal,
    montoDescuento,
    precioFinal,
  };
}

export interface CalculoCompraIncremental {
  cupoActual: number;
  cupoAdicional: number;
  cupoTotalResultante: number;
  precioTotalActual: number;
  precioTotalResultante: number;
  descuentoActualPorcentaje: number;
  descuentoResultantePorcentaje: number;
  montoACobrar: number;
}

export function calcularPrecioCompraIncremental(
  cupoActual: number,
  cupoAdicional: number,
): CalculoCompraIncremental {
  const actualValido = Math.max(0, Math.floor(cupoActual || 0));
  const adicionalValido = Math.max(1, Math.floor(cupoAdicional || 1));
  const totalResultante = actualValido + adicionalValido;

  const actualCalculo = calcularPrecioTotalCupo(actualValido);
  const resultanteCalculo = calcularPrecioTotalCupo(totalResultante);

  // Delta de precio mensual entre el nuevo total y el inventario actual
  const montoACobrar = Math.max(0, resultanteCalculo.precioFinal - actualCalculo.precioFinal);

  return {
    cupoActual: actualValido,
    cupoAdicional: adicionalValido,
    cupoTotalResultante: totalResultante,
    precioTotalActual: actualCalculo.precioFinal,
    precioTotalResultante: resultanteCalculo.precioFinal,
    descuentoActualPorcentaje: actualCalculo.porcentajeDescuento,
    descuentoResultantePorcentaje: resultanteCalculo.porcentajeDescuento,
    montoACobrar,
  };
}

