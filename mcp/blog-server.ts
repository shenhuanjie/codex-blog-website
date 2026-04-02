import { loadEnvConfig } from "@next/env";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

loadEnvConfig(process.cwd());

const postReferenceSchema = {
  id: z.number().int().positive().optional(),
  slug: z.string().trim().min(1).optional(),
};

const createPostSchema = {
  title: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  content: z.string().min(1),
  cover: z.string().trim().optional(),
  status: z.enum(["draft", "published"]).optional(),
};

const updatePostSchema = {
  ...postReferenceSchema,
  title: z.string().trim().min(1).optional(),
  nextSlug: z.string().trim().min(1).optional(),
  summary: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  content: z.string().min(1).optional(),
  cover: z.string().trim().optional(),
  status: z.enum(["draft", "published"]).optional(),
};

const searchPostsSchema = {
  query: z.string().trim().min(1),
  status: z.enum(["all", "draft", "published"]).optional(),
  limit: z.number().int().positive().max(100).optional(),
};

const publishMarkdownArticleSchema = {
  title: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  existingSlug: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  content: z.string().min(1),
  cover: z.string().trim().optional(),
};

const saveMarkdownDraftSchema = {
  title: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  existingSlug: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  content: z.string().min(1),
  cover: z.string().trim().optional(),
};

const previewMarkdownArticleSchema = {
  title: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  content: z.string().min(1),
  cover: z.string().trim().optional(),
};

function formatResult<T extends Record<string, unknown>>(label: string, data: T): {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: T;
} {
  return {
    content: [
      {
        type: "text",
        text: `${label}\n${JSON.stringify(data, null, 2)}`,
      },
    ],
    structuredContent: data,
  };
}

function formatError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return {
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
    isError: true,
  };
}

