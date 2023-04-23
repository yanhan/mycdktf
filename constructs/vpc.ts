import { Construct } from "constructs";
import { Eip } from "@cdktf/provider-aws/lib/eip";
import { InternetGateway } from "@cdktf/provider-aws/lib/internet-gateway";
import { NatGateway } from "@cdktf/provider-aws/lib/nat-gateway";
import { Route } from "@cdktf/provider-aws/lib/route";
import { RouteTableAssociation } from "@cdktf/provider-aws/lib/route-table-association";
import { RouteTable } from "@cdktf/provider-aws/lib/route-table";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import * as Constants from "../lib/consts";

const defaultSubnetOctets = 12;

export interface StandardVpcConstructConfig {
  cidrBlock: string;
  name: string;
  region: string;
  subnetOctets?: number;
}

export interface PublicSubnetDetails {
  id: string;
}

export class StandardVpcConstruct extends Construct {
  publicSubnets: Record<string, PublicSubnetDetails> = {};
  vpcId: string;

  constructor(scope: Construct, id: string, config: StandardVpcConstructConfig) {
    super(scope, id);

    let vpc = new Vpc(this, "vpc", {
      cidrBlock: config.cidrBlock,
      enableDnsSupport: true,
      enableDnsHostnames: true,
      tags: {
        Name: config.name,
        ManagedBy: Constants.CDKTF,
      },
    });

    this.vpcId = vpc.id;

    let igw = new InternetGateway(this, "igw", {
      vpcId: vpc.id,
      tags: {
        Name: `${config.name}`,
        ManagedBy: Constants.CDKTF,
      },
    });

    let subnetOctets = config.subnetOctets ?? defaultSubnetOctets;

    // Public subnets
    let publicSubnetA = new Subnet(this, "public-a", {
      availabilityZone: `${config.region}a`,
      cidrBlock: this.allocateSubnetCidrBlock(config.cidrBlock, subnetOctets, 0),
      enableResourceNameDnsARecordOnLaunch: true,
      mapPublicIpOnLaunch: true,
      vpcId: vpc.id,
      tags: {
        Name: `${config.name}-public-a`,
        ManagedBy: Constants.CDKTF,
      },
    });

    let publicSubnetB = new Subnet(this, "public-b", {
      availabilityZone: `${config.region}b`,
      cidrBlock: this.allocateSubnetCidrBlock(config.cidrBlock, subnetOctets, 1),
      enableResourceNameDnsARecordOnLaunch: true,
      mapPublicIpOnLaunch: true,
      vpcId: vpc.id,
      tags: {
        Name: `${config.name}-public-b`,
        ManagedBy: Constants.CDKTF,
      },
    });

    let publicSubnetC = new Subnet(this, "public-c", {
      availabilityZone: `${config.region}c`,
      cidrBlock: this.allocateSubnetCidrBlock(config.cidrBlock, subnetOctets, 2),
      enableResourceNameDnsARecordOnLaunch: true,
      mapPublicIpOnLaunch: true,
      vpcId: vpc.id,
      tags: {
        Name: `${config.name}-public-c`,
        ManagedBy: Constants.CDKTF,
      },
    });

    let publicRouteTable = new RouteTable(this, "public", {
      vpcId: vpc.id,
      tags: {
        Name: `${config.name}-public`,
        ManagedBy: Constants.CDKTF,
      },
    });

    new Route(this, "public-subnets-to-internet", {
      routeTableId: publicRouteTable.id,
      destinationCidrBlock: Constants.CidrBlockAll,
      gatewayId: igw.id,
    });

    new RouteTableAssociation(this, "subnet-public-a-to-public-route-table", {
      subnetId: publicSubnetA.id,
      routeTableId: publicRouteTable.id,
    });

    new RouteTableAssociation(this, "subnet-public-b-to-public-route-table", {
      subnetId: publicSubnetB.id,
      routeTableId: publicRouteTable.id,
    });

    new RouteTableAssociation(this, "subnet-public-c-to-public-route-table", {
      subnetId: publicSubnetC.id,
      routeTableId: publicRouteTable.id,
    });

    // Private subnets
    let privateSubnetA = new Subnet(this, "private-a", {
      availabilityZone: `${config.region}a`,
      cidrBlock: this.allocateSubnetCidrBlock(config.cidrBlock, subnetOctets, 3),
      enableResourceNameDnsARecordOnLaunch: true,
      vpcId: vpc.id,
      tags: {
        Name: `${config.name}-private-a`,
        ManagedBy: Constants.CDKTF,
      },
    });

    let privateSubnetB = new Subnet(this, "private-b", {
      availabilityZone: `${config.region}b`,
      cidrBlock: this.allocateSubnetCidrBlock(config.cidrBlock, subnetOctets, 4),
      enableResourceNameDnsARecordOnLaunch: true,
      vpcId: vpc.id,
      tags: {
        Name: `${config.name}-private-b`,
        ManagedBy: Constants.CDKTF,
      },
    });

    let privateSubnetC = new Subnet(this, "private-c", {
      availabilityZone: `${config.region}c`,
      cidrBlock: this.allocateSubnetCidrBlock(config.cidrBlock, subnetOctets, 5),
      enableResourceNameDnsARecordOnLaunch: true,
      vpcId: vpc.id,
      tags: {
        Name: `${config.name}-private-c`,
        ManagedBy: Constants.CDKTF,
      },
    });

    let eip = new Eip(this, "nat-gateway-eip", {
      vpc: true,
      tags: {
        Name: `${config.name}-nat-gateway`,
        ManagedBy: Constants.CDKTF,
      },
    });

    let natGateway = new NatGateway(this, "nat-gateway", {
      allocationId: eip.allocationId,
      connectivityType: "public",
      subnetId: publicSubnetA.id,
      tags: {
        Name: `${config.name}-nat-gateway`,
        ManagedBy: Constants.CDKTF,
      },
      dependsOn: [
        igw,
      ],
    });

    let privateRouteTable = new RouteTable(this, "private", {
      vpcId: vpc.id,
      tags: {
        Name: `${config.name}-private`,
        ManagedBy: Constants.CDKTF,
      },
    });

    new Route(this, "private-subnets-to-internet", {
      routeTableId: privateRouteTable.id,
      destinationCidrBlock: Constants.CidrBlockAll,
      natGatewayId: natGateway.id,
    });

    new RouteTableAssociation(this, "subnet-private-a-to-private-route-table", {
      subnetId: privateSubnetA.id,
      routeTableId: privateRouteTable.id,
    });

    new RouteTableAssociation(this, "subnet-private-b-to-private-route-table", {
      subnetId: privateSubnetB.id,
      routeTableId: privateRouteTable.id,
    });

    new RouteTableAssociation(this, "subnet-private-c-to-private-route-table", {
      subnetId: privateSubnetC.id,
      routeTableId: privateRouteTable.id,
    });

    this.publicSubnets = {
      a: { id: publicSubnetA.id },
      b: { id: publicSubnetB.id },
      c: { id: publicSubnetC.id },
    };
  }

