import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { api } from "@/core/api/requests";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { getCountries } from "@/lib/location/countries";
import { TIMEZONES } from "@/lib/location/timezonesList";
import type { ConfigurationStatus } from "@/models/auth/configuration";
import { PreferenceSection } from "@/shared/ui/Settings/PreferenceSection";
import { Select } from "@/shared/ui/Select";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";

type Region = { name: string; email?: string; timezone: string; country: string };
const emptyRegion: Region = { name: "", timezone: "", country: "" };
type SetupContext = { configuration: ConfigurationStatus; refreshConfiguration(): Promise<void> };

export default function PersonalLocaleSetup() {
  const { t, i18n } = useTranslation("personalLocaleSetup");
  const { configuration, refreshConfiguration } = useOutletContext<SetupContext>();
  const { isOwner, isEmailVerified, handleInitUser, handleSignOut, user, organization } = useAuthContext();
  const [personalRequired] = useState(() => configuration.personal_locale_setup !== true);
  const [orgRequired] = useState(() => isOwner && configuration.org_locale_setup !== true);
  const countries = useMemo(() => getCountries(i18n.language), [i18n.language]);
  const [personal, setPersonal] = useState<Region>(emptyRegion);
  const [org, setOrg] = useState<Region>(emptyRegion);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { document.title = t("setupTitle"); }, [t]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    const load = async () => {
      try {
        const [personalResult, orgResult] = await Promise.all([
          personalRequired ? api.getPersonalSettings() : Promise.resolve(null),
          orgRequired ? api.getOrganization() : Promise.resolve(null),
        ]);
        if (!active) return;
        if (personalResult) { const data = personalResult.data; setPersonal({ name: data.name, email: data.email, timezone: data.timezone || "", country: (data.country || "").toUpperCase() }); }
        if (orgResult) { const data = orgResult.data; setOrg({ name: data.name, timezone: data.timezone || "", country: (data.country || "").toUpperCase() }); }
      } catch { if (active) setLoadFailed(true); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [personalRequired, orgRequired, retry, user?.id, organization?.organization?.id]);

  const validRegion = (region: Region) => countries.some(c => c.value === region.country) && TIMEZONES.some(z => z.value === region.timezone);
  const valid = !loadFailed && isEmailVerified && (!personalRequired || (!!personal.name.trim() && validRegion(personal))) && (!orgRequired || validRegion(org));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      if (personalRequired) await api.editPersonalSettings({ name: personal.name.trim(), timezone: personal.timezone, country: personal.country });
      if (orgRequired) await api.editOrganization({ timezone: org.timezone, country: org.country });
      await handleInitUser();
      // Only backend-confirmed completion releases the full application layout.
      await refreshConfiguration();
    } catch (error) { setMessage(apiErrorMessage(error, t("toastUpdateError"))); }
    finally { setSaving(false); }
  };

  const fields = (region: Region, update: (region: Region) => void) => <div className="grid min-w-0 gap-5 sm:grid-cols-2">
    <Select label={t("fieldCountry")} items={countries} selected={countries.filter(c => c.value === region.country)} onChange={items => update({ ...region, country: items[0]?.value || "" })} getItemKey={item => item.value} getItemLabel={item => item.label} singleSelect hideCheckboxes clearOnClickOutside={false} buttonLabel={t("fieldCountry")} disabled={saving}/>
    <Select label={t("fieldTimezone")} items={TIMEZONES} selected={TIMEZONES.filter(z => z.value === region.timezone)} onChange={items => update({ ...region, timezone: items[0]?.value || "" })} getItemKey={item => item.value} getItemLabel={item => item.label} singleSelect hideCheckboxes clearOnClickOutside={false} buttonLabel={t("btnLabelTz")} disabled={saving}/>
  </div>;

  return <div className="min-h-dvh bg-[#f7f8fa] text-[#26344a]">
    <header className="border-b border-[#e8ebf0] bg-white"><div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-5 sm:px-8"><span className="text-lg font-semibold tracking-tight text-slate-900">Spifex</span><button type="button" disabled={saving} onClick={async () => { try { await handleSignOut(); } catch (error) { setMessage(apiErrorMessage(error, t("toastUpdateError"))); } }} className="text-xs font-medium text-slate-500 hover:text-slate-900">{t("signOut")}</button></div></header>
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("setupTitle")}</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{t("setupDescription")}</p>
      {loading ? <div className="mt-8"><PageSkeleton variant="fields" rows={4}/></div> : loadFailed ? <div role="alert" className="mt-8 space-y-4 rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm">{t("toastLoadError")}</p><Button variant="outline" onClick={() => setRetry(n => n + 1)}>{t("retry")}</Button></div> : <form onSubmit={save} className="mt-8 space-y-6">
        {personalRequired && <PreferenceSection title={t("personalSection")}><div className="space-y-5 px-5 py-5"><p className="text-xs leading-6 text-slate-500">{t("personalDescription")}</p><Input kind="text" label={t("name")} value={personal.name} onChange={event => setPersonal({ ...personal, name: event.target.value })} maxLength={150} required autoComplete="name" disabled={saving}/><p className="break-all text-xs text-slate-500">{personal.email} · {t(isEmailVerified ? "emailVerified" : "emailUnverified")}</p>{fields(personal, setPersonal)}</div></PreferenceSection>}
        {orgRequired && <PreferenceSection title={t("organizationSection")}><div className="space-y-5 px-5 py-5"><div><p className="text-sm font-medium text-slate-900">{org.name}</p><p className="mt-1 text-xs leading-6 text-slate-500">{t("organizationDescription")}</p></div>{fields(org, setOrg)}</div></PreferenceSection>}
        <p className="text-xs leading-6 text-slate-500">{t("accuracyHint")}</p>
        <div className="flex justify-end border-t border-[#e8ebf0] pt-5"><Button type="submit" isLoading={saving} disabled={!valid || saving}>{t("btnSaveContinue")}</Button></div>
      </form>}
    </main>
    <Snackbar notificationKey={message} open={!!message} onClose={() => setMessage("")} message={message} severity="error" autoHideDuration={6000} showCloseButton/>
  </div>;
}
