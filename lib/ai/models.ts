// Define your models here.

export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
}

export const models: Array<Model> = [
  {
    id: 'gpt-4o-mini',
    label: 'Star Trader',
    apiIdentifier: 'gpt-4o-mini',
    description: 'Star Trader - For all your Star Citizen Trading Needs.',
  },
] as const;

export const DEFAULT_MODEL_NAME: string = 'gpt-4o-mini';
