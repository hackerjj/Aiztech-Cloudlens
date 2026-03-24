# CloudLens — Architecture & Technology Documentation

## Overview

CloudLens is a real-time photo wall application for the AI Immersion Roadshow 2026 event. Attendees upload photos that are analyzed by AI (Amazon Rekognition), auto-captioned, tagged with hashtags, and displayed on a shared wall visible to all participants.

## Technology Stack

### Frontend
- **React 19** with TypeScript — Single Page Application (SPA)
- **Tailwind CSS 4** — Utility-first styling with custom Mission Impossible theme
- **Vite 7** — Build tool with `vite-plugin-singlefile` to produce a single HTML file
- The entire frontend compiles into one `index.html` (JS + CSS inlined) for simple deployment

### Backend
- **Node.js 20** with Express.js — REST API server
- **Multer** — Multipart file upload handling
- **Amazon Rekognition** — Image analysis (DetectLabels + DetectModerationLabels)
- **File-based storage** — `data.json` for users/posts, `uploads/` for images

### Infrastructure
- **AWS Elastic Beanstalk** — Managed deployment on Amazon Linux 2023
- **Single Instance** environment (t3.micro) — no load balancer needed for event scale
- **Region**: us-east-1
- **Account**: 050451374957

## Architecture Diagram

```
[Mobile/Browser] --> [Elastic Beanstalk (Node.js)]
                          |
                          |--> Express.js API
                          |     |- POST /api/login
                          |     |- POST /api/accept-tc
                          |     |- POST /api/posts (upload + Rekognition)
                          |     |- GET  /api/posts
                          |     |- POST /api/posts/:id/like
                          |     |- GET  /api/stats
                          |     |- GET  /api/admin/export
                          |
                          |--> Static files (SPA + uploads)
                          |
                          |--> Amazon Rekognition
                                |- DetectLabels (auto-caption + hashtags)
                                |- DetectModerationLabels (content safety)
```

## How It Works

### 1. Authentication
- User enters username + event code (`2026AIR`)
- Optional geofencing validates user is within 300m of venue (configurable)
- User data stored in `data.json`

### 2. Terms & Conditions
- User must scroll through and accept T&C before accessing the wall
- Acceptance recorded server-side via `/api/accept-tc`

### 3. Photo Upload Flow
1. User selects one or more photos from device
2. Frontend resizes images to max 1200x1200 at 85% JPEG quality
3. SHA-256 hash computed client-side for duplicate detection
4. Image uploaded via multipart POST to `/api/posts`
5. Server receives image and sends bytes to **Amazon Rekognition**:
   - `DetectLabels`: identifies objects, scenes, people (up to 15 labels, 70% confidence)
   - `DetectModerationLabels`: checks for inappropriate content
6. Server generates caption from detected labels using rule-based mapping
7. Server generates hashtags combining event tags + detected content tags
8. Post saved with caption, hashtags, labels, and approval status
9. If moderation flags content, `isApproved` is set to false

### 4. Photo Wall
- Masonry-style layout using CSS columns
- Hover reveals caption, username, hashtags, and like count
- Full-screen photo viewer with detected labels shown as tags
- Auto-refresh every 10 seconds
- Slideshow mode for display screens

### 5. Admin Features
- Users with username starting with "admin" get admin role
- Export all approved photos as JSON

## IAM Permissions

The EC2 instance role `aws-elasticbeanstalk-ec2-role` has:
- `AWSElasticBeanstalkWebTier` — standard EB permissions
- `AWSElasticBeanstalkMulticontainerDocker` — container support
- `AmazonRekognitionReadOnlyAccess` — Rekognition DetectLabels + DetectModerationLabels

## Deployment Guide

### Prerequisites
1. AWS CLI installed and configured
2. Midway authentication: `mwinit -o`
3. Isengard credentials exported as environment variables

### Deploy Steps

