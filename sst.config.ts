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
    new sst.aws.Nextjs("FireTalk", {
      environment: {
        FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY!,
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY!,
      },
    });
  },
});
