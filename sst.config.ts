/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "firetalk",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: "us-east-1",
          profile: "abm-setup",
        },
      },
    };
  },
  async run() {
    // S3 bucket for debate data (JSON + audio)
    const dataBucket = new sst.aws.Bucket("FireTalkData", {
      access: "cloudfront",
    });

    // API keys as SST secrets (set via: npx sst secret set FIRECRAWL_API_KEY <value>)
    const firecrawlKey = new sst.Secret("FirecrawlApiKey", process.env.FIRECRAWL_API_KEY);
    const elevenLabsKey = new sst.Secret("ElevenLabsApiKey", process.env.ELEVENLABS_API_KEY);

    const site = new sst.aws.Nextjs("FireTalk", {
      link: [dataBucket, firecrawlKey, elevenLabsKey],
      environment: {
        FIRECRAWL_API_KEY: firecrawlKey.value,
        ELEVENLABS_API_KEY: elevenLabsKey.value,
        DATA_BUCKET_NAME: dataBucket.name,
      },
      permissions: [
        {
          actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
          resources: ["*"],
        },
      ],
    });
  },
});
