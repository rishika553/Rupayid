import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.ledger.findMany({ orderBy: { code: 'asc' } });
  }

  async findById(id: string) {
    const ledger = await this.prisma.ledger.findUnique({ where: { id } });
    if (!ledger) throw new Error('Ledger not found');
    return ledger;
  }

  async createEntry(data: {
    ledgerId: string;
    entryType: string;
    amount: number;
    category: string;
    description?: string;
    reference?: string;
    entrySource?: string;
    direction?: string;
  }) {
    await this.findById(data.ledgerId);

    const lastEntry = await this.prisma.ledgerEntry.findFirst({
      where: { ledgerId: data.ledgerId },
      orderBy: { txnSeq: 'desc' },
    });

    const prevHash = lastEntry?.entryHash || null;
    const txnSeq = (lastEntry?.txnSeq ? Number(lastEntry.txnSeq) : 0) + 1;

    const payload = JSON.stringify({
      ledgerId: data.ledgerId,
      entryType: data.entryType,
      amount: data.amount,
      category: data.category,
      txnSeq,
      prevHash,
    });

    const entryHash = crypto.createHash('sha256').update(payload).digest('hex');

    const entry = await this.prisma.ledgerEntry.create({
      data: {
        ledgerId: data.ledgerId,
        entryType: data.entryType as never,
        amount: data.amount,
        category: data.category as never,
        description: data.description,
        reference: data.reference,
        entrySource: (data.entrySource || 'SYSTEM') as never,
        direction: (data.direction || 'NO_MOVEMENT') as never,
        prevEntryHash: prevHash,
        entryHash,
      },
    });

    const balanceChange = data.entryType === 'CREDIT' ? data.amount : -data.amount;

    await this.prisma.ledger.update({
      where: { id: data.ledgerId },
      data: { currentBalance: { increment: balanceChange } },
    });

    return entry;
  }

  async getEntries(ledgerId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: { ledgerId },
        orderBy: { txnSeq: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.ledgerEntry.count({ where: { ledgerId } }),
    ]);

    return { data: entries, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
