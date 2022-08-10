import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Bucket } from "@pulumi/aws/s3";
// import * as awsx from "@pulumi/awsx";

const ch0 = () => {
  const groupDataScience = new aws.iam.Group("dsoaws", {
    /* path: "/users/", */
    name: "DSOAWS",
  });

  const roleDataScience = new aws.iam.Role("dsoaws", {
    name: "DSOAWS",
    managedPolicyArns: [
      'arn:aws:iam::aws:policy/AdministratorAccess',
    ],
    assumeRolePolicy: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Service: "sagemaker.amazonaws.com"
          },
          Action: "sts:AssumeRole"
        },
        {
          Effect: "Allow",
          Principal: {
            AWS: "arn:aws:iam::801881713728:user/dataeng"
          },
          Action: "sts:AssumeRole"
        }
      ]
    },
  });

  const groupPolicyDataScience = new aws.iam.GroupPolicy("dsoaws", {
    group: groupDataScience.name,
    name: "DSOAWS",
    policy: {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PermissionToAssumeDataScienceOnAWS",
          Effect: "Allow",
          Action: ["sts:AssumeRole"],
          Resource: roleDataScience.arn, // "arn:aws:iam::801881713728:role/DataScienceOnAWS"
        }
      ]
    },
  });

  const groupMembershipDataScience = new aws.iam.GroupMembership("dsoaws", {
    users: [
      "dataeng", // pre-existing user in AWS
    ],
    group: groupDataScience.name,
  });

  return {
    groupARNDataScience: pulumi.interpolate`${groupDataScience.arn}`,
    // groupPathDataScience: pulumi.interpolate`${groupDataScience.path}`,
    roleARNDataScience: pulumi.interpolate`${roleDataScience.arn}`,
    groupPolicyIdDataScience: pulumi.interpolate`${groupPolicyDataScience.id}`,
    groupMembershipIdDataScience: pulumi.interpolate`${groupMembershipDataScience.id}`,
  }
}

const ch01_02 = (): { bucketDefaultSageMaker: Bucket } => {
  // Set up S3 buckets
  const callerId = aws.getCallerIdentity({});
  // export const accountId = callerId.then(current => current.accountId);
  const region = aws.getRegion();

  const bucketDefaultSageMaker = new aws.s3.Bucket("sage-maker-default", {
    acl: "private",
    tags: {
      Environment: "Dev",
    },
    forceDestroy: true,
    bucket: pulumi.all([callerId, region]).apply(([c, r]) =>
      `sagemaker-${r.name}-${c.accountId}`
    ),
  });

  return {
    bucketDefaultSageMaker: bucketDefaultSageMaker,
  }
}

// const bucketTSV = new aws.s3.Bucket("AmazonReviewsTSV", {
//     acl: "private",
//     tags: {
//         Environment: "Dev",
//     },
//     bucket: "sagemaker-eu-west-1-801881713728/amazon-reviews-pds/tsv",
//     bucketPrefix:
// });

// export const bucketTSVARN = pulumi.interpolate`${bucketTSV.arn}`;

// const bucketParquet = new aws.s3.Bucket("AmazonReviewsParquet", {
//     acl: "private",
//     tags: {
//         Environment: "Dev",
//     },
//     bucket: "sagemaker-eu-west-1-801881713728/amazon-reviews-pds/parquet",
// });

// export const bucketParquetARN = pulumi.interpolate`${bucketParquet.arn}`;

// Set up Athena database
// const bucketAthena = new aws.s3.Bucket("AthenaStaging", {
//     acl: "private",
//     tags: {
//         Environment: "Dev",
//     },
//     bucket: "sagemaker-eu-west-1-801881713728/athena/staging-pulumi",
//     bucketPrefix: "sagemaker-eu-west-1-801881713728/athena/staging-pulumi",
// });

// export const bucketAthenaARN = pulumi.interpolate`${bucketAthena.arn}`;

