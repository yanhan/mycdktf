import { App } from "cdktf";
import { BasicStack } from "./stacks/basic";
import { S3DDBRemoteStateStack } from "./stacks/s3ddbremotestate";
import * as Config from "./mycdktfconfig.json";

const app = new App();

var s3DynamodbForRemoteStateStack = new S3DDBRemoteStateStack(app, "S3DDBRemoteStateInfra", {
  bucketName: Config.bucketName,
  dynamodbTableName: Config.dynamodbTableName,
  region: Config.region,
  storeStateRemotely: true,
  s3BackendBucketName: Config.bucketName,
  s3BackendDynamodbTableName: Config.dynamodbTableName,
  s3BackendKey: "stacks/s3ddbremotestate",
});

if (Config.storeStateRemotely && Config.stacksEnabled.basic) {
  var basicStack = new BasicStack(app, "basic", {
    region: Config.region,
    vpcConfig: {
      cidrBlock: Config.basicVpcCidrBlock,
      name: Config.basicVpcName,
      region: Config.region,
    },
    s3BackendBucketName: Config.bucketName,
    s3BackendDynamodbTableName: Config.dynamodbTableName,
    ec2KeyName: Config.basicStackEc2KeyName,
    myIpCidrBlocks: Config.myIpCidrBlocks,
  });
  basicStack.addDependency(s3DynamodbForRemoteStateStack);
}

app.synth();
