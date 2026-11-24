import assert from "node:assert/strict";
import test from "node:test";

import { currencyDigits } from "../src/lib/currency/digits";

test("currencyDigits follows ISO exponent exceptions", () => {
  assert.equal(currencyDigits("EUR"), 2);
  assert.equal(currencyDigits("usd"), 2);
  assert.equal(currencyDigits("JPY"), 0);
  assert.equal(currencyDigits("KWD"), 3);
  assert.equal(currencyDigits("CLF"), 4);
  assert.equal(currencyDigits(""), 2);
  assert.equal(currencyDigits(undefined), 2);
});
