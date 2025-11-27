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

test('final chapter 1 module - errors', () => {
  // @ts-expect-error: Passing a number instead of a typeidx.
  w.funcsec([0]);

  const valtype = 0x7f;
  assert.equal(w.valtype.i32, valtype);

  // @ts-expect-error: Passing a raw value instead of branded one.
  w.functype([valtype], []);
});
