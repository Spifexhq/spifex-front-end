import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const element = (type, props) => ({ type, props });
const escapeRegistrations = [];
function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const context = vm.createContext({ exports: {}, document: { body: {} }, window: { useGlobalEsc: (enabled, handler) => escapeRegistrations.push({ enabled, handler }) }, require: name => ({
    react: { useEffect: () => {}, useId: () => 'dialog-test', useRef: () => ({ current: null }) },
    'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'fragment' },
    'react-dom': { createPortal: child => child },
    'framer-motion': { AnimatePresence: 'presence', motion: { div: 'motion' }, useReducedMotion: () => false },
    'lucide-react': { X: 'close-icon' }, '@/shared/ui/useDialogFocus': { useDialogFocus: () => {} },
  })[name] });
  vm.runInContext(code, context);
  return context.exports;
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return;
  if (predicate(node)) return node;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = find(child, predicate);
    if (found) return found;
  }
}
const { default: Dialog, DialogSkeleton } = load('src/components/Modal/FloatingDialog/index.tsx');
const base = { isOpen: true, title: 'Entry', closeLabel: 'Close', onClose() {}, onSubmit() {}, width: 880, height: 670, footer: 'actions' };
test('tab content cannot change configured dialog dimensions; dimensions fit the viewport', () => {
  for (const children of ['Short tab', element('div', { children: Array(200).fill('Long content') })]) {
    const dialog = find(Dialog({ ...base, children }), n => n.props?.role === 'dialog');
    assert.equal(dialog.props.style.width, 'min(880px, 100%)');
    assert.equal(dialog.props.style.height, 'min(670px, calc(100dvh - 3rem))');
  }
});
test('loading and saving disable form controls; footer stays outside the scrollable fieldset', () => {
  for (const state of [{ loading: true }, { busy: true }]) {
    const tree = Dialog({ ...base, ...state, children: 'fields' });
    assert.equal(find(tree, n => n.type === 'fieldset').props.disabled, true);
    assert.match(find(tree, n => n.type === 'fieldset').props.className, /overflow-y-auto/);
    assert.match(find(tree, n => n.type === 'footer').props.className, /shrink-0/);
  }
});
test('skeleton is accessible and supports different form field counts', () => {
  const tree = DialogSkeleton({ label: 'Loading accounts', fields: 5 });
  assert.equal(tree.props.role, 'status');
  assert.equal(tree.props['aria-label'], 'Loading accounts');
  assert.equal(tree.props.children[1].length, 5);
});
test('Escape dismisses the active dialog but cannot interrupt saving or a nested overlay', () => {
  for (const state of [{}, { busy: true }, { overlay: 'nested confirmation' }, { isOpen: false }]) {
    let closed = false;
    const onClose = () => { closed = true; };
    Dialog({ ...base, ...state, onClose, children: 'fields' });
    const registered = escapeRegistrations.at(-1);
    assert.equal(registered.enabled, !state.busy && !state.overlay && state.isOpen !== false);
    assert.equal(registered.handler, onClose);
    if (registered.enabled) registered.handler();
    assert.equal(closed, registered.enabled);
  }
});
test('the boolean switch exposes its label/state and sends the opposite value', () => {
  const Switch = load('src/shared/ui/ToggleSwitch/index.tsx').default;
  for (const checked of [false, true]) {
    let next;
    const tree = Switch({ label: 'Repeat entry', checked, onChange: value => { next = value; } });
    const button = find(tree, n => n.props?.role === 'switch');
    assert.equal(button.props['aria-checked'], checked);
    assert.equal(button.props.type, 'button');
    button.props.onClick();
    assert.equal(next, !checked);
  }
});
test('entry and transfer loading/recovery guidance is translated in every supported language', () => {
  for (const locale of ['en', 'pt', 'fr', 'de']) for (const namespace of ['entriesModal', 'transferenceModal']) {
    const dictionary = JSON.parse(fs.readFileSync(`src/lib/i18n/locales/${locale}/${namespace}.json`, 'utf8'));
    for (const key of ['intro', 'loading', 'retry']) assert.ok(dictionary.guidance[key], `${locale}/${namespace}/${key}`);
  }
});
