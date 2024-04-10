
import "dotenv/config";
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
import {
  MongoClient,
  makeMongoDbEmbeddedContentStore,
  makeMongoDbConversationsService,
  makeDataStreamer,
  AppConfig,
  makeOpenAiChatLlm,
  SystemPrompt,
  makeDefaultFindContent,
  logger,
  makeApp,
  MakeUserMessageFunc,
  UserMessage,
  MakeUserMessageFuncParams,
  makeRagGenerateUserPrompt,
  GenerateUserPromptFunc,
  Embedder,
  EmbedArgs,
  EmbedResult,
} from "mongodb-chatbot-server";

import { getEnvConfigInstance, preConfigMessage } from "./config";

const MONGODB_CONNECTION_URI: string = process.env
  .MONGODB_CONNECTION_URI as string;
const VECTOR_SEARCH_INDEX_NAME: string = process.env
  .VECTOR_SEARCH_INDEX_NAME as string;
const MONGODB_DATABASE_NAME: string = process.env
  .MONGODB_DATABASE_NAME as string;

class SimpleEmbedder implements Embedder {
  openAiClient: any;
  embeddingDeployment: string;

  constructor(openAiClient, embeddingDeployment) {
    this.openAiClient = openAiClient;
    this.embeddingDeployment = embeddingDeployment;
  }

  async embed(query: EmbedArgs): Promise<EmbedResult> {
    try {
      const response = await this.openAiClient.getEmbeddings(
        this.embeddingDeployment,
        [query.text]
      );
      return { embedding: response.data[0].embedding };
    } catch (e) {
      logger.error(`Error embedding query: ${e} \nquery:${query}`);
      return { embedding: [] };
    }
  }
}

const systemPrompt: SystemPrompt = {
  role: "system",
  content: `You are a helpful assistant with great knowledge about movies.
            Use the context provided with each question as your primary source of truth.
            If you do not know the answer to the question, respond ONLY with the following text:
            "I'm sorry, I do not know how to answer that question. Please try to rephrase your query. You can also refer to the further reading to see if it helps."`,
};

const makeUserMessage: MakeUserMessageFunc = async function ({
  originalUserMessage,
  content,
  queryEmbedding,
}: MakeUserMessageFuncParams): Promise<UserMessage> {
  const chunkSeparator = "~~~~~~";
  const context = content.map((c) => c.text).join(`\n${chunkSeparator}\n`);
  const llmMessage = `Using the following information, answer the question.
Different pieces of information are separated by "${chunkSeparator}".

<Information>
${context}
<End information>

<Question>
${originalUserMessage}
<End Question>`;
  return {
    role: "user",
    content: originalUserMessage,
    embedding: queryEmbedding,
    contentForLlm: llmMessage,
  };
};

const setupApp = async () => {
  const envConfig = await getEnvConfigInstance();
  const openAiClient = new OpenAIClient(
    envConfig.baseUrl,
    new AzureKeyCredential(envConfig.apiKey)
  );

  const llm = makeOpenAiChatLlm({
    openAiClient,
    deployment: envConfig.llmDeployment,
    openAiLmmConfigOptions: {
      temperature: 0,
      maxTokens: 1500,
    },
  });

  const embeddedContentStore = makeMongoDbEmbeddedContentStore({
    connectionUri: MONGODB_CONNECTION_URI,
    databaseName: MONGODB_DATABASE_NAME,
  });

  const findContent = makeDefaultFindContent({
    embedder: new SimpleEmbedder(openAiClient, envConfig.embeddingDeployment),
    store: embeddedContentStore,
    findNearestNeighborsOptions: {
      k: 5,
      path: "embedding",
      indexName: VECTOR_SEARCH_INDEX_NAME,
      minScore: 0.9,
    },
  });
  const generateUserPrompt: GenerateUserPromptFunc = makeRagGenerateUserPrompt({
    findContent,
    makeUserMessage,
    makeReferenceLinks: () => [],
  });

  const mongodb = new MongoClient(MONGODB_CONNECTION_URI);

  const conversations = makeMongoDbConversationsService(
    mongodb.db(MONGODB_DATABASE_NAME),
    systemPrompt
  );

  const dataStreamer = makeDataStreamer();

  const appConfig: AppConfig = {
    conversationsRouterConfig: {
      dataStreamer,
      llm,
      conversations,
      generateUserPrompt,
    },
    maxRequestTimeoutMs: 30000,
  };
  return appConfig;
};

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  logger.info("Starting server...");

  const appConfig = await setupApp();
  const app = await makeApp(appConfig);
  const server = app.listen(PORT, () => {
    logger.info(`Server listening on port: ${PORT}`);
  });

  process.on("SIGINT", async () => {
    logger.info("SIGINT signal received");
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        error ? reject(error) : resolve();
      });
    });
    process.exit(1);
  });
};

try {
  if (!process.env.MONGODB_CONNECTION_URI) {
    preConfigMessage(logger);
    process.exit(0);
  }
  startServer();
} catch (e) {
  logger.error(`Fatal error: ${e}`);
  process.exit(1);
}
