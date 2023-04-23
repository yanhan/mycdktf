# About

Use CDKTF to setup infrastructure that we use on a mostly ephemeral basis on AWS.

NOTE: This repository is in a very early state and probably contains many bad practices.


## Initialize repo

```
cdktf get
```


## Setup config file

```
cp config.example.json mycdktfconfig.json
```

Then edit the values in `mycdktfconfig.json`.



## First run: create S3 and DynamoDB

On the first run, the state file will be stored locally. We have to create the S3 and DynamoDB table to store state remotely.

In `mycdktfconfig.json`, ensure that the `storeStateRemotely` is set to false:
```
{
  // Other key value pairs omitted

  "storeStateRemotely": false,

  // Other values omitted
}
```
Then run:
```
cdktf synth
avsa -- cdktf deploy
```

### Migrate local state to S3

```
cd cdktf.out/stacks/S3DDBRemoteStateInfra
avsa -- terraform init -migrate-state
```

Then you can delete the local state files.


## Enabling stacks

In `mycdktfconfig.json`, there is a key `stacksEnabled`. The key value pairs in this object allow you to enable / disable different stacks.

When adding new stacks, please also add a new key value pair under `stacksEnabled` for easier toggling.


## Deploy

```
cdktf synth
avsa -- cdktf deploy '*'
```


## Gotchas

For S3 backend, all its config, including bucket name, key and dynamodb table name cannot depend on resources to be Terraformed.


## TODO

Use gitcrypt or similar to store secret config information in a json file that is then read by the main.ts


## License

Copyright 2023 Pang Yan Han, under the [3-Clause BSD License](/LICENSE).
