// src/components/Modal/Tab.costCenters.tsx

import React, { useCallback, useMemo } from "react";
import type { TFunction } from "i18next";

import Input from "@/shared/ui/Input";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import type { FormData } from "../Modal.types";
import type { Department } from "@/models/settings/departments";
import type { Project } from "@/models/settings/projects";

type Props = {
  t: TFunction;

  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;

  departments: Department[];
  projects: Project[];

  deptPercPrefix: string;
  isFinancialLocked: boolean;
};

function computePercentageSum(percs: Array<string | number>) {
  const nums = percs
    .map((p) => Number(String(p ?? "").replace(",", ".")))
    .filter((n) => Number.isFinite(n));
  const total = nums.reduce((acc, n) => acc + n, 0);
  return Math.round(total * 100) / 100;
}

const CostCentersTab: React.FC<Props> = ({
  t,
  formData,
  setFormData,
  departments,
  projects,
  deptPercPrefix,
  isFinancialLocked,
}) => {
  const selectedDepartments = useMemo(() => {
    const byId = new Map(departments.map((d) => [String(d.id), d]));
    return (formData.costCenters.departments || [])
      .map((id) => byId.get(String(id)))
      .filter(Boolean) as Department[];
  }, [departments, formData.costCenters.departments]);

  const selectedProject = useMemo(() => {
    const id = String(formData.costCenters.projects || "");
    if (!id) return [];
    const found = projects.find((p) => String(p.id) === id);
    return found ? [found] : [];
  }, [projects, formData.costCenters.projects]);

  const percentageSum = useMemo(
    () => computePercentageSum(formData.costCenters.department_percentage || []),
    [formData.costCenters.department_percentage]
  );

  const handleDepartmentChange = useCallback(
    (updated: Department[]) => {
      if (isFinancialLocked) return;

      const departmentIds = updated.map((d) => String(d.id));
      const count = departmentIds.length;

      // Even split with rounding, last item adjusted to guarantee total = 100.00
      const base = count > 0 ? Number((100 / count).toFixed(2)) : 0;
      const percentages = Array.from({ length: count }, () => base);

      const total = percentages.reduce((sum, v) => sum + v, 0);
      const diff = Number((100 - total).toFixed(2));

      if (count > 0) {
        percentages[count - 1] = Number((percentages[count - 1] + diff).toFixed(2));
      }

      setFormData((prev) => ({
        ...prev,
        costCenters: {
          ...prev.costCenters,
          departments: departmentIds,
          department_percentage: percentages.map((n) => n.toFixed(2)),
        },
      }));
    },
    [isFinancialLocked, setFormData]
  );

  const handlePercentageChange = useCallback(
    (index: number, value: string) => {
      if (isFinancialLocked) return;

      setFormData((p) => {
        const percs = [...p.costCenters.department_percentage];
        percs[index] = value;
        return { ...p, costCenters: { ...p.costCenters, department_percentage: percs } };
      });
    },
    [isFinancialLocked, setFormData]
  );

  const handleProjectChange = useCallback(
    (updated: Project[]) => {
      if (isFinancialLocked) return;

      const id = updated.length ? String(updated[0].id) : "";
      setFormData((p) => ({ ...p, costCenters: { ...p.costCenters, projects: id } }));
    },
    [isFinancialLocked, setFormData]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <SelectDropdown<Department>
          label={t("entriesModal:costCenters.departments")}
          items={departments}
          selected={selectedDepartments}
          onChange={handleDepartmentChange}
          getItemKey={(d) => d.id}
          getItemLabel={(d) => d.name || t("entriesModal:costCenters.unnamedDepartment")}
          clearOnClickOutside={false}
          buttonLabel={t("entriesModal:costCenters.departmentsBtn")}
          customStyles={{ maxHeight: "240px" }}
          virtualize
          virtualRowHeight={32}
          virtualThreshold={300}
          disabled={isFinancialLocked}
        />

        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-gray-700">
              {t("entriesModal:costCenters.distribution")}
            </span>

            <span
              className={`text-[11px] px-2 py-[2px] rounded-full border ${
                Math.abs(percentageSum - 100) <= 0.001 && selectedDepartments.length > 0
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {t("entriesModal:costCenters.total", { value: percentageSum || 0 })}
            </span>
          </div>

          <div className="mt-2 max-h-[180px] overflow-y-auto pr-1">
            {selectedDepartments.map((dept, index) => (
              <div key={dept.id} className="mb-3">
                <Input
                  kind="percentage"
                  id={`${deptPercPrefix}${index}`}
                  label={`${t("entriesModal:costCenters.percent")} - ${
                    dept.name || `${t("entriesModal:costCenters.department")} ${dept.id}`
                  }`}
                  name={`department_percentage_${dept.id}`}
                  value={formData.costCenters.department_percentage[index] || ""}
                  onValueChange={(next) => handlePercentageChange(index, next)}
                  disabled={isFinancialLocked}
                  zeroAsEmpty
                />
              </div>
            ))}

            {selectedDepartments.length === 0 && (
              <p className="text-[12px] text-gray-500">
                {t("entriesModal:costCenters.noneSelected")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <SelectDropdown<Project>
          label={t("entriesModal:costCenters.projects")}
          items={projects}
          selected={selectedProject}
          onChange={handleProjectChange}
          getItemKey={(p) => p.id}
          getItemLabel={(p) => p.name || p.code || `${t("entriesModal:costCenters.project")} ${p.id}`}
          buttonLabel={t("entriesModal:costCenters.projectsBtn")}
          clearOnClickOutside={false}
          singleSelect
          customStyles={{ maxHeight: "200px" }}
          virtualize
          virtualRowHeight={32}
          virtualThreshold={300}
          disabled={isFinancialLocked}
        />
      </div>
    </div>
  );
};

export default CostCentersTab;
