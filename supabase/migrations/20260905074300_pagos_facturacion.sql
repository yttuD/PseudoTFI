-- supabase/migrations/20260905074300_pagos_facturacion.sql

CREATE TYPE metodo_pago AS ENUM ('mercadopago', 'efectivo');
CREATE TYPE estado_pago AS ENUM ('pendiente', 'aprobado', 'rechazado');

CREATE TABLE pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL REFERENCES users(id),
  metodo metodo_pago NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  cupo_adquirido INT NOT NULL, -- Cuántas unidades está comprando
  estado estado_pago NOT NULL DEFAULT 'pendiente',
  referencia_externa TEXT, -- ID de MercadoPago o Comprobante manual
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
-- Gestor puede ver sus pagos (incluyendo delegados)
CREATE POLICY "Gestor puede ver sus pagos" ON pagos
  FOR SELECT USING (gestor_id = get_workspace_id());

-- El backend mediante Service Role podrá hacer INSERT/UPDATE/DELETE
