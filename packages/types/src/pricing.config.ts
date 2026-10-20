export const PRICING = {
  BASE_PRICE_PER_UNIT_ARS: 9900,
  TRIAL_DAYS: 7,
  TRIAL_MAX_UNITS: 3,
};

/**
 * Calcula el porcentaje de descuento por volumen sobre el total de unidades de la cuenta:
 * - 1-4 unidades: 0% descuento
 * - 5-9 unidades: 10% descuento
 * - 10-14 unidades: 15% descuento
 * - 15-19 unidades: 20% descuento
 * - Cada 5 unidades adicionales: +5% de descuento, sin techo.
 *
 * Fórmula: descuento = 0 si unidades < 5, si no 10 + 5 * floor((unidades - 5) / 5)
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

/**
 * Calcula el desglose completo de precio para una cantidad determinada de unidades de Cupo.
 * Fórmula: Precio total mensual = unidades * 9900 * (1 - descuento/100)
 */
export function calcularPrecioTotalCupo(unidades: number): CalculoPrecioCupo {
  const cant = Math.max(0, Math.floor(unidades));
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

/**
 * Calcula el monto a cobrar por una compra incremental de Cupo:
 * El monto a cobrar corresponde al Delta de Precio Total Mensual entre el nuevo cupo total
 * resultante y el cupo actual de la cuenta del Gestor:
 *   montoACobrar = precioTotal(cupoActual + cupoAdicional) - precioTotal(cupoActual)
 *
 * Esto garantiza que el Gestor siempre pague exactamente la diferencia de precio mensual
 * reflejando el descuento por volumen sobre el inventario consolidado.
 */
export function calcularPrecioCompraIncremental(
  cupoActual: number,
  cupoAdicional: number,
): CalculoCompraIncremental {
  const actualValido = Math.max(0, Math.floor(cupoActual));
  const adicionalValido = Math.max(0, Math.floor(cupoAdicional));
  const totalResultante = actualValido + adicionalValido;

  const actualCalculo = calcularPrecioTotalCupo(actualValido);
  const resultanteCalculo = calcularPrecioTotalCupo(totalResultante);

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

