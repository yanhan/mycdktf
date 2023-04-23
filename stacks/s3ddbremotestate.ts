import { Construct } from "constructs";
import { S3Backend, TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { S3BucketPublicAccessBlock } from "@cdktf/provider-aws/lib/s3-bucket-public-access-block";
import { S3BucketServerSideEncryptionConfigurationA } from "@cdktf/provider-aws/lib/s3-bucket-server-side-encryption-configuration";
import { DynamodbTable } from "@cdktf/provider-aws/lib/dynamodb-table";
import * as Constants from "../lib/consts";

export interface S3RemoteStateConfig {
  bucketName: string;
  dynamodbTableName: string;
  region: string;
  storeStateRemotely?: boolean;
  s3BackendBucketName?: string;
  s3BackendDynamodbTableName?: string;
  s3BackendKey?: string;
}

export class S3DDBRemoteStateStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: S3RemoteStateConfig) {
    super(scope, id);

    new AwsProvider(this, "AWS", {
      region: config.region,
    });

    if (config.storeStateRemotely) {
      if (config.s3BackendBucketName === null ||
          config.s3BackendKey === null ||
         config.s3BackendDynamodbTableName === null) {
        throw new Error(`S3DDBRemoteStateStack: when config.useRemoteState is true, all of config.s3BackendKey, config.s3BackendKey, config.s3BackendDynamodbTableName must be provided`);
      }

      new S3Backend(this, {
        bucket: config.s3BackendBucketName ?? "",
        key: config.s3BackendKey ?? "",
        region: config.region,
        encrypt: true,
        dynamodbTable: config.s3BackendDynamodbTableName,
      })
    }

    let s3Bucket = new S3Bucket(this, "S3BackendBucket", {
      bucket: config.bucketName,
      objectLockEnabled: false,
      tags: {
        Name: config.bucketName,
        ManagedBy: Constants.CDKTF,
      },
    });

    new S3BucketPublicAccessBlock(this, "S3BackendBucketPublicAccessBlock", {
      bucket: s3Bucket.id,
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });

    // TODO: Change this to use KMS and S3 Bucket Key
    // https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html
    new S3BucketServerSideEncryptionConfigurationA(this, "S3BackendBucketServerSideEncryptionConfiguration", {
      bucket: s3Bucket.id,
      rule: [
        {
          applyServerSideEncryptionByDefault: {
            sseAlgorithm: "AES256",
          },
        }
      ],
    })

    new DynamodbTable(this, "S3BackendDynamoDBTable", {
      name: config.dynamodbTableName,
      hashKey: "LockID",
      attribute: [
        {
          name: "LockID",
          type: "S",
        },
      ],
      billingMode: "PAY_PER_REQUEST",
      deletionProtectionEnabled: true,
      tags: {
        Name: config.dynamodbTableName,
        ManagedBy: Constants.CDKTF,
      },
    });
  }
}
