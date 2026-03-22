import { z } from "zod";
import { Registry } from "@/nodes/core/registry";
import type {
  ConfigFieldDescriptor,
  ConfigFieldType,
  NodeValueType,
  UINodeDefinition,
} from "@/lib/types/workflow-ui";

import "@/nodes/catalog/text.node";
import "@/nodes/catalog/llm.node";
import "@/nodes/catalog/upload-image.node";
import "@/nodes/catalog/upload-video.node";
import "@/nodes/catalog/crop-image.node";
import "@/nodes/catalog/extract-frame.node";

const toTitle = (value: string): string => {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (s) => s.toUpperCase());
};

const unwrapSchema = (
  schema: z.ZodTypeAny,
): { schema: z.ZodTypeAny; required: boolean; defaultValue?: unknown } => {
  let current: z.ZodTypeAny = schema;
  let required = true;
  const defaultValue: unknown = undefined;

  while (true) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      required = false;
      current = current.unwrap() as z.ZodTypeAny;
      continue;
    }

    if (current instanceof z.ZodDefault) {
      required = false;
      current = current.removeDefault() as z.ZodTypeAny;
      continue;
    }

    break;
  }

  return { schema: current, required, defaultValue };
};

const fieldTypeFromSchema = (
  schema: z.ZodTypeAny,
): { fieldType: ConfigFieldType; enumValues?: string[] } | null => {
  if (schema instanceof z.ZodString) {
    return { fieldType: "string" };
  }

  if (schema instanceof z.ZodNumber) {
    return { fieldType: "number" };
  }

  if (schema instanceof z.ZodBoolean) {
    return { fieldType: "boolean" };
  }

  if (schema instanceof z.ZodEnum) {
    return { fieldType: "enum", enumValues: [...schema.options].map((value) => String(value)) };
  }

  return null;
};

const configFieldsFromSchema = (schema: z.ZodTypeAny): ConfigFieldDescriptor[] => {
  if (!(schema instanceof z.ZodObject)) {
    return [];
  }

  const shape = schema.shape;

  const mappedFields: Array<ConfigFieldDescriptor | null> = Object.entries(shape).map(([key, fieldSchema]) => {
      const { schema: unwrapped, required, defaultValue } = unwrapSchema(fieldSchema);
      const mapped = fieldTypeFromSchema(unwrapped);

      if (!mapped) {
        return null;
      }

      return {
        key,
        label: toTitle(key),
        fieldType: mapped.fieldType,
        required,
        defaultValue: defaultValue as string | number | boolean | undefined,
        enumValues: mapped.enumValues,
      } satisfies ConfigFieldDescriptor;
    });

  return mappedFields.filter((field): field is ConfigFieldDescriptor => field !== null);
};

const normalizeHandleType = (type: string): NodeValueType => {
  if (type === "text" || type === "image" || type === "video" || type === "image_array") {
    return type;
  }

  return "unknown";
};

export const getUINodeCatalog = (): UINodeDefinition[] => {
  return Registry.getAll()
    .map((node) => {
      return {
        id: node.id,
        name: node.name,
        description: node.description,
        inputs: node.inputs.map((input) => ({
          id: input.id,
          name: input.name,
          type: normalizeHandleType(input.type),
        })),
        outputs: node.outputs.map((output) => ({
          id: output.id,
          name: output.name,
          type: normalizeHandleType(output.type),
        })),
        configFields: configFieldsFromSchema(node.configSchema),
      } satisfies UINodeDefinition;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};
