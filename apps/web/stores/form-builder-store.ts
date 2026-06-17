import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { toast } from "sonner";
import type {
  BuilderField,
  BuilderPage,
  BuilderFormSchema,
  FormSettings,
  FormTheme,
  FieldType,
  ConditionalLogic,
  FieldOption,
} from "~/types/form";
import { getDefaultFieldConfig } from "~/lib/field-registry";
import { api } from "~/trpc/server";
import type { RouterInputs } from "@repo/trpc/client";

// Typed inputs from the server router
type CreatePageInput = RouterInputs['forms']['createPage'];
type UpdatePageInput = RouterInputs['forms']['updatePage'];
type CreateFieldInput = RouterInputs['forms']['createField'];
type UpdateFieldInput = RouterInputs['forms']['updateField'];
type ReorderFieldsInput = RouterInputs['forms']['reorderFields'];

/** Strips null values from an object and returns a type where all nulls become undefined. */
function nullToUndefined<T extends Record<string, unknown>>(obj: T): {
  [K in keyof T]: Exclude<T[K], null>;
} {
  const result = { ...obj } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (result[key] === null) {
      delete result[key];
    }
  }
  return result as any;
}

// ============================================================
// STATE & ACTIONS INTERFACE
// ============================================================

export interface FormBuilderState {
  formId: string | null;
  title: string;
  description: string;
  schema: BuilderFormSchema;
  selectedPageId: string | null;
  selectedFieldId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  history: BuilderFormSchema[];
  historyIndex: number;
}

interface FormBuilderActions {
  initializeForm: (data: {
    formId?: string;
    title?: string;
    description?: string;
    pages?: BuilderPage[];
    settings?: Partial<FormSettings>;
    theme?: Partial<FormTheme>;
  }) => void;
  resetForm: () => void;

  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  updateSettings: (settings: Partial<FormSettings>) => void;
  updateTheme: (theme: Partial<FormTheme>) => void;

  addPage: (afterPageId?: string) => Promise<string | undefined>;
  updatePage: (pageId: string, data: Partial<BuilderPage>) => Promise<void>;
  deletePage: (pageId: string) => Promise<void>;
  reorderPages: (pageIds: string[]) => Promise<void>;
  selectPage: (pageId: string | null) => void;

  addField: (pageId: string, type: FieldType, afterFieldId?: string) => Promise<string | undefined>;
  updateField: (fieldId: string, data: Partial<BuilderField>) => Promise<void>;
  deleteField: (fieldId: string) => Promise<void>;
  moveField: (fieldId: string, targetPageId: string, targetIndex: number) => Promise<void>;
  reorderFields: (pageId: string, fieldIds: string[]) => Promise<void>;
  duplicateField: (fieldId: string) => Promise<void>;
  selectField: (fieldId: string | null) => void;

  addFieldOption: (fieldId: string) => void;
  updateFieldOption: (fieldId: string, optionId: string, data: Partial<FieldOption>) => void;
  deleteFieldOption: (fieldId: string, optionId: string) => void;
  reorderFieldOptions: (fieldId: string, optionIds: string[]) => void;

  updateFieldConditionalLogic: (fieldId: string, logic: ConditionalLogic | null) => Promise<void>;
  updatePageConditionalLogic: (pageId: string, logic: ConditionalLogic | null) => Promise<void>;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  markDirty: () => void;
  markClean: () => void;
  setSaving: (isSaving: boolean) => void;
  getFormData: () => { title: string; description: string; schema: BuilderFormSchema };
}

// ============================================================
// DEFAULT VALUES
// ============================================================

const DEFAULT_SETTINGS: FormSettings = {
  allowMultipleSubmissions: false,
  showProgressBar: true,
  shuffleFields: false,
  submitButtonText: "Submit",
  successMessage: "Thank you for your submission!",
  redirectUrl: null,
  closedMessage: "This form is no longer accepting responses.",
  requireLogin: false,
  limitResponses: null,
  startDate: null,
  endDate: null,
  notifyOnResponse: false,
};

const DEFAULT_THEME: FormTheme = {
  primaryColor: "#3b82f6",
  backgroundColor: "#ffffff",
  fontFamily: "Inter",
  borderRadius: "md",
};

