import { z } from "zod";

export const secretsToolDefinition = {
  name: "manage_secrets",
  description:
    "Manage encrypted secrets for the current workspace and user. Use to list secrets, get one by id, create, update, or delete a secret. Secret values are always stored encrypted at rest. The list and get actions return masked values only: the first three characters of each secret value followed by ***.",
  inputSchema: z.object({
    action: z
      .enum(["list", "get", "create", "update", "delete"])
      .describe("The action to perform"),
    secretId: z
      .string()
      .optional()
      .describe("Secret ID. Required for get, update, and delete actions."),
    page: z
      .number()
      .optional()
      .default(1)
      .describe("Page number for list action"),
    limit: z
      .number()
      .optional()
      .default(50)
      .describe("Number of items per page for list action"),
    createDetails: z
      .object({
        key: z
          .string()
          .describe("Name of the secret, e.g. OPENAI_API_KEY."),
        value: z
          .string()
          .describe("Plaintext value of the secret. Will be encrypted at rest."),
      })
      .optional()
      .describe("Details for create action"),
    updateDetails: z
      .object({
        key: z
          .string()
          .optional()
          .describe("New name for the secret."),
        value: z
          .string()
          .optional()
          .describe("New plaintext value for the secret. Will be encrypted at rest."),
      })
      .optional()
      .describe("Details for update action. At least one field required."),
  }),
};

export type SecretsToolInput = z.infer<typeof secretsToolDefinition.inputSchema>;

