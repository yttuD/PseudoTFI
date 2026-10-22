import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AlquileresService } from './alquileres.service.js';

const id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const filename = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa_contrato.pdf';
const path = id + '/' + filename;

function setup(opts: { existing?: string | null; fileExists?: boolean; lostRace?: boolean; missing?: boolean } = {}) {
  const read = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: opts.missing ? null : { id, contrato_url: opts.existing ?? null },
      error: opts.missing ? { code: 'PGRST116' } : null,
    }),
  };
  const write = {
    update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: opts.lostRace ? null : { id, contrato_url: path }, error: null,
    }),
  };
  const list = vi.fn().mockResolvedValue({
    data: opts.fileExists === false ? [] : [{ name: filename, id: 'storage-object', metadata: { size: 400 } }],
    error: null,
  });
  let calls = 0;
  const client = {
    from: vi.fn().mockImplementation(() => ++calls === 1 ? read : write),
    storage: { from: vi.fn().mockReturnValue({ list }) },
  };
  const service = new AlquileresService({ getClient: () => client } as any);
  return { service, client, read, write, list };
}

describe('Rental contract private storage and write-once link', () => {
  it('links exact accessible file only without rewriting money or dates', async () => {
    const h = setup();
    await expect(h.service.attachContract(id, path, 'token'))
      .resolves.toEqual({ id, contrato_url: path });
    expect(h.list).toHaveBeenCalledWith(id, { search: filename, limit: 100 });
    expect(h.write.update).toHaveBeenCalledWith({ contrato_url: path });
    expect(h.write.is).toHaveBeenCalledWith('contrato_url', null);
  });
  it('rejects external URL, foreign rental, traversal and non PDF', async () => {
    const h = setup();
    for (const candidate of [
      'https://example.com/file.pdf',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/' + filename,
      id + '/../something.pdf',
      id + '/something.png',
    ]) {
      await expect(h.service.attachContract(id, candidate, 'token'))
        .rejects.toThrow(BadRequestException);
    }
    expect(h.client.from).not.toHaveBeenCalled();
  });
  it('does not overwrite existing contract and same-path retry is idempotent', async () => {
    const different = setup({ existing: 'old-path.pdf' });
    await expect(different.service.attachContract(id, path, 'token'))
      .rejects.toThrow(ConflictException);
    expect(different.write.update).not.toHaveBeenCalled();
    const same = setup({ existing: path });
    await expect(same.service.attachContract(id, path, 'token'))
      .resolves.toEqual({ id, contrato_url: path });
    expect(same.write.update).not.toHaveBeenCalled();
  });
  it('rejects missing storage object or inaccessible rental', async () => {
    const absent = setup({ fileExists: false });
    await expect(absent.service.attachContract(id, path, 'token'))
      .rejects.toThrow(BadRequestException);
    expect(absent.write.update).not.toHaveBeenCalled();
    const missingRental = setup({ missing: true });
    await expect(missingRental.service.attachContract(id, path, 'token'))
      .rejects.toThrow(NotFoundException);
    expect(missingRental.list).not.toHaveBeenCalled();
  });
  it('detects concurrent attachment without overwriting', async () => {
    const h = setup({ lostRace: true });
    await expect(h.service.attachContract(id, path, 'token'))
      .rejects.toThrow(ConflictException);
    expect(h.write.is).toHaveBeenCalledWith('contrato_url', null);
  });
  it('rejects generic PATCH of contrato_url without side effects', async () => {
    const h = setup();
    await expect(h.service.update(id, { contrato_url: path }, 'token'))
      .rejects.toThrow(BadRequestException);
    expect(h.client.from).not.toHaveBeenCalled();
  });
});
