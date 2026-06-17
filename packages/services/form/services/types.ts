// packages/services/form/services/types.ts
export interface FormServiceDependencies {
  triggerWebhooks: (
    formId: string,
    event: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
}