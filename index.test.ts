import {test} from 'node:test';
import * as assert from 'node:assert/strict';

import * as w from './index.js';

test('final chapter 1 module', () => {
  const mod = w.module([
    w.typesec([w.functype([w.valtype.i32], [])]),
    w.funcsec([w.typeidx(0)]),
    w.exportsec([w.export_('main', w.exportdesc.func(w.funcidx(0)))]),
    w.codesec([w.code(w.func([], [w.instr.end]))]),
  ]);
  const bytes = Uint8Array.from((mod as any).flat(Infinity));
  assert.ok(WebAssembly.validate(bytes));
});

test('multi-byte indices (>= 128)', () => {
  // Build a module with enough functions to require multi-byte LEB128 indices.
  const numFuncs = 200;
  const ft = w.functype([], [w.valtype.i32]);
  const functypes = [ft];
  const typeidxs = Array.from({length: numFuncs}, () => w.typeidx(0));
  const body = w.code(w.func([], w.expr([[w.instr.i32.const, w.i32(42)]])));
  const codes = Array.from({length: numFuncs}, () => body);

  // Export the last function, which has a multi-byte index (199 => [0xc7, 0x01])
  const lastIdx = w.funcidx(numFuncs - 1);
  const mod = w.module([
    w.typesec(functypes),
    w.funcsec(typeidxs),
    w.exportsec([w.export_('last', w.exportdesc.func(lastIdx))]),
    w.codesec(codes),
  ]);
  const bytes = Uint8Array.from((mod as any).flat(Infinity));
  assert.ok(WebAssembly.validate(bytes));
});

test('importdesc.func with multi-byte index', () => {
  const numTypes = 200;
  const ft = w.functype([], []);
  const functypes = Array.from({length: numTypes}, () => ft);
  const lastTypeIdx = w.typeidx(numTypes - 1);
  const mod = w.module([
    w.typesec(functypes),
    w.importsec([w.import_('env', 'fn', w.importdesc.func(lastTypeIdx))]),
  ]);
  const bytes = Uint8Array.from((mod as any).flat(Infinity));
  assert.ok(WebAssembly.validate(bytes));
});

test('final chapter 1 module - errors', () => {
  // @ts-expect-error: Passing a number instead of a typeidx.
  w.funcsec([0]);

  const valtype = 0x7f;
  assert.equal(w.valtype.i32, valtype);

  // @ts-expect-error: Passing a raw value instead of branded one.
  w.functype([valtype], []);
});