function createDefaultPage(): BuilderPage {
  return {
    id: crypto.randomUUID(),
    title: "Page 1",
    description: null,
    position: 0,
    conditionalLogic: null,
    fields: [],
  };
}

function createInitialState(): FormBuilderState {
  const initialPage = createDefaultPage();
  return {
    formId: null,
    title: "Untitled Form",
    description: "",
    schema: {
      pages: [initialPage],
      settings: DEFAULT_SETTINGS,
      theme: DEFAULT_THEME,
    },
    selectedPageId: initialPage.id,
    selectedFieldId: null,
    isDirty: false,
    isSaving: false,
    history: [
      JSON.parse(
        JSON.stringify({ pages: [initialPage], settings: DEFAULT_SETTINGS, theme: DEFAULT_THEME }),
      ),
    ],
    historyIndex: 0,
  };
}

// ============================================================
// HELPER: PUSH HISTORY
// ============================================================
function pushHistory(state: FormBuilderState) {
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(JSON.parse(JSON.stringify(state.schema)));
  state.historyIndex = state.history.length - 1;
}

// ============================================================
// STORE
// ============================================================
export const useFormBuilderStore = create<FormBuilderState & FormBuilderActions>()(
  immer((set, get) => ({
    ...createInitialState(),

    initializeForm: (data) => {
      set((state: FormBuilderState) => {
        state.formId = data.formId ?? null;
        state.title = data.title ?? "Untitled Form";
        state.description = data.description ?? "";
        if (data.pages && data.pages.length > 0) state.schema.pages = data.pages;
        if (data.settings) state.schema.settings = { ...DEFAULT_SETTINGS, ...data.settings };
        if (data.theme) state.schema.theme = { ...DEFAULT_THEME, ...data.theme };
        state.selectedPageId = state.schema.pages[0]?.id ?? null;
        state.selectedFieldId = null;
        state.isDirty = false;
        state.history = [JSON.parse(JSON.stringify(state.schema))];
        state.historyIndex = 0;
      });
    },

    resetForm: () => set(() => createInitialState()),

    setTitle: (title) =>
      set((state: FormBuilderState) => {
        state.title = title;
        state.isDirty = true;
        pushHistory(state);
      }),

    setDescription: (description) =>
      set((state: FormBuilderState) => {
        state.description = description;
        state.isDirty = true;
        pushHistory(state);
      }),

    updateSettings: (partial) =>
      set((state: FormBuilderState) => {
        state.schema.settings = { ...state.schema.settings, ...partial };
        state.isDirty = true;
        pushHistory(state);
      }),

    updateTheme: (partial) =>
      set((state: FormBuilderState) => {
        state.schema.theme = { ...state.schema.theme, ...partial };
        state.isDirty = true;
        pushHistory(state);
      }),

    // ============================================
    // PAGE OPERATIONS
    // ============================================
    addPage: async (afterPageId) => {
      const { formId, schema } = get();
      if (!formId) {
        toast.error("Form not yet saved.");
        return;
      }
      const input: CreatePageInput = {
        formId,
        position: schema.pages.length,
      };
      try {
        const result = await api.forms.createPage.mutate(input);
        set((state: FormBuilderState) => {
          const newPage: BuilderPage = {
            id: result.page.id,
            title: result.page.title,
            description: result.page.description,
            position: result.page.position,
            conditionalLogic: result.page.conditionalLogic,
            fields: [],
          };
          if (afterPageId) {
            const idx = state.schema.pages.findIndex((p) => p.id === afterPageId);
            if (idx !== -1) state.schema.pages.splice(idx + 1, 0, newPage);
            else state.schema.pages.push(newPage);
          } else {
            state.schema.pages.push(newPage);
          }
          state.schema.pages.forEach((p, i) => (p.position = i));
          state.selectedPageId = newPage.id;
          state.isDirty = true;
          pushHistory(state);
        });
        return result.page.id;
      } catch (error: any) {
        toast.error(error.message ?? "Failed to add page");
        return undefined;
      }
    },

    updatePage: async (pageId, data) => {
      const input: UpdatePageInput = nullToUndefined({ pageId, ...data });
      try {
        await api.forms.updatePage.mutate(input);
        set((state: FormBuilderState) => {
          const page = state.schema.pages.find((p) => p.id === pageId);
          if (page) {
            Object.assign(page, data);
            state.isDirty = true;
            pushHistory(state);
          }
        });
      } catch (error: any) {
        toast.error(error.message ?? "Failed to update page");
      }
    },

    deletePage: async (pageId) => {
      const { formId } = get();
      if (!formId) return;
      try {
        await api.forms.deletePage.mutate({ pageId });
        set((state: FormBuilderState) => {
          const idx = state.schema.pages.findIndex((p) => p.id === pageId);
          if (idx !== -1 && state.schema.pages.length > 1) {
            state.schema.pages.splice(idx, 1);
            state.schema.pages.forEach((p, i) => (p.position = i));
            if (state.selectedPageId === pageId) {
              state.selectedPageId = state.schema.pages[0]?.id ?? null;
            }
            state.isDirty = true;
            pushHistory(state);
          }
        });
      } catch (error: any) {
        toast.error(error.message ?? "Failed to delete page");
      }
    },

    reorderPages: async (pageIds) => {
      const { formId } = get();
      if (!formId) return;
      try {
        await api.forms.reorderPages.mutate({ formId, pageIds });
        set((state: FormBuilderState) => {
          const pageMap = new Map(state.schema.pages.map((p) => [p.id, p]));
          state.schema.pages = pageIds.map((id) => pageMap.get(id)!).filter(Boolean);
          state.schema.pages.forEach((p, i) => (p.position = i));
          state.isDirty = true;
          pushHistory(state);
        });
      } catch (error: any) {
        toast.error(error.message ?? "Failed to reorder pages");
      }
    },

    selectPage: (pageId) =>
      set((state: FormBuilderState) => {
        state.selectedPageId = pageId;
        state.selectedFieldId = null;
      }),

    // ============================================
    // FIELD OPERATIONS
    // ============================================
    addField: async (pageId, type, afterFieldId) => {
      const { formId } = get();
      if (!formId) {
        toast.error("Form not yet saved.");
        return;
      }
      const defaultConfig = getDefaultFieldConfig(type);
      const tempName = `temp_${crypto.randomUUID().slice(0, 6)}`;
      const input: CreateFieldInput = nullToUndefined({
        formId,
        pageId,
        type,
        label: defaultConfig.label || type,
        name: tempName,
        placeholder: defaultConfig.placeholder ?? undefined,
        required: defaultConfig.required ?? false,
        validation: defaultConfig.validation ?? undefined,
        options: defaultConfig.options ?? undefined,
        settings: defaultConfig.settings ?? undefined,
      });
      try {
        const result = await api.forms.createField.mutate(input);
        set((state: FormBuilderState) => {
          const page = state.schema.pages.find((p) => p.id === pageId);
          if (page) {
            const newField: BuilderField = {
              id: result.field.id,
              type: result.field.type,
              label: result.field.label,
              name: result.field.name,
              placeholder: result.field.placeholder,
              description: result.field.description,
              required: result.field.required,
              validation: result.field.validation,
              options: result.field.options,
              conditionalLogic: result.field.conditionalLogic,
              position: result.field.position,
              settings: (result.field.settings ?? {}) as BuilderField['settings'],
            };
            if (afterFieldId) {
              const idx = page.fields.findIndex((f) => f.id === afterFieldId);
              if (idx !== -1) page.fields.splice(idx + 1, 0, newField);
              else page.fields.push(newField);
            } else {
              page.fields.push(newField);
            }
            page.fields.forEach((f, i) => (f.position = i));
            state.selectedFieldId = newField.id;
            state.isDirty = true;
            pushHistory(state);
          }
        });
        return result.field.id;
      } catch (error: any) {
        toast.error(error.message ?? "Failed to add field");
        return undefined;
      }
    },

    updateField: async (fieldId, data) => {
      // Optimistic local update (always applied)
      set((state: FormBuilderState) => {
        for (const page of state.schema.pages) {
          const field = page.fields.find((f) => f.id === fieldId);
          if (field) {
            Object.assign(field, data);
            state.isDirty = true;
            pushHistory(state);
            break;
          }
        }
      });

      // If the label is being cleared, don't call the API yet.
      if (data.label !== undefined && data.label.trim().length === 0) {
        return;
      }

      const input: UpdateFieldInput = nullToUndefined({ fieldId, ...data });
      try {
        await api.forms.updateField.mutate(input);
      } catch (error: any) {
        toast.error(error.message ?? "Failed to update field");
      }
    },

    deleteField: async (fieldId) => {
      try {
        await api.forms.deleteField.mutate({ fieldId });
        set((state: FormBuilderState) => {
          for (const page of state.schema.pages) {
            const idx = page.fields.findIndex((f) => f.id === fieldId);
            if (idx !== -1) {
              page.fields.splice(idx, 1);
              page.fields.forEach((f, i) => (f.position = i));
              break;
            }
          }
          if (state.selectedFieldId === fieldId) state.selectedFieldId = null;
          state.isDirty = true;
          pushHistory(state);
        });
      } catch (error: any) {
        toast.error(error.message ?? "Failed to delete field");
      }
    },

    moveField: async (fieldId, targetPageId, targetIndex) => {
      try {
        await api.forms.moveField.mutate({ fieldId, targetPageId, targetIndex });
        const field = get()
          .schema.pages.flatMap((p) => p.fields)
          .find((f) => f.id === fieldId);
        if (!field) return;

        set((state: FormBuilderState) => {
          // Remove from source page
          for (const page of state.schema.pages) {
            const idx = page.fields.findIndex((f) => f.id === fieldId);
            if (idx !== -1) {
              page.fields.splice(idx, 1);
              page.fields.forEach((f, i) => (f.position = i));
              break;
            }
          }
          // Insert into target page
          const targetPage = state.schema.pages.find((p) => p.id === targetPageId);
          if (targetPage) {
            const moved = { ...field, position: targetIndex };
            targetPage.fields.splice(targetIndex, 0, moved);
            targetPage.fields.forEach((f, i) => (f.position = i));
          }
          state.isDirty = true;
          pushHistory(state);
        });
      } catch (error: any) {
        toast.error(error.message ?? "Failed to move field");
      }
    },

    reorderFields: async (pageId, fieldIds) => {
      const input: ReorderFieldsInput = {
        pageId,
        fieldIds,
      };
      try {
        await api.forms.reorderFields.mutate(input);
        set((state: FormBuilderState) => {
          const page = state.schema.pages.find((p) => p.id === pageId);
          if (page) {
            const fieldMap = new Map(page.fields.map((f) => [f.id, f]));
            page.fields = fieldIds.map((id) => fieldMap.get(id)!).filter(Boolean);
            page.fields.forEach((f, i) => (f.position = i));
            state.isDirty = true;
            pushHistory(state);
          }
        });
      } catch (error: any) {
        toast.error(error.message ?? "Failed to reorder fields");
      }
    },

    duplicateField: async (fieldId) => {
      const field = get()
        .schema.pages.flatMap((p) => p.fields)
        .find((f) => f.id === fieldId);
      if (!field || !get().formId) return;
      const pageId = get().schema.pages.find((p) => p.fields.some((f) => f.id === fieldId))?.id;
      if (!pageId) return;

      const input: CreateFieldInput = nullToUndefined({
        formId: get().formId!,
        pageId,
        type: field.type,
        label: field.label,
        name: `${field.name}_copy`,
        placeholder: field.placeholder ?? undefined,
        required: field.required,
        validation: field.validation ?? undefined,
        options: field.options ?? undefined,
        settings: field.settings,
      });
      try {
        const result = await api.forms.createField.mutate(input);
        set((state: FormBuilderState) => {
          const page = state.schema.pages.find((p) => p.id === pageId);
          if (page) {
            const idx = page.fields.findIndex((f) => f.id === fieldId);
            page.fields.splice(idx + 1, 0, {
              ...field,
              id: result.field.id,
              name: result.field.name,
              position: idx + 1,
            });
            page.fields.forEach((f, i) => (f.position = i));
            state.selectedFieldId = result.field.id;
            state.isDirty = true;
            pushHistory(state);
          }
        });
      } catch (error: any) {
        toast.error(error.message ?? "Failed to duplicate field");
      }
    },

    selectField: (fieldId) =>
      set((state: FormBuilderState) => {
        state.selectedFieldId = fieldId;
      }),

    // ============================================
    // FIELD OPTIONS
    // ============================================
    addFieldOption: (fieldId) => {
      set((state: FormBuilderState) => {
        for (const page of state.schema.pages) {
          const field = page.fields.find((f) => f.id === fieldId);
          if (field) {
            if (!field.options) field.options = [];
            field.options.push({
              id: crypto.randomUUID(),
              label: "Option",
              value: `option_${field.options.length + 1}`,
            });
            state.isDirty = true;
            break;
          }
        }
      });
    },

    updateFieldOption: (fieldId, optionId, data) => {
      set((state: FormBuilderState) => {
        for (const page of state.schema.pages) {
          const field = page.fields.find((f) => f.id === fieldId);
          if (field?.options) {
            const opt = field.options.find((o) => o.id === optionId);
            if (opt) {
              if (data.label !== undefined) opt.label = data.label;
              if (data.value !== undefined) opt.value = data.value;
              state.isDirty = true;
              break;
            }
          }
        }
      });
    },

    deleteFieldOption: (fieldId, optionId) => {
      set((state: FormBuilderState) => {
        for (const page of state.schema.pages) {
          const field = page.fields.find((f) => f.id === fieldId);
          if (field?.options) {
            field.options = field.options.filter((o) => o.id !== optionId);
            state.isDirty = true;
            break;
          }
        }
      });
    },

    reorderFieldOptions: (fieldId, optionIds) => {
      set((state: FormBuilderState) => {
        for (const page of state.schema.pages) {
          const field = page.fields.find((f) => f.id === fieldId);
          if (field?.options) {
            const map = new Map(field.options.map((o) => [o.id, o]));
            field.options = optionIds.map((id) => map.get(id)!).filter(Boolean);
            state.isDirty = true;
            break;
          }
        }
      });
    },

    // ============================================
    // CONDITIONAL LOGIC
    // ============================================
    updateFieldConditionalLogic: async (fieldId, logic) => {
      // Only persist to backend if there is at least one condition
      if (logic && logic.conditions.length > 0) {
        try {
          await api.forms.updateField.mutate({
            fieldId,
            conditionalLogic: logic,
          });
        } catch (error: any) {
          toast.error(error.message ?? "Failed to update conditional logic");
          return;
        }
      }
      // Always update local state
      set((state: FormBuilderState) => {
        for (const page of state.schema.pages) {
          const field = page.fields.find((f) => f.id === fieldId);
          if (field) {
            field.conditionalLogic = logic;
            state.isDirty = true;
            pushHistory(state);
            break;
          }
        }
      });
    },

    updatePageConditionalLogic: async (pageId, logic) => {
      try {
        await api.forms.updatePage.mutate({ pageId, conditionalLogic: logic });
        set((state: FormBuilderState) => {
          const page = state.schema.pages.find((p) => p.id === pageId);
          if (page) {
            page.conditionalLogic = logic;
            state.isDirty = true;
            pushHistory(state);
          }
        });
      } catch (error: any) {
        toast.error(error.message ?? "Failed to update page logic");
      }
    },

    // ============================================
    // HISTORY
    // ============================================
    undo: () =>
      set((state: FormBuilderState) => {
        if (state.historyIndex > 0) {
          state.historyIndex--;
          state.schema = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
          state.isDirty = true;
        }
      }),

    redo: () =>
      set((state: FormBuilderState) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          state.schema = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
          state.isDirty = true;
        }
      }),

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    markDirty: () =>
      set((state: FormBuilderState) => {
        state.isDirty = true;
      }),
    markClean: () =>
      set((state: FormBuilderState) => {
        state.isDirty = false;
      }),
    setSaving: (isSaving) =>
      set((state: FormBuilderState) => {
        state.isSaving = isSaving;
      }),
    getFormData: () => {
      const { title, description, schema } = get();
      return { title, description, schema };
    },
  })),
);