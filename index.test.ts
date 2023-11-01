import { expect, test } from "bun:test";

import {
  BytecodeFragment,
  blocktype,
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
  global,
  globalsec,
  globaltype,
  i32,
  import_,
  importdesc,
  importsec,
  instr,
  module,
  mut,
  typeidx,
  typesec,
  u32,
  valtype,
} from "./index";

const PI = 3.141592653589793115997963468544185161590576171875;

function fragmentToUInt8Array(frag: BytecodeFragment): Uint8Array {
  return Uint8Array.from((frag as any).flat(Infinity));
}

test("u32", () => {
  expect(u32(32768)).toEqual([128, 128, 2]);
  expect(u32(2 ** 32 - 1)).toEqual([255, 255, 255, 255, 15]);
});

test("simple modules", async () => {
  const makeModule = (paramTypes, resultTypes, body) => {
    const mod = module([
      typesec([functype(paramTypes, resultTypes)]),
      funcsec([typeidx(0)]),
      exportsec([export_("main", exportdesc.func(0))]),
      codesec([code(func([], body))]),
    ]);
    return fragmentToUInt8Array(mod);
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
    return fragmentToUInt8Array(mod);
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
  const makeModule = () => {
    const mod = module([
      typesec([functype([], [valtype.f64])]),
      funcsec([typeidx(0), typeidx(0), typeidx(0)]),
      exportsec([
        export_("pi", exportdesc.func(0)),
        export_("nan", exportdesc.func(1)),
        export_("one", exportdesc.func(2)),
      ]),
      codesec([
        code(func([], [instr.f64.const, f64(PI), instr.end])),
        code(func([], [instr.f64.const, f64(Number.NaN), instr.end])),
        code(func([], [instr.f64.const, f64(1), instr.end])),
      ]),
    ]);
    return fragmentToUInt8Array(mod);
  };
  const { instance } = await WebAssembly.instantiate(makeModule());
  expect(instance.exports.pi()).toBe(PI);
  expect(instance.exports.nan()).toBe(Number.NaN);
  expect(instance.exports.one()).toBe(1);
});

test("globals", async () => {
  const makeModule = () => {
    const mod = module([
      typesec([
        functype([], [valtype.f64]), // pi
        functype([], [valtype.i32]), // getVar
        functype([], []), // incVar
      ]),
      funcsec([typeidx(0), typeidx(1), typeidx(2)]),
      globalsec([
        global(globaltype(valtype.f64, mut.const), [
          instr.f64.const,
          f64(PI),
          instr.end,
        ]),
        global(globaltype(valtype.i32, mut.var), [
          instr.i32.const,
          i32(0),
          instr.end,
        ]),
      ]),
      exportsec([
        export_("pi", exportdesc.func(0)),
        export_("getVar", exportdesc.func(1)),
        export_("incVar", exportdesc.func(2)),
      ]),
      codesec([
        code(func([], [instr.global.get, 0, instr.end])), // pi
        code(func([], [instr.global.get, 1, instr.end])), // getVar
        code(
          // prettier-ignore
          func([], [
              instr.global.get, 1,
              instr.i32.const, 1,
              instr.i32.add,
              instr.global.set, 1,
              instr.end,
            ],
          ),
        ), // incVar
      ]),
    ]);
    return fragmentToUInt8Array(mod);
  };

  const { exports } = (await WebAssembly.instantiate(makeModule())).instance;
  expect(exports.pi()).toBe(PI);
  expect(exports.getVar()).toBe(0);
  exports.incVar();
  expect(exports.getVar()).toBe(1);
});

test("if", async () => {
  const makeModule = () => {
    const mod = module([
      typesec([functype([valtype.i32], [valtype.f64])]),
      funcsec([typeidx(0)]),
      exportsec([export_("maybePi", exportdesc.func(0))]),
      codesec([
        code(
          func(
            [],
            // prettier-ignore
            [
              instr.local.get, 0,
              instr.if, blocktype(valtype.f64),
              instr.f64.const, f64(PI),
              instr.else,
              instr.f64.const, f64(0),
              instr.end,
              instr.end,
            ],
          ),
        ),
      ]),
    ]);
    return fragmentToUInt8Array(mod);
  };
  const { exports } = (await WebAssembly.instantiate(makeModule())).instance;
  expect(exports.maybePi(1)).toBe(PI);
  expect(exports.maybePi(0)).toBe(0);
});
