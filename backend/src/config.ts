
import axios from "axios";

class EnvConfig {
  private baseUrl: string | null;
  private apiKey: string | null;
  private embeddingDeployment: string | null;
  private llmDeployment: string | null;

  constructor() {
    this.baseUrl = null;
    this.apiKey = null;
    this.embeddingDeployment = null;
    this.llmDeployment = null;
    this.initialize();
  }

  async fetchData() {
    try {
      const response = await axios.get(
        process.env.ENGINE_WILCO_AI_URL as string
      );
      const { baseUrl, apiKey, embeddingDeployment, llmDeployment } =
        response.data;
      return {
        baseUrl,
        apiKey,
        embeddingDeployment,
        llmDeployment,
      };
    } catch (err) {
      console.error(err);
    }
  }

  async initialize() {
    const data: any = await this.fetchData();
    this.baseUrl = data.baseUrl;
    this.apiKey = data.apiKey;
    this.embeddingDeployment = data.embeddingDeployment;
    this.llmDeployment = data.llmDeployment;
  }

  getTokens() {
    return {
      baseUrl: this.baseUrl as string,
      apiKey: this.apiKey as string,
      embeddingDeployment: this.embeddingDeployment as string,
      llmDeployment: this.llmDeployment as string,
    };
  }
}

export const getEnvConfigInstance = async () => {
  const appEnv = new EnvConfig();
  await appEnv.initialize();
  return appEnv.getTokens();
};

export const preConfigMessage = (logger) => {
  logger.info("==============================================================================")
  logger.info("               You are now READY to continue to the next task!                ")
  logger.info("Environment variable MONGODB_CONNECTION_URI is missing and will be added later")
  logger.info("==============================================================================")
}