```bash
# 1. Get credentials from Isengard and export them
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...

# 2. Build the frontend (from workspace root)
cd redesign-mission-impossible-theme
npm install
npm run build

# 3. Copy built SPA to server public folder
cp dist/index.html ../mission-impossible-wall/public/index.html

# 4. Install server dependencies
cd ../mission-impossible-wall
npm install

# 5. Create deployment ZIP (include node_modules for Rekognition SDK)
zip -r /tmp/cloudlens-deploy.zip . \
  -x "uploads/*" "data.json" "deploy.sh" "setup-eb.sh" \
  "create-env.sh" "*.zip" ".git/*" ".DS_Store"

# 6. Upload to S3
aws s3 cp /tmp/cloudlens-deploy.zip \
  s3://cloudlens-app-050451374957/cloudlens-deploy.zip \
  --region us-east-1

# 7. Create new version
aws elasticbeanstalk create-application-version \
  --application-name cloudlens \
  --version-label vX-description \
  --source-bundle S3Bucket="cloudlens-app-050451374957",S3Key="cloudlens-deploy.zip" \
  --region us-east-1

# 8. Deploy to environment
aws elasticbeanstalk update-environment \
  --application-name cloudlens \
  --environment-name cloudlens-prod2 \
  --version-label vX-description \
  --region us-east-1

# 9. Check status (wait ~30s)
aws elasticbeanstalk describe-environments \
  --application-name cloudlens \
  --environment-names cloudlens-prod2 \
  --region us-east-1 \
  --query "Environments[0].{Status:Status,Health:Health,Version:VersionLabel}"
```

### Environment Setup (first time only)

```bash
# Create EB application
aws elasticbeanstalk create-application --application-name cloudlens --region us-east-1

# Create instance role with Rekognition access
aws iam create-role --role-name aws-elasticbeanstalk-ec2-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam attach-role-policy --role-name aws-elasticbeanstalk-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier
aws iam attach-role-policy --role-name aws-elasticbeanstalk-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonRekognitionReadOnlyAccess

aws iam create-instance-profile --instance-profile-name aws-elasticbeanstalk-ec2-role
aws iam add-role-to-instance-profile \
  --instance-profile-name aws-elasticbeanstalk-ec2-role \
  --role-name aws-elasticbeanstalk-ec2-role

# Wait 10s for propagation, then create environment
aws elasticbeanstalk create-environment \
  --application-name cloudlens \
  --environment-name cloudlens-prod2 \
  --solution-stack-name "64bit Amazon Linux 2023 v6.9.0 running Node.js 20" \
  --option-settings \
    "Namespace=aws:autoscaling:launchconfiguration,OptionName=InstanceType,Value=t3.micro" \
    "Namespace=aws:autoscaling:launchconfiguration,OptionName=IamInstanceProfile,Value=aws-elasticbeanstalk-ec2-role" \
    "Namespace=aws:elasticbeanstalk:environment,OptionName=EnvironmentType,Value=SingleInstance" \
    "Namespace=aws:elasticbeanstalk:application:environment,OptionName=PORT,Value=3000" \
    "Namespace=aws:elasticbeanstalk:application:environment,OptionName=NODE_ENV,Value=production" \
  --region us-east-1
```

## Configuration

| Setting | Value | Location |
|---------|-------|----------|
| Event code | `2026AIR` | `server.js` |
| Geofencing | Off (dev) / On (prod) | `server.js` GEOFENCING_ENABLED |
| Venue coordinates | 19.4326, -99.1882 | `server.js` |
| Geo radius | 300m | `server.js` |
| Max upload size | 10MB | `server.js` multer config |
| Rekognition region | us-east-1 | `server.js` |
| Rekognition confidence | 70% min | `server.js` analyzeImage() |
| Auto-refresh interval | 10s | `App.tsx` |
| Image resize | 1200x1200 @ 85% | `App.tsx` resizeImage() |

## Live URL

- HTTPS: https://d35q40kfgjexu1.cloudfront.net (primary, with TLS)
- HTTP: http://cloudlens-prod2.eba-6xpx5kfi.us-east-1.elasticbeanstalk.com (origin)

## Version History

| Version | Description | Date |
|---------|-------------|------|
| v1 | Initial multi-page HTML app | 2026-03-23 |
| v2 | Stable production version | 2026-03-23 |
| v3-redesign | SPA React with CloudLens theme | 2026-03-23 |
| v4-mi-theme | Mission Impossible theme | 2026-03-23 |
| v5-rekognition | Rekognition integration + masonry wall | 2026-03-23 |