  // Assumes cidrBlock is /16
  // TODO:
  // - add unit test when under less time pressure. Shift to some other file
  // - More error checking
  // - Generalize to go beyond current sizing
  allocateSubnetCidrBlock(cidrBlock: string, subnetOctets: number, index: number): string {
    if (subnetOctets < 8 || subnetOctets > 15) {
      throw new Error("allocateSubnetCidrBlock: subnetOctets must be between 8 and 15 inclusive");
    }
    let octetStrings = cidrBlock.split(".");
    let octets = [];
    if (octetStrings.length != 4) {
      throw new Error("allocateSubnetCidrBlock: invalid cidrBlock")
    }
    // Trim off the '/X' from last octet
    octetStrings[3] = octetStrings[3].split("/")[0];
    for (let i = 0; i < 4; i++) {
      let o = parseInt(octetStrings[i], 10);
      if (isNaN(o)) {
        throw new Error("allocateSubnetCidrBlock: invalid cidrBlock");
      }
      octets.push(o);
    }
    // Erase final octet as it is not within consideration for now
    octets[3] = 0;
    let imptOctet = octets[2] & 255;
    let octetsToPreserve = 16 - subnetOctets;
    let shift = 8 - octetsToPreserve;
    // NOTE: no error checking here on index...
    octets[2] = ((imptOctet >> shift) | index) << shift;
    return `${octets.map( o => o.toString() ).join(".")}/${32 - subnetOctets}`;
  }
}
