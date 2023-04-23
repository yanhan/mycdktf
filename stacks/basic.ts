import { Construct } from "constructs";
import { TerraformStack, S3Backend } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { DataAwsAmi } from "@cdktf/provider-aws/lib/data-aws-ami";
import { Instance } from "@cdktf/provider-aws/lib/instance";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { SecurityGroupRule } from "@cdktf/provider-aws/lib/security-group-rule";
import { StandardVpcConstruct, StandardVpcConstructConfig } from "../constructs/vpc";
import * as Constants from "../lib/consts";

const defaultInstanceType = "t2.micro";

export interface BasicStackConfig {
  region: string;
  vpcConfig: StandardVpcConstructConfig;
  s3BackendBucketName: string;
  s3BackendDynamodbTableName: string;
  ec2KeyName: string;
  myIpCidrBlocks: string[];
}

export class BasicStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: BasicStackConfig) {
    super(scope, id);

    new AwsProvider(this, "aws", {
      region: config.region,
    });

    new S3Backend(this, {
      bucket: config.s3BackendBucketName,
      key: `stacks/${id}/basic-stack`,
      encrypt: true,
      region: config.region,
      dynamodbTable: config.s3BackendDynamodbTableName,
    });

    let standardVpc = new StandardVpcConstruct(this, "StandardVpcConstruct", config.vpcConfig);

    let amazonLinuxAmiIds = new DataAwsAmi(this, "amazon-linux-2023-amis", {
      owners: [
        "amazon",
      ],
      filter: [
        {
          name: "name",
          values: [
            "al2023-ami-2023.*-x86_64"
          ],
        },
        {
          name: "virtualization-type",
          values: [
            "hvm",
          ],
        },
      ],
      //nameRegex: "-x864_64$",
      mostRecent: true,
    })

    let securityGroup = new SecurityGroup(this, "basic-ec2-security-group", {
      name: "basic-ec2",
      description: "For basic-ec2",
      vpcId: standardVpc.vpcId,
      tags: {
        Name: "basic-ec2",
        ManagedBy: Constants.CDKTF,
      },
    });

    new SecurityGroupRule(this, "basic-ec2-ingress-allow-ssh-from-my-ip", {
      fromPort: 22,
      protocol: "tcp",
      securityGroupId: securityGroup.id,
      toPort: 22,
      type: Constants.Ingress,
      cidrBlocks: config.myIpCidrBlocks,
      description: "Allow SSH access from my IP address",
    });

    new SecurityGroupRule(this, "basic-ec2-egress-allow-all", {
      fromPort: 0,
      protocol: "all",
      securityGroupId: securityGroup.id,
      toPort: 65535,
      type: Constants.Egress,
      cidrBlocks: [
        Constants.CidrBlockAll,
      ],
      description: "Allow all egress traffic",
    });

    new Instance(this, "basic-ec2", {
      ami: amazonLinuxAmiIds.id,
      associatePublicIpAddress: true,
      // TODO: replace when permanent resources migrated to this repo
      //iamInstanceProfile: "",
      instanceType: defaultInstanceType,
      keyName: config.ec2KeyName,
      subnetId: standardVpc.publicSubnets["a"].id,
      vpcSecurityGroupIds: [
        securityGroup.id,
      ],
      tags: {
        Name: "basic-ec2",
        ManagedBy: Constants.CDKTF,
      },
    });
  }
}
