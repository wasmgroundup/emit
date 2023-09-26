import { expect, test } from "bun:test";

import {
  BytecodeFragment,
  code,
  codesec,
  export_,
  exportdesc,
  exportsec,
  f64,
  func,
  funcidx,
  funcsec,
  functype,
  import_,
  importdesc,
  importsec,
  instr,
  module,
  typeidx,
  typesec,
  valtype,
} from "./index";

test("simple modules", async () => {
  const makeModule = (paramTypes, resultTypes, body) => {
    const mod = module([
      typesec([functype(paramTypes, resultTypes)]),
      funcsec([typeidx(0)]),
      exportsec([export_("main", exportdesc.func(0))]),
      codesec([code(func([], body))]),
    ]);
    return Uint8Array.from(mod.flat(Infinity));
  };
  const runMain = async (bytes, args) => {
    const { instance } = await WebAssembly.instantiate(bytes);
    return instance.exports.main(...args);
  };

  // () => ()
  expect(await runMain(makeModule([], [], [instr.end]), [])).toBe(undefined);

  // () => i32
  expect(
    await runMain(
      makeModule([], [valtype.i32], [instr.i32.const, 1, instr.end]),
      [],
    ),
  ).toBe(1);

  // (i32) => i32
  expect(
    await runMain(
      makeModule([valtype.i32], [valtype.i32], [instr.local.get, 0, instr.end]),
      [1],
    ),
  ).toBe(1);
  expect(
    await runMain(
      makeModule([valtype.i32], [valtype.i32], [instr.local.get, 0, instr.end]),
      [99],
    ),
  ).toBe(99);
});

test("imports", async () => {
  const makeModule = () => {
    const mod = module([
      typesec([functype([valtype.i32], [valtype.i32])]),
      importsec([import_("builtins", "addOne", importdesc.func(0))]),
      funcsec([typeidx(0)]),
      exportsec([export_("main", exportdesc.func(1))]),
      codesec([
        code(func([], [instr.local.get, 0, instr.call, funcidx(0), instr.end])),
      ]),
    ]);
    return Uint8Array.from(mod.flat(Infinity));
  };

  const { instance } = await WebAssembly.instantiate(makeModule(), {
    builtins: {
      addOne(x) {
        return x + 1;
      },
    },
  });

  expect(instance.exports.main(1)).toBe(2);
  expect(instance.exports.main(2)).toBe(3);
});

test("f64", async () => {
  const PI = 3.141592653589793115997963468544185161590576171875;
  const makeModule = () => {
    const mod = module([
      typesec([functype([], [valtype.f64])]),
      funcsec([typeidx(0), typeidx(0)]),
      exportsec([
        export_("pi", exportdesc.func(0)),
        export_("nan", exportdesc.func(1)),
      ]),
      codesec([
        code(func([], [instr.f64.const, f64(PI), instr.end])),
        code(func([], [instr.f64.const, f64(Number.NaN), instr.end])),
      ]),
    ]);
    return Uint8Array.from(mod.flat(Infinity));
  };
  const { instance } = await WebAssembly.instantiate(makeModule());
  expect(instance.exports.pi()).toBe(PI);
  expect(instance.exports.nan()).toBe(Number.NaN);
});
