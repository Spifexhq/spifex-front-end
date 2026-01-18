// src/components/Modal/Tab.costCenters.tsx

import React from "react";
import type { TFunction } from "i18next";

import Input from "@/shared/ui/Input";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import type { FormData } from "../Modal.types";
import type { Department } from "@/models/settings/departments";
import type { Project } from "@/models/settings/projects";

type Props = {
  t: TFunction;

  formData: FormData;

  departments: Department[];
  selectedDepartments: Department[];
  onDepartmentsChange: (updated: Department[]) => void;

  onPercentageChange: (index: number, value: string) => void;
  percentageSum: number;
  deptPercPrefix: string;

  projects: Project[];
  selectedProject: Project[];
  onProjectChange: (updated: Project[]) => void;

  isFinancialLocked: boolean;
};

const CostCentersTab: React.FC<Props> = ({
  t,
  formData,
  departments,
  selectedDepartments,
  onDepartmentsChange,
  onPercentageChange,
  percentageSum,
  deptPercPrefix,
  projects,
  selectedProject,
  onProjectChange,
  isFinancialLocked,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <SelectDropdown<Department>
          label={t("entriesModal:costCenters.departments")}
          items={departments}
          selected={selectedDepartments}
          onChange={onDepartmentsChange}
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
                  onValueChange={(next) => onPercentageChange(index, next)}
                  disabled={isFinancialLocked}
                  zeroAsEmpty
                />
              </div>
            ))}

            {selectedDepartments.length === 0 && (
              <p className="text-[12px] text-gray-500">{t("entriesModal:costCenters.noneSelected")}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <SelectDropdown<Project>
          label={t("entriesModal:costCenters.projects")}
          items={projects}
          selected={selectedProject}
          onChange={onProjectChange}
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
