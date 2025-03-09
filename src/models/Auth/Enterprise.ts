export type Owner = {
  name: string;
  email: string;
};

export type Enterprise = {
  id: number;
  name: string;
  owner: Owner;
};

export type ApiGetEnterprise = {
  enterprise: Enterprise;
};