async function main() {
  const {
    createManagedPost,
    deleteManagedPost,
    getManagedPost,
    listManagedPosts,
    listManagedTags,
    previewManagedPost,
    publishMarkdownArticle,
    publishManagedPost,
    saveMarkdownDraft,
    saveDraftManagedPost,
    updateManagedPost,
  } = await import("../lib/services/post-publishing");

  const server = new McpServer(
    {
      name: "neonstack-blog-local",
      version: "1.0.0",
    },
    {
      capabilities: {
        logging: {},
      },
    }
  );

  server.registerTool(
    "list_posts",
    {
      description: "List posts from the local blog database. Supports status filtering and a result limit.",
      inputSchema: {
        status: z.enum(["all", "draft", "published"]).optional(),
        limit: z.number().int().positive().max(100).optional(),
      },
    },
    async ({ status, limit }) => {
      try {
        const posts = await listManagedPosts({ status, limit });
        return formatResult("Posts loaded.", { posts });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.registerTool(
    "search_posts",
    {
      description: "Search posts by title, slug, summary, or tags.",
      inputSchema: searchPostsSchema,
    },
    async ({ query, status, limit }) => {
      try {
        const posts = await listManagedPosts({ query, status, limit });
        return formatResult("Matching posts loaded.", { posts });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.registerTool(
    "get_post",
    {
      description: "Get a single post by id or slug from the local blog database.",
      inputSchema: postReferenceSchema,
    },
    async ({ id, slug }) => {
      try {
        if (!id && !slug) {
          throw new Error("Either id or slug is required.");
        }

        const post = await getManagedPost({ id, slug });
        return formatResult("Post loaded.", { post });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.registerTool(
    "create_post",
    {
      description: "Create a new post in the local blog database. Defaults to draft if status is omitted.",
      inputSchema: createPostSchema,
    },
    async (input) => {
      try {
        const post = await createManagedPost(input);
        return formatResult("Post created.", { post });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.registerTool(
    "update_post",
    {
      description: "Update an existing post by id or slug. Only provided fields are changed.",
      inputSchema: updatePostSchema,
    },
    async (input) => {
      try {
        if (!input.id && !input.slug) {
          throw new Error("Either id or slug is required.");
        }

        const post = await updateManagedPost(input);
        return formatResult("Post updated.", { post });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.registerTool(
    "publish_post",
    {
      description: "Publish an existing draft post by id or slug.",
      inputSchema: postReferenceSchema,
    },
    async ({ id, slug }) => {
      try {
        if (!id && !slug) {
          throw new Error("Either id or slug is required.");
        }

        const post = await publishManagedPost({ id, slug });
        return formatResult("Post published.", { post });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.registerTool(
    "save_draft",
    {
      description: "Force an existing post back to draft state by id or slug.",
      inputSchema: postReferenceSchema,
    },
    async ({ id, slug }) => {
      try {
        if (!id && !slug) {
          throw new Error("Either id or slug is required.");
        }

        const post = await saveDraftManagedPost({ id, slug });
        return formatResult("Post saved as draft.", { post });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.registerTool(
    "unpublish_post",
    {
      description: "Unpublish an existing post by id or slug by moving it back to draft status.",
      inputSchema: postReferenceSchema,
    },
    async ({ id, slug }) => {
      try {
        if (!id && !slug) {
          throw new Error("Either id or slug is required.");
        }

        const post = await saveDraftManagedPost({ id, slug });
        return formatResult("Post unpublished and moved back to draft.", { post });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.registerTool(
    "delete_post",
    {
      description: "Delete a post by id or slug.",
      inputSchema: postReferenceSchema,
    },
    async ({ id, slug }) => {
      try {
        if (!id && !slug) {
          throw new Error("Either id or slug is required.");
        }

        const deletedPost = await deleteManagedPost({ id, slug });
        return formatResult("Post deleted.", { deletedPost });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.registerTool(
    "preview_markdown_article",
    {
      description: "Preview a Markdown article before writing it to the database. Returns slug, summary, tags, reading time, and warnings.",
      inputSchema: previewMarkdownArticleSchema,
    },
    async (input) => {
      try {
        const preview = await previewManagedPost(input);
        return formatResult("Markdown article preview generated.", { preview });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.registerTool(
    "save_markdown_draft",
    {
      description: "Create or update a full Markdown article as a draft in one call.",
      inputSchema: saveMarkdownDraftSchema,
    },
    async (input) => {
      try {
        const post = await saveMarkdownDraft(input);
        return formatResult("Markdown article saved as draft.", { post });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.registerTool(
    "publish_markdown_article",
    {
      description: "Create and publish a Markdown article in one call. If existingSlug is provided, update that article and publish it.",
      inputSchema: publishMarkdownArticleSchema,
    },
    async (input) => {
      try {
        const post = await publishMarkdownArticle(input);
        return formatResult("Markdown article published.", { post });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.registerTool(
    "list_tags",
    {
      description: "List all tags currently used by the local blog.",
      inputSchema: {},
    },
    async () => {
      try {
        const tags = await listManagedTags();
        return formatResult("Tags loaded.", { tags });
      } catch (error) {
        return formatError(error);
      }
    }
  );

  server.registerPrompt(
    "draft-technical-post",
    {
      title: "Draft Technical Post",
      description: "Guide an agent through researching duplicates, previewing metadata, and saving a new draft.",
      argsSchema: {
        topic: z.string().describe("Topic or working title for the article"),
        audience: z.string().optional().describe("Target audience, such as frontend engineers or AI infra teams"),
      },
    },
    async ({ topic, audience }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Create a technical blog draft about "${topic}".` +
              `${audience ? ` The target audience is ${audience}.` : ""}\n\n` +
              "Workflow:\n" +
              "1. Call search_posts first to check for overlap.\n" +
              "2. Draft the article in Markdown.\n" +
              "3. Call preview_markdown_article to review slug, summary, tags, and duplicateCandidates.\n" +
              "4. If the preview looks correct, call save_markdown_draft.\n" +
              "5. Return the saved post slug and a short editorial summary.",
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "publish-existing-article",
    {
      title: "Publish Existing Article",
      description: "Guide an agent to update an existing article safely and publish it.",
      argsSchema: {
        slug: z.string().describe("Existing article slug"),
        changeRequest: z.string().describe("What should be revised before publishing"),
      },
    },
    async ({ slug, changeRequest }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Update the article with slug "${slug}" and publish it.\n\n` +
              `Requested changes: ${changeRequest}\n\n` +
              "Workflow:\n" +
              "1. Call get_post with the slug.\n" +
              "2. Revise the Markdown content.\n" +
              "3. Call preview_markdown_article if the title/slug/tags materially changed.\n" +
              "4. Call publish_markdown_article with existingSlug set to the original slug.\n" +
              "5. Return the published slug and a concise changelog.",
          },
        },
      ],
    })
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server failed to start:", error);
  process.exit(1);
});
