import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
const code = ts.transpileModule(fs.readFileSync("src/middlewares/auth/LocaleProfileMiddleware.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
function render(status, ready) {
  const states = [status, ready];
  const react = { createElement: (type, props, ...children) => ({ type, props, children }), Fragment: 'fragment', useState: () => [states.shift(), () => {}], useEffect: () => {}, useRef: () => ({ current: null }), useMemo: fn => fn() };
  const modules = { react, 'react-router-dom': { useLocation: () => ({ pathname: '/settings/banks', search: '' }), useNavigate: () => () => {} } };
  const context = vm.createContext({ exports: {}, require: name => modules[name] ?? {} });
  vm.runInContext(code, context);
  return context.exports.LocaleProfileMiddleware({ children: 'persistent-shell' });
}
test('route revalidation keeps an already visible shell mounted', () => {
  const result = render('loading', true);
  assert.equal(result.type, 'fragment');
  assert.equal(result.children[0], 'persistent-shell');
});
test('initial locale validation still gates the shell', () => {
  assert.notEqual(render('loading', false).type, 'fragment');
});
test('required locale redirects still hide the shell', () => {
  assert.notEqual(render('redirecting', true).type, 'fragment');
});