const ch_04_02 = (bucket: Bucket) => {
  const dbAthena = new aws.athena.Database(
    "athena",
    {
      name: "dsoaws",
      bucket: bucket.id,
    },
    {
      dependsOn: bucket,
    },
  );

  return {
    dbAthenaId: pulumi.interpolate`${dbAthena.id}`,
  }
}

// const bucketTSV = 's3://sagemaker-eu-west-1-801881713728/amazon-reviews-pds/tsv';
// const bucketParquet = 's3://sagemaker-eu-west-1-801881713728/amazon-reviews-pds/parquet';
// const mkStatementCreateTable = (location: string) =>
//     pulumi.interpolate`
//         CREATE EXTERNAL TABLE IF NOT EXISTS ${dbAthena.name}.amazon_reviews_tsv(
//             marketplace string,
//             customer_id string,
//             review_id string,
//             product_id string,
//             product_parent string,
//             product_title string,
//             product_category string,
//             star_rating int,
//             helpful_votes int,
//             total_votes int,
//             vine string,
//             verified_purchase string,
//             review_headline string,
//             review_body string,
//             review_date string
//         ) ROW FORMAT DELIMITED FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n' LOCATION '${location}'
//         TBLPROPERTIES ('compressionType'='gzip', 'skip.header.line.count'='1')`

// const testKey = new aws.kms.Key("testKey", {
//     deletionWindowInDays: 7,
//     description: "Athena KMS Key",
// });

// const testWorkgroup = new aws.athena.Workgroup("testWorkgroup", {configuration: {
//     resultConfiguration: {
//         encryptionConfiguration: {
//             encryptionOption: "SSE_KMS",
//             kmsKeyArn: testKey.arn,
//         },
//     },
// }});

// const nqCreateDatabaseTableTSV = new aws.athena.NamedQuery("nqCreateDatabaseTableTSV", {
//     workgroup: testWorkgroup.id,
//     database: dbAthena.name,
//     query: mkStatementCreateTable(bucketTSV),
// });

// export const nqCreateDatabaseTableTSVId = pulumi.interpolate`${nqCreateDatabaseTableTSV.id}`;

// const nqCreateDatabaseTableParquet = new aws.athena.NamedQuery("nqCreateDatabaseTableParquet", {
//     workgroup: testWorkgroup.id,
//     database: dbAthena.name,
//     query: mkStatementCreateTable(bucketParquet),
// });

// export const npCreateDatabaseTableParquetId = pulumi.interpolate`${nqCreateDatabaseTableParquet.id}`;

