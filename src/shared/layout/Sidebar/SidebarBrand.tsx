export default function SidebarBrand({ product }: { product: "Enterprise" | "Personal" }) {
  return (
    <p className="text-[15px] font-semibold tracking-tight text-gray-900">
      Spifex <span className="font-normal text-gray-500">{product}</span>
    </p>
  );
}
