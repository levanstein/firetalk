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

    new sst.aws.Nextjs("FireTalk", {
      link: [dataBucket],
      environment: {
        FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY!,
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY!,
        DATA_BUCKET_NAME: dataBucket.name,
      },
    });
  },
});
