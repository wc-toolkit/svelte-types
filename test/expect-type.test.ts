import { describe, it } from "vitest";
import { expectTypeOf } from "expect-type";

describe("appendUndefined type-level behavior", () => {
  it("T | undefined accepts undefined", () => {
    type Result = string | undefined;
    expectTypeOf<Result>().toExtend<string | undefined>();
    expectTypeOf<undefined>().toExtend<Result>();
  });

  it("T | undefined is assignable from T", () => {
    type Result = string | undefined;
    expectTypeOf<string>().toExtend<Result>();
  });

  it("T | undefined | undefined does not produce duplicate undefined", () => {
    type Result = string | undefined | undefined;
    expectTypeOf<Result>().toEqualTypeOf<string | undefined>();
  });

  it("paren-wrapped arrow type with undefined is a valid optional handler", () => {
    type Handler = ((e: string) => void) | undefined;
    expectTypeOf<undefined>().toExtend<Handler>();
    expectTypeOf<(e: string) => void>().toExtend<Handler>();
  });

  it("arrow type without parens + | undefined changes precedence (demonstrates why paren-wrapping is needed)", () => {
    type WithoutParens = (e: string) => void | undefined;
    type WithParens = ((e: string) => void) | undefined;

    expectTypeOf<undefined>().toExtend<WithParens>();
    expectTypeOf<undefined>().not.toExtend<WithoutParens>();
  });

  it("optional prop with | undefined accepts explicit undefined", () => {
    interface WithUndefined {
      prop?: string | undefined;
    }

    expectTypeOf<{ prop: string | undefined }>().toExtend<WithUndefined>();
    expectTypeOf<{ prop: undefined }>().toExtend<WithUndefined>();
  });
});
