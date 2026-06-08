import { describe, expect, it } from 'vitest';

import { getSaleStatus } from './sale-window.js';

const START = 1_000;
const END = 2_000;

describe('getSaleStatus', () => {
  it('returns upcoming before the sale starts', () => {
    expect(getSaleStatus(START - 1, START, END, 10)).toBe('upcoming');
  });

  it('returns active at the sale start boundary', () => {
    expect(getSaleStatus(START, START, END, 10)).toBe('active');
  });

  it('returns active during the sale window', () => {
    expect(getSaleStatus(START + 500, START, END, 10)).toBe('active');
  });

  it('returns ended at the sale end boundary', () => {
    expect(getSaleStatus(END, START, END, 10)).toBe('ended');
  });

  it('returns ended after the sale ends', () => {
    expect(getSaleStatus(END + 1, START, END, 10)).toBe('ended');
  });

  it('returns sold_out when stock is zero during an active window', () => {
    expect(getSaleStatus(START + 100, START, END, 0)).toBe('sold_out');
  });

  it('returns sold_out when stock is zero before the sale starts', () => {
    expect(getSaleStatus(START - 100, START, END, 0)).toBe('sold_out');
  });

  it('returns sold_out instead of ended when stock is zero after the sale ends', () => {
    expect(getSaleStatus(END + 100, START, END, 0)).toBe('sold_out');
  });
});
