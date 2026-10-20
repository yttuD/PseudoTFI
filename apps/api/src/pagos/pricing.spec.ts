import { describe, it, expect } from 'vitest';
import {
  calcularDescuentoPorVolumen,
  calcularPrecioTotalCupo,
  calcularPrecioCompraIncremental,
} from '@tfi/types';

describe('Esquema Real de Precios por Volumen de Cupo', () => {
  describe('calcularDescuentoPorVolumen', () => {
    it('debe aplicar 0% de descuento para 1 a 4 unidades', () => {
      expect(calcularDescuentoPorVolumen(1)).toBe(0);
      expect(calcularDescuentoPorVolumen(2)).toBe(0);
      expect(calcularDescuentoPorVolumen(3)).toBe(0);
      expect(calcularDescuentoPorVolumen(4)).toBe(0);
    });

    it('debe aplicar 10% de descuento para 5 a 9 unidades', () => {
      expect(calcularDescuentoPorVolumen(5)).toBe(10);
      expect(calcularDescuentoPorVolumen(7)).toBe(10);
      expect(calcularDescuentoPorVolumen(9)).toBe(10);
    });

    it('debe aplicar 15% de descuento para 10 a 14 unidades', () => {
      expect(calcularDescuentoPorVolumen(10)).toBe(15);
      expect(calcularDescuentoPorVolumen(12)).toBe(15);
      expect(calcularDescuentoPorVolumen(14)).toBe(15);
    });

    it('debe aplicar 20% de descuento para 15 a 19 unidades', () => {
      expect(calcularDescuentoPorVolumen(15)).toBe(20);
      expect(calcularDescuentoPorVolumen(19)).toBe(20);
    });

    it('debe continuar incrementando +5% cada 5 unidades sin techo', () => {
      expect(calcularDescuentoPorVolumen(20)).toBe(25);
      expect(calcularDescuentoPorVolumen(25)).toBe(30);
      expect(calcularDescuentoPorVolumen(50)).toBe(55);
    });
  });

  describe('calcularPrecioTotalCupo (Verificación de puntos de escala requeridos)', () => {
    it('Punto 1: 4 unidades -> 0% descuento, precio total = $39.600 ARS', () => {
      const calculo = calcularPrecioTotalCupo(4);
      expect(calculo.unidades).toBe(4);
      expect(calculo.precioBasePorUnidad).toBe(9900);
      expect(calculo.porcentajeDescuento).toBe(0);
      expect(calculo.precioSubtotal).toBe(39600);
      expect(calculo.montoDescuento).toBe(0);
      expect(calculo.precioFinal).toBe(39600);
    });

    it('Punto 2: 5 unidades -> 10% descuento, precio total = $44.550 ARS', () => {
      const calculo = calcularPrecioTotalCupo(5);
      expect(calculo.unidades).toBe(5);
      expect(calculo.precioBasePorUnidad).toBe(9900);
      expect(calculo.porcentajeDescuento).toBe(10);
      expect(calculo.precioSubtotal).toBe(49500);
      expect(calculo.montoDescuento).toBe(4950);
      expect(calculo.precioFinal).toBe(44550);
    });

    it('Punto 3: 10 unidades -> 15% descuento, precio total = $84.150 ARS', () => {
      const calculo = calcularPrecioTotalCupo(10);
      expect(calculo.unidades).toBe(10);
      expect(calculo.precioBasePorUnidad).toBe(9900);
      expect(calculo.porcentajeDescuento).toBe(15);
      expect(calculo.precioSubtotal).toBe(99000);
      expect(calculo.montoDescuento).toBe(14850);
      expect(calculo.precioFinal).toBe(84150);
    });

    it('Punto adicional: 15 unidades -> 20% descuento, precio total = $118.800 ARS', () => {
      const calculo = calcularPrecioTotalCupo(15);
      expect(calculo.porcentajeDescuento).toBe(20);
      expect(calculo.precioSubtotal).toBe(148500);
      expect(calculo.montoDescuento).toBe(29700);
      expect(calculo.precioFinal).toBe(118800);
    });
  });

  describe('calcularPrecioCompraIncremental (Criterio Delta sobre inventario consolidado)', () => {
    it('Caso obligatorio 1 (CRUZA DE TRAMO): de 5 a 10 unidades', () => {
      // Gestor con 5 unidades (tramo 10%, pagaba $44.550) compra 5 más -> 10 unidades (tramo 15%, total $84.150)
      // Monto delta a cobrar: $84.150 - $44.550 = $39.600
      const calculo = calcularPrecioCompraIncremental(5, 5);

      expect(calculo.cupoActual).toBe(5);
      expect(calculo.cupoAdicional).toBe(5);
      expect(calculo.cupoTotalResultante).toBe(10);
      expect(calculo.precioTotalActual).toBe(44550);
      expect(calculo.precioTotalResultante).toBe(84150);
      expect(calculo.descuentoActualPorcentaje).toBe(10);
      expect(calculo.descuentoResultantePorcentaje).toBe(15);
      expect(calculo.montoACobrar).toBe(39600);
    });

    it('Caso obligatorio 2 (NO CRUZA DE TRAMO): de 6 a 8 unidades', () => {
      // Gestor con 6 unidades (tramo 10%, $53.460) compra 2 más -> 8 unidades (tramo 10%, $71.280)
      // Monto delta a cobrar: $71.280 - $53.460 = $17.820 (equivale a 2 u. al 10%)
      const calculo = calcularPrecioCompraIncremental(6, 2);

      expect(calculo.cupoActual).toBe(6);
      expect(calculo.cupoAdicional).toBe(2);
      expect(calculo.cupoTotalResultante).toBe(8);
      expect(calculo.precioTotalActual).toBe(53460);
      expect(calculo.precioTotalResultante).toBe(71280);
      expect(calculo.descuentoActualPorcentaje).toBe(10);
      expect(calculo.descuentoResultantePorcentaje).toBe(10);
      expect(calculo.montoACobrar).toBe(17820);
    });

    it('Caso inicial: de 0 a 4 unidades (sin cupo previo)', () => {
      // Gestor sin cupo previo compra 4 unidades (tramo 0%)
      // Monto a cobrar: $39.600 - 0 = $39.600
      const calculo = calcularPrecioCompraIncremental(0, 4);

      expect(calculo.cupoActual).toBe(0);
      expect(calculo.cupoAdicional).toBe(4);
      expect(calculo.cupoTotalResultante).toBe(4);
      expect(calculo.precioTotalActual).toBe(0);
      expect(calculo.precioTotalResultante).toBe(39600);
      expect(calculo.descuentoActualPorcentaje).toBe(0);
      expect(calculo.descuentoResultantePorcentaje).toBe(0);
      expect(calculo.montoACobrar).toBe(39600);
    });

    it('Caso cruce múltiple de tramos: de 4 unidades a 15 unidades', () => {
      // Gestor con 4 unidades (tramo 0%, $39.600) compra 11 adicionales -> 15 unidades (tramo 20%, $118.800)
      // Monto delta a cobrar: $118.800 - $39.600 = $79.200
      const calculo = calcularPrecioCompraIncremental(4, 11);

      expect(calculo.cupoActual).toBe(4);
      expect(calculo.cupoAdicional).toBe(11);
      expect(calculo.cupoTotalResultante).toBe(15);
      expect(calculo.precioTotalActual).toBe(39600);
      expect(calculo.precioTotalResultante).toBe(118800);
      expect(calculo.descuentoActualPorcentaje).toBe(0);
      expect(calculo.descuentoResultantePorcentaje).toBe(20);
      expect(calculo.montoACobrar).toBe(79200);
    });
  });
});

