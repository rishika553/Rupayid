import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import * as dtos from './admin-mutations.dto';
import { LoanProductsService } from '../../modules/loan-products/loan-products.service';
import { SystemConfigService } from '../../modules/config/config.service';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } });
const product = { code: 'QA', name: 'QA product', minAmount: 1000, maxAmount: 10000, minTenureMonths: 6, maxTenureMonths: 12, baseInterestRate: 0.12, processingFeeRate: 0.01 };

describe('administrative mutation DTOs', () => {
  it.each(Object.entries(dtos))('%s rejects fields outside its contract', async (_name, metatype) => {
    await expect(pipe.transform({ unexpectedDatabaseColumn: true }, { type: 'body', metatype })).rejects.toMatchObject({ status: 400 });
  });
  it.each([
    { minAmount: -1 }, { minAmount: '100' }, { maxAmount: null }, { baseInterestRate: -0.1 },
    { baseInterestRate: Infinity }, { baseInterestRate: 1000 }, { maxTenureMonths: 1.5 }, { maxTenureMonths: 121 },
  ])('rejects malformed product values %p', async (invalid) => {
    await expect(pipe.transform({ ...product, ...invalid }, { type: 'body', metatype: dtos.CreateLoanProductDto })).rejects.toThrow();
  });
  it('preserves valid numeric terms and rejects string booleans and null partial updates', async () => {
    await expect(pipe.transform(product, { type: 'body', metatype: dtos.CreateLoanProductDto })).resolves.toMatchObject(product);
    for (const body of [{ isActive: 'false' }, { minAmount: null }, { minTenureMonths: null }]) {
      await expect(pipe.transform(body, { type: 'body', metatype: dtos.UpdateLoanProductDto })).rejects.toThrow();
    }
  });
});

describe('merged product and configuration boundaries', () => {
  it('rejects reversed amount/tenure ranges before creating records', async () => {
    const create = jest.fn();
    const service = new LoanProductsService({ loanProduct: { create } } as never);
    await expect(service.create({ ...product, minAmount: 20000 })).rejects.toThrow('range');
    await expect(service.create({ ...product, minTenureMonths: 18 })).rejects.toThrow('range');
    expect(create).not.toHaveBeenCalled();
  });
  it('validates partial changes against the locked current product', async () => {
    const db = { $queryRaw: jest.fn(), loanProduct: { findUnique: jest.fn().mockResolvedValue(product), update: jest.fn() } };
    const service = new LoanProductsService({ $transaction: (callback: (tx: unknown) => unknown) => callback(db) } as never);
    await expect(service.update('product', { maxAmount: 500 })).rejects.toThrow('range');
    await expect(service.update('product', { minTenureMonths: 20 })).rejects.toThrow('range');
    expect(db.loanProduct.update).not.toHaveBeenCalled();
    await service.update('product', { baseInterestRate: 0.18 });
    expect(db.loanProduct.update).toHaveBeenCalledWith({ where: { id: 'product' }, data: { baseInterestRate: 0.18 } });
  });
  it('validates setting types, size and keys before writing', async () => {
    const upsert = jest.fn();
    const service = new SystemConfigService({ systemSetting: { findUnique: jest.fn().mockResolvedValue(null), upsert } } as never);
    for (const data of [{ type: 'bool', value: 'false' }, { type: 'int', value: 1.5 }, { type: 'decimal', value: Infinity }, { type: 'json', value: 'x'.repeat(65537) }]) {
      await expect(service.upsert('qa.key', data)).rejects.toThrow('Invalid setting');
    }
    await expect(service.upsert('bad/key', { value: 'text' })).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
    await service.upsert('qa.key', { type: 'bool', value: false });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ type: 'bool', value: 'false' }) }));
  });
});
