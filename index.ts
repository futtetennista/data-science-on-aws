import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
// import * as awsx from "@pulumi/awsx";

const gDataScience = new aws.iam.Group("dsoaws", {
     /* path: "/users/", */
     name: "DSOAWS",
});

export const gDataScienceARN = pulumi.interpolate`${gDataScience.arn}`;
export const gDataSciencePath = pulumi.interpolate`${gDataScience.path}`;

const rDataScience = new aws.iam.Role("dsoaws", {
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

export const rDataScienceARN = pulumi.interpolate`${rDataScience.arn}`;

const gpDataScience = new aws.iam.GroupPolicy("dsoaws", {
    group: gDataScience.name,
    name: "DSOAWS",
    policy: {
        Version: "2012-10-17",
        Statement: [
            {
                Sid: "PermissionToAssumeDataScienceOnAWS",
                Effect: "Allow",
                Action: ["sts:AssumeRole"],
                Resource: rDataScience.arn, // "arn:aws:iam::801881713728:role/DataScienceOnAWS"
            }
        ]
    },
});

export const gpDataScienceId = pulumi.interpolate`${gpDataScience.id}`;

const gmDataScience = new aws.iam.GroupMembership("dsoaws", {
    users: [
        "dataeng", // pre-existing user in AWS
    ],
    group: gDataScience.name,
});

export const gmDataScienceId = pulumi.interpolate`${gmDataScience.id}`;

// Set up S3 buckets
const current = aws.getCallerIdentity({});
export const accountId = current.then(current => current.accountId);

const bucket = new aws.s3.Bucket("bucket", {
    acl: "private",
    tags: {
        Environment: "Dev",
    },
    forceDestroy: true,
    bucket: pulumi.output(current).apply(c => `dsoaws-${c.accountId}`),
});

export const bucketARN = pulumi.interpolate`${bucket.arn}`

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

export const dbAthenaId = pulumi.interpolate`${dbAthena.id}`;

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
const rRedshift = new aws.iam.Role("redshift", {
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

export const roleRedshiftARN = pulumi.interpolate`${rRedshift.arn}`;

// Create Self-Managed Policies
const pRedshiftToS3 = new aws.iam.RolePolicy("redshift-to-s3", {
    role: rRedshift,
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

const pRedshiftAthena = new aws.iam.RolePolicy("redshift-to-athena", {
    name: "DSOAWS_RedshiftPolicyToAthena",
    role: rRedshift,
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

const pSagemaker = new aws.iam.RolePolicy("redshift-to-sagemaker", {
    name: "DSOAWS_RedshiftPolicyToSageMaker",
    role: rRedshift,
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

const pPassRoleSagemaker = new aws.iam.RolePolicy("redshift-psss-role-to-sagemaker", {
    name: 'DSOAWS_RedshiftPolicyToSageMakerPassRole',
    role: rRedshift,
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

// const rpaAssumeRoleRedshift2Sagemaker = new aws.iam.RolePolicyAttachment("rpaAssumeRoleRedshift2Sagemaker", {
//     role: rRedshift.name,
//     policyArn: pAssumeRoleRedshift2Sagemaker.arn,
// });

