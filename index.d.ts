export type Byte = number;
export type Bytes = Byte[];

export type Fragment = Byte | Bytes | Fragment[];

const brand: unique symbol;
type Brand<T, B extends string> = T & { [brand]: B };

export type typeidx = Brand<Bytes, "typeidx">;
export type funcidx = Brand<Bytes, "funcidx">;
export type localidx = Brand<Bytes, "localidx">;
export type globalidx = Brand<Bytes, "globalidx">;
export type tableidx = Brand<Bytes, "tableidx">;
export type labelidx = Brand<Bytes, "labelidx">;
export type memidx = Brand<Bytes, "memidx">;

export function stringToBytes(s: string): Bytes;

export function magic(): Bytes;
export function version(): Bytes;

export function u32(v: number): Bytes;
export function sleb128(v: number | bigint): Bytes;

export function i32(v: number): Bytes;

export function int32ToBytes(v: number): Bytes;

export function section(id: number, contents: Fragment): Fragment;
export function vec<T extends Fragment>(elements: T[]): Fragment;

// Type section
// ------------

export const SECTION_ID_TYPE: number;

export type valtype = Brand<number, "valtype">;

export const valtype: {
  i32: valtype;
  i64: valtype;
  f32: valtype;
  f64: valtype;
};

export function functype(
  paramTypes: valtype[],
  resultTypes: valtype[],
): Fragment;

export function typesec(functypes: Fragment[]): Fragment;

// Function section and indices
// ----------------------------

export const SECTION_ID_FUNCTION: number;

export function typeidx(x: number): typeidx;
export function funcidx(x: number): funcidx;
export function localidx(x: number): localidx;
export function labelidx(x: number): labelidx;
export function tableidx(x: number): tableidx;
export function globalidx(x: number): globalidx;
export function memidx(x: number): memidx;

export function funcsec(typeidxs: typeidx[]): Fragment;

// Code section
// ------------

export const SECTION_ID_CODE: number;

export function code(func: Fragment): Fragment;

export function func(locals: Fragment[], body: Fragment): Fragment;

export function codesec(codes: Fragment[]): Fragment;

// Instructions etc.
// -----------------

export const instr: any;

export const blocktype: { empty: number } & typeof valtype;

// Export section
// --------------

export const SECTION_ID_EXPORT: number;

export function name(s: string): Fragment;

export function export_(nm: string, exportdesc: Fragment): Fragment;

export function exportsec(exports: Fragment[]): Fragment;

export const exportdesc: {
  func(idx: funcidx): Fragment;
  mem(idx: memidx): Fragment;
};

// Module
// ------

export type WasmModule = Fragment[];

export function module(sections: Fragment[]): WasmModule;

// Locals
// ------

export function locals(n: number, type: valtype): Fragment;

// Imports
// -------

export const SECTION_ID_IMPORT: number;

export function import_(mod: string, nm: string, d: Fragment): Fragment;

export function importsec(ims: Fragment[]): Fragment;

export const importdesc: {
  func(x: typeidx): Fragment;
};

// Memory
// ------

export const SECTION_ID_MEMORY: number;

export function memsec(mems: Fragment[]): Fragment;

export function mem(memtype: Fragment): Fragment;

export function memtype(limits: Fragment): Fragment;

export const limits: {
  min(n: number): Fragment;
  minmax(n: number, m: number): Fragment;
};

export function memarg(align: number, offset: number): Fragment;

// Data / custom / names
// ---------------------

export const SECTION_ID_DATA: number;

export function data(x: memidx, e: Fragment, bs: Byte[]): Fragment;

export function datasec(segs: Fragment[]): Fragment;

export const SECTION_ID_CUSTOM: number;

export function custom(nameBytes: Fragment, payload: Fragment): Fragment;
export function customsec(custom: Fragment): Fragment;

export function namesec(namedata: Fragment): Fragment;

export function namedata(
  modulenamesubsec: Fragment,
  funcnamesubsec: Fragment,
  localnamesubsec: Fragment,
): Fragment;

export const CUSTOM_NAME_SUB_SEC_MODULE: number;
export function modulenamesubsec(n: string): Fragment;

export const CUSTOM_NAME_SUB_SEC_FUNC: number;
export function funcnamesubsec(namemap: Fragment): Fragment;

export function namesubsection(N: number, B: Fragment): Fragment;

export function namemap(nameassocs: Fragment[]): Fragment;

export function nameassoc(idx: Fragment, n: string): Fragment;

export const CUSTOM_NAME_SUB_SEC_LOCAL: number;
export function localnamesubsec(indirectnamemap: Fragment): Fragment;

export function indirectnamemap(indirectnameassocs: Fragment[]): Fragment;

export function indirectnameassoc(idx: Fragment, namemap: Fragment): Fragment;

// Start section
// -------------

export const SECTION_ID_START: number;

export const start: (x: number) => funcidx;

export function startsec(st: funcidx): Fragment;

// Globals
// -------

export const SECTION_ID_GLOBAL: number;

export const mut: {
  const: number;
  var: number;
};

export function globaltype(t: valtype, m: number): Fragment;

export function global(gt: Fragment, e: Fragment): Fragment;

export function globalsec(globs: Fragment[]): Fragment;

// Tables / elements
// -----------------

export const SECTION_ID_TABLE: number;

export const elemtype: {
  funcref: number;
};

export function tabletype(et: number, lim: Fragment): Fragment;

export function table(tt: Fragment): Fragment;

export function tablesec(tables: Fragment[]): Fragment;

export const SECTION_ID_ELEMENT: number;

export function elem(x: tableidx, e: Fragment, ys: funcidx[]): Fragment;

export function elemsec(segs: Fragment[]): Fragment;
