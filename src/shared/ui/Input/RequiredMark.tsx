/** Decorative required-field marker; the control carries the native/ARIA state. */
export default function RequiredMark() {
  return <span aria-hidden="true" className="ml-0.5 text-red-600">*</span>;
}