// 06_Create_Redshift_Cluster.ipynb
const ch04_06 = () => {
  const roleRedshift = new aws.iam.Role("redshift", {
    name: 'DSOAWS_Redshift',
    assumeRolePolicy: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "sts:AssumeRole",
          Principal: {
            Service: "redshift.amazonaws.com",
          },
        },
        {
          Effect: "Allow",
          Principal: {
            Service: "sagemaker.amazonaws.com"
          },
          Action: "sts:AssumeRole"
        }
      ]
    },
  });

  // Create Self-Managed Policies
  const rolePolicyRedshiftToS3 = new aws.iam.RolePolicy("redshift-to-s3", {
    role: roleRedshift,
    policy: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "s3:*",
          Resource: "*"
        }
      ]
    },
  })

  const rolePolicyRedshiftToAthena = new aws.iam.RolePolicy("redshift-to-athena", {
    name: "DSOAWS_RedshiftPolicyToAthena",
    role: roleRedshift,
    policy: `{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "athena:*"
                    ],
                    "Resource": [
                        "*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "glue:CreateDatabase",
                        "glue:DeleteDatabase",
                        "glue:GetDatabase",
                        "glue:GetDatabases",
                        "glue:UpdateDatabase",
                        "glue:CreateTable",
                        "glue:DeleteTable",
                        "glue:BatchDeleteTable",
                        "glue:UpdateTable",
                        "glue:GetTable",
                        "glue:GetTables",
                        "glue:BatchCreatePartition",
                        "glue:CreatePartition",
                        "glue:DeletePartition",
                        "glue:BatchDeletePartition",
                        "glue:UpdatePartition",
                        "glue:GetPartition",
                        "glue:GetPartitions",
                        "glue:BatchGetPartition"
                    ],
                    "Resource": [
                        "*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:GetBucketLocation",
                        "s3:GetObject",
                        "s3:ListBucket",
                        "s3:ListBucketMultipartUploads",
                        "s3:ListMultipartUploadParts",
                        "s3:AbortMultipartUpload",
                        "s3:CreateBucket",
                        "s3:PutObject"
                    ],
                    "Resource": [
                        "arn:aws:s3:::aws-athena-query-results-*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:GetObject",
                        "s3:ListBucket"
                    ],
                    "Resource": [
                        "arn:aws:s3:::athena-examples*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:ListBucket",
                        "s3:GetBucketLocation",
                        "s3:ListAllMyBuckets"
                    ],
                    "Resource": [
                        "*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "sns:ListTopics",
                        "sns:GetTopicAttributes"
                    ],
                    "Resource": [
                        "*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "cloudwatch:PutMetricAlarm",
                        "cloudwatch:DescribeAlarms",
                        "cloudwatch:DeleteAlarms"
                    ],
                    "Resource": [
                        "*"
                    ]
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "lakeformation:GetDataAccess"
                    ],
                    "Resource": [
                        "*"
                    ]
                }
            ]
        }`,
  });

  const rolePolicyRedshiftToSagemaker = new aws.iam.RolePolicy("redshift-to-sagemaker", {
    name: "DSOAWS_RedshiftPolicyToSageMaker",
    role: roleRedshift,
    policy: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "sagemaker:*",
          Resource: "*"
        }
      ]
    },
  });

  const rolePolicyPassRoleSagemaker = new aws.iam.RolePolicy("redshift-pass-role-to-sagemaker", {
    name: 'DSOAWS_RedshiftPolicyToSageMakerPassRole',
    role: roleRedshift,
    policy: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "iam:PassRole",
          Resource: 'arn:aws:iam::801881713728:role/*',
        }
      ]
    },
  });

  const secretRedshift = new aws.secretsmanager.Secret("redshift", {
    name: 'dsoaws_redshift_login_1',
    description: 'DSOAWS Redshift Login',
    // tags: {
    //     "Key": "name",
    //     "Value": "dsoaws_redshift_login",
    // },
    recoveryWindowInDays: 0
  });

  const config = new pulumi.Config();
  const usernameRedshift = config.require("redshift_username");
  const passwordRedshift = config.requireSecret("redshift_password");

  const secretVersionRedshift = new aws.secretsmanager.SecretVersion("redshift", {
    secretId: secretRedshift.id,
    secretString: `[{"username":"${usernameRedshift}"},{"password":"${passwordRedshift}"}]`,
  });


  const svRedshiftOut = aws.secretsmanager.getSecretVersionOutput({
    secretId: secretRedshift.id
  });

  const clusterRedshift = new aws.redshift.Cluster("redshift", {
    // # Note that only some Instance Types support Redshift Query Editor
    // # (https://docs.aws.amazon.com/redshift/latest/mgmt/query-editor.html)
    clusterIdentifier: "dsoaws",
    clusterType: "multi-node",
    databaseName: "dsoaws",
    masterUsername: svRedshiftOut.secretString.apply(s => JSON.parse(s)[0].username),
    masterPassword: svRedshiftOut.secretString.apply(s => JSON.parse(s)[1].password),
    nodeType: "dc2.large",
    numberOfNodes: 2,
    // Remove snapshotting as this is not a prod instance
    applyImmediately: true,
    automatedSnapshotRetentionPeriod: 0,
    skipFinalSnapshot: true,
  });

  return {
    clusterARNRedshift: pulumi.interpolate`${clusterRedshift.arn}`,
    roleARNRedshift: pulumi.interpolate`${roleRedshift.arn}`,
    secretIdRedshift: secretRedshift.id,
    secretVersionARNRedshift: pulumi.interpolate`${secretVersionRedshift.arn}`,
  };
}

ch0();
const { bucketDefaultSageMaker } = ch01_02();
ch_04_02(bucketDefaultSageMaker);
// ch04_06();