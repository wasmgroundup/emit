const SECTION_ID_TYPE = 1;
const SECTION_ID_FUNCTION = 3;
const SECTION_ID_EXPORT = 7;
const SECTION_ID_CODE = 10;

const TYPE_FUNCTION = 0x60;

export type BytecodeFragment = (number | BytecodeFragment)[];

function stringToBytes(s: string): number[] {
  const bytes = new TextEncoder().encode(s);
  return Array.from(bytes);
}

function int32ToBytes(v: number): number[] {
  // prettier-ignore
  return [
    v & 0xff,
    (v >> 8) & 0xff,
    (v >> 16) & 0xff,
    (v >> 24) & 0xff,
  ];
}

function magic(): number[] {
  // [0x00, 0x61, 0x73, 0x6d]
  return stringToBytes("\0asm");
}

function version(): number[] {
  // [0x01, 0x00, 0x00, 0x00]
  return int32ToBytes(1);
}

enum valtype {
  i32 = 0x7f,
  i64 = 0x7e,
  f32 = 0x7d,
  f64 = 0x7c,
}

function vec<T extends BytecodeFragment>(elements: T): BytecodeFragment {
  return [u32(elements.length), ...elements];
}

function section(id: number, contents: BytecodeFragment) {
  const sizeInBytes = (contents as any[]).flat(Infinity).length;
  return [id, u32(sizeInBytes), contents];
}

function functype(
  paramTypes: valtype[],
  resultTypes: valtype[],
): BytecodeFragment {
  return [TYPE_FUNCTION, vec(paramTypes), vec(resultTypes)];
}

function typesec(functypes: BytecodeFragment): BytecodeFragment {
  return section(SECTION_ID_TYPE, vec(functypes));
}

const typeidx = u32;

function funcsec(typeidxs: BytecodeFragment): BytecodeFragment {
  return section(SECTION_ID_FUNCTION, vec(typeidxs));
}

function code(func: BytecodeFragment): BytecodeFragment {
  const sizeInBytes = (func as any[]).flat(Infinity).length;
  return [u32(sizeInBytes), func];
}

function func(
  locals: BytecodeFragment,
  body: BytecodeFragment,
): BytecodeFragment {
  return [vec(locals), body];
}

function codesec(codes: BytecodeFragment): BytecodeFragment {
  return section(SECTION_ID_CODE, vec(codes));
}

function name(s: string): BytecodeFragment {
  return vec(stringToBytes(s));
}

function export_(nm: string, exportdesc: BytecodeFragment): BytecodeFragment {
  return [name(nm), exportdesc];
}

function exportsec(exports: BytecodeFragment): BytecodeFragment {
  return section(SECTION_ID_EXPORT, vec(exports));
}

const funcidx = u32;

const exportdesc = {
  func(idx: number): BytecodeFragment {
    return [0x00, funcidx(idx)];
  },
};

function module(sections): BytecodeFragment {
  return [magic(), version(), sections];
}

enum numtype {
  i32 = 0x7f,
}

const instr = {
  nop: 0x01,
  end: 0x0b,

  local: {
    get: 0x20,
    set: 0x21,
    tee: 0x22,
  },
  i32: {
    const: 0x41,
    add: 0x6a,
    sub: 0x6b,
    mul: 0x6c,
  },
  i64: {
    const: 0x42,
    add: 0x7c,
    sub: 0x7d,
    mul: 0x7e,
  },
  f32: {
    const: 0x43,
    add: 0x92,
    sub: 0x93,
    mul: 0x94,
  },
  f64: {
    const: 0x44,
    add: 0xa0,
    sub: 0xa1,
    mul: 0xa2,
  },
};

const SEVEN_BIT_MASK_BIG_INT = 0b01111111n;
const CONTINUATION_BIT = 0b10000000;

function u32(v: number | bigint): number[] {
  let val = BigInt(v);
  let more = true;
  const r = [];

  while (more) {
    const b = Number(val & SEVEN_BIT_MASK_BIG_INT);
    val = val >> 7n;
    more = val !== 0n;
    if (more) {
      r.push(b | CONTINUATION_BIT);
    } else {
      r.push(b);
    }
  }
  return r;
}

///! START i32-v1 #priv #api #dedent
function i32(v: number | bigint): number[] {
  let val = BigInt(v);
  const r = [];

  let more = true;
  while (more) {
    const b = Number(val & 0b01111111n);
    const signBitSet = !!(b & 0x40);

    val = val >> 7n;

    if ((val === 0n && !signBitSet) || (val === -1n && signBitSet)) {
      more = false;
      r.push(b);
    } else {
      r.push(b | CONTINUATION_BIT);
    }
  }

  return r;
}

function locals(n: number, type: valtype): BytecodeFragment {
  return [u32(n), type];
}

export {
  code,
  codesec,
  export_,
  exportdesc,
  exportsec,
  func,
  funcidx,
  funcsec,
  functype,
  i32,
  instr,
  locals,
  module,
  name,
  section,
  typeidx,
  typesec,
  valtype,
  vec,
};
