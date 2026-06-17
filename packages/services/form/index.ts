// packages/services/form/index.ts
import { FormCrudService } from "./services/form-crud.service";
import { PageService } from "./services/page.service";
import { FieldService } from "./services/field.service";
import { ResponseService } from "./services/response.service";
import { WebhookService } from "./services/webhook.service";
import { AnalyticsService } from "./services/analytics.service";
import { TemplateService } from "./services/template.service";
import type { FormServiceDependencies } from "./services/types";

class FormService {
  // Services
  public readonly crud: FormCrudService;
  public readonly pages: PageService;
  public readonly fields: FieldService;
  public readonly responses: ResponseService;
  public readonly webhooks: WebhookService;
  public readonly analytics: AnalyticsService;
  public readonly templates: TemplateService;

  // Delegating methods (declared as properties, assigned in constructor)
  createForm!: (userId: string, ...args: any[]) => ReturnType<FormCrudService["createForm"]>;
  getFormById!: FormCrudService["getFormById"];
  getFormByIdNoAuth!: FormCrudService["getFormByIdNoAuth"];
  getFullById!: FormCrudService["getFullById"];
  getFormBySlug!: FormCrudService["getFormBySlug"];
  listUserForms!: FormCrudService["listUserForms"];
  updateForm!: FormCrudService["updateForm"];
  publishForm!: FormCrudService["publishForm"];
  closeForm!: FormCrudService["closeForm"];
  archiveForm!: FormCrudService["archiveForm"];
  deleteForm!: FormCrudService["deleteForm"];
  duplicateForm!: FormCrudService["duplicateForm"];

  createPage!: PageService["createPage"];
  updatePage!: PageService["updatePage"];
  deletePage!: PageService["deletePage"];
  reorderPages!: PageService["reorderPages"];

  createField!: FieldService["createField"];
  updateField!: FieldService["updateField"];
  deleteField!: FieldService["deleteField"];
  reorderFields!: FieldService["reorderFields"];
  moveField!: FieldService["moveField"];

  submitResponse!: ResponseService["submitResponse"];
  listResponses!: ResponseService["listResponses"];
  getResponse!: ResponseService["getResponse"];
  deleteResponse!: ResponseService["deleteResponse"];

  createWebhook!: WebhookService["createWebhook"];
  testWebhook!: WebhookService["testWebhook"];
  listWebhooks!: WebhookService["listWebhooks"];
  updateWebhook!: WebhookService["updateWebhook"];
  deleteWebhook!: WebhookService["deleteWebhook"];
  getWebhookLogs!: WebhookService["getWebhookLogs"];

  getAnalytics!: AnalyticsService["getAnalytics"];
  recordAnalytics!: AnalyticsService["recordAnalytics"];

  applyTemplate!: TemplateService["applyTemplate"];
  saveAsTemplate!: TemplateService["saveAsTemplate"];
  listTemplates!: TemplateService["listTemplates"];
  listUserTemplates!: TemplateService["listUserTemplates"];
  deleteTemplate!: TemplateService["deleteTemplate"];

  constructor() {
    // Instantiate services
    this.webhooks = new WebhookService();

    const deps: FormServiceDependencies = {
      triggerWebhooks: (formId, event, payload) =>
        this.webhooks.triggerWebhooks(formId, event, payload),
    };

    this.crud = new FormCrudService(deps);
    this.responses = new ResponseService(deps);
    this.pages = new PageService();
    this.fields = new FieldService();
    this.analytics = new AnalyticsService();
    this.templates = new TemplateService();

    // Now bind all delegating methods
    this.createForm = this.crud.createForm.bind(this.crud);
    this.getFormById = this.crud.getFormById.bind(this.crud);
    this.getFormByIdNoAuth = this.crud.getFormByIdNoAuth.bind(this.crud);
    this.getFullById = this.crud.getFullById.bind(this.crud);
    this.getFormBySlug = this.crud.getFormBySlug.bind(this.crud);
    this.listUserForms = this.crud.listUserForms.bind(this.crud);
    this.updateForm = this.crud.updateForm.bind(this.crud);
    this.publishForm = this.crud.publishForm.bind(this.crud);
    this.closeForm = this.crud.closeForm.bind(this.crud);
    this.archiveForm = this.crud.archiveForm.bind(this.crud);
    this.deleteForm = this.crud.deleteForm.bind(this.crud);
    this.duplicateForm = this.crud.duplicateForm.bind(this.crud);

    this.createPage = this.pages.createPage.bind(this.pages);
    this.updatePage = this.pages.updatePage.bind(this.pages);
    this.deletePage = this.pages.deletePage.bind(this.pages);
    this.reorderPages = this.pages.reorderPages.bind(this.pages);

    this.createField = this.fields.createField.bind(this.fields);
    this.updateField = this.fields.updateField.bind(this.fields);
    this.deleteField = this.fields.deleteField.bind(this.fields);
    this.reorderFields = this.fields.reorderFields.bind(this.fields);
    this.moveField = this.fields.moveField.bind(this.fields);

    this.submitResponse = this.responses.submitResponse.bind(this.responses);
    this.listResponses = this.responses.listResponses.bind(this.responses);
    this.getResponse = this.responses.getResponse.bind(this.responses);
    this.deleteResponse = this.responses.deleteResponse.bind(this.responses);

    this.createWebhook = this.webhooks.createWebhook.bind(this.webhooks);
    this.testWebhook = this.webhooks.testWebhook.bind(this.webhooks);
    this.listWebhooks = this.webhooks.listWebhooks.bind(this.webhooks);
    this.updateWebhook = this.webhooks.updateWebhook.bind(this.webhooks);
    this.deleteWebhook = this.webhooks.deleteWebhook.bind(this.webhooks);
    this.getWebhookLogs = this.webhooks.getWebhookLogs.bind(this.webhooks);

    this.getAnalytics = this.analytics.getAnalytics.bind(this.analytics);
    this.recordAnalytics = this.analytics.recordAnalytics.bind(this.analytics);

    this.applyTemplate = this.templates.applyTemplate.bind(this.templates);
    this.saveAsTemplate = this.templates.saveAsTemplate.bind(this.templates);
    this.listTemplates = this.templates.listTemplates.bind(this.templates);
    this.listUserTemplates = this.templates.listUserTemplates.bind(this.templates);
    this.deleteTemplate = this.templates.deleteTemplate.bind(this.templates);
  }
}

export const formService = new FormService();