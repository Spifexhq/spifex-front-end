import BillingContent from "@/features/account-settings/pages/Billing";

/**
 * Business settings pages are hosted inside SettingsSurface, which provides
 * the standard settings-page spacing through this root class. Keep the shared
 * billing content product-neutral while matching the Business settings frame.
 */
export default function Billing() {
  return (
    <main className="settings-page">
      <BillingContent />
    </main>
  );
}
